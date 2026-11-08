alter table public.requests
  add column if not exists status_reason varchar(5000);

alter table public.requests
  drop constraint if exists requests_status_reason_check;

alter table public.requests
  add constraint requests_status_reason_check
  check (status_reason is null or char_length(btrim(status_reason)) between 1 and 5000);

drop policy if exists requests_scoped_insert on public.requests;
create policy requests_scoped_insert on public.requests
  for insert to authenticated
  with check (
    public.requests.institution_id = juune_private.current_institution_id()
    and public.requests.requester_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC1')
    and status = 'submitted'
    and assigned_to_user_id is null
    and lack_of_assistance_flags = 0
    and exists (
      select 1
      from public.request_categories rc
      where rc.id = public.requests.category_id
        and rc.institution_id = public.requests.institution_id
        and rc.active
        and rc.sensitivity_default = public.requests.sensitivity
    )
    and exists (
      select 1
      from public.departments d
      where d.id = public.requests.department_id
        and d.institution_id = public.requests.institution_id
        and d.status = 'active'
    )
  );

create or replace function juune_private.enforce_request_status_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status is not distinct from old.status then
    if new.status_reason is distinct from old.status_reason then
      raise exception 'A status reason can only change with a status transition.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC3')
    or not juune_private.is_manager_of(old.department_id)
    or new.assigned_to_user_id is distinct from juune_private.current_user_id() then
    raise exception 'Only the assigned department manager may change request status.'
      using errcode = '42501';
  end if;

  if not (
    (old.status = 'submitted' and new.status = 'acknowledged')
    or (old.status = 'acknowledged' and new.status in (
      'in_progress', 'waiting_for_requester', 'on_hold', 'resolved'
    ))
    or (old.status = 'in_progress' and new.status in (
      'waiting_for_requester', 'on_hold', 'resolved'
    ))
    or (old.status = 'waiting_for_requester' and new.status in (
      'in_progress', 'on_hold', 'resolved'
    ))
    or (old.status = 'on_hold' and new.status in (
      'in_progress', 'waiting_for_requester', 'resolved'
    ))
    or (old.status = 'reopened' and new.status in (
      'in_progress', 'on_hold', 'resolved'
    ))
    or (old.status = 'resolved' and new.status = 'reopened'
      and exists (
        select 1
        from public.request_events e
        where e.institution_id = old.institution_id
          and e.request_id = old.id
          and e.actor_user_id = old.requester_id
          and e.event_type = 'response'
          and e.metadata ->> 'kind' = 'reopen_request'
      ))
  ) then
    raise exception 'This request status transition is not permitted.'
      using errcode = '42501';
  end if;

  if new.status in ('on_hold', 'resolved')
    and nullif(btrim(new.status_reason), '') is null then
    raise exception 'A reason is required for this status transition.'
      using errcode = '23514';
  end if;

  if new.status = 'resolved' then
    new.resolved_at := now();
  elsif new.status = 'reopened' then
    new.resolved_at := null;
    new.closed_at := null;
  end if;

  return new;
end;
$$;

revoke all on function juune_private.enforce_request_status_transition()
  from public, anon, authenticated;

drop trigger if exists requests_enforce_status_transition on public.requests;
create trigger requests_enforce_status_transition
  before update of status on public.requests
  for each row execute function juune_private.enforce_request_status_transition();

create or replace function juune_private.record_request_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  recorded_event public.request_event_type;
begin
  if new.status is distinct from old.status then
    if new.status = 'reopened' then
      recorded_event := 'reopened';
    elsif new.status = 'closed' then
      recorded_event := 'closed';
    else
      recorded_event := 'status_changed';
    end if;
  elsif new.assigned_to_user_id is distinct from old.assigned_to_user_id then
    recorded_event := 'assigned';
  elsif new.lack_of_assistance_flags is distinct from old.lack_of_assistance_flags then
    recorded_event := 'flag';
  else
    return new;
  end if;

  insert into public.request_events (
    institution_id,
    request_id,
    actor_user_id,
    actor_type,
    event_type,
    metadata
  ) values (
    new.institution_id,
    new.id,
    juune_private.current_user_id(),
    'user',
    recorded_event,
    jsonb_build_object(
      'old_status', old.status,
      'new_status', new.status,
      'old_assigned_to_user_id', old.assigned_to_user_id,
      'new_assigned_to_user_id', new.assigned_to_user_id,
      'old_lack_of_assistance_flags', old.lack_of_assistance_flags,
      'new_lack_of_assistance_flags', new.lack_of_assistance_flags,
      'status_reason', new.status_reason
    )
  );
  return new;
end;
$$;

revoke all on function juune_private.record_request_update()
  from public, anon, authenticated;

create or replace function public.get_request_display(required_request_id uuid)
returns table (
  requester_name varchar(120),
  assigned_to_name varchar(120),
  category_name varchar(120),
  department_name varchar(120)
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select requester.name, assignee.name, category.name, department.name
  from public.requests r
  join public.users requester
    on requester.institution_id = r.institution_id
    and requester.id = r.requester_id
  join public.request_categories category
    on category.institution_id = r.institution_id
    and category.id = r.category_id
  join public.departments department
    on department.institution_id = r.institution_id
    and department.id = r.department_id
  left join public.users assignee
    on assignee.institution_id = r.institution_id
    and assignee.id = r.assigned_to_user_id
  where r.id = required_request_id
    and r.institution_id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC2')
    and juune_private.can_access_request(r.id)
$$;

revoke all on function public.get_request_display(uuid)
  from public, anon, authenticated;
grant execute on function public.get_request_display(uuid)
  to authenticated;

grant update (status, status_reason, resolved_at, closed_at)
  on public.requests to authenticated;
