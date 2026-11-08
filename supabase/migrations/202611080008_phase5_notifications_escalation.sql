create or replace function juune_private.record_third_flag_escalation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted_escalation_id uuid;
begin
  if old.lack_of_assistance_flags < 3
    and new.lack_of_assistance_flags >= 3 then
    insert into public.escalation_events (
      institution_id,
      request_id,
      trigger,
      flag_count_at_trigger
    ) values (
      new.institution_id,
      new.id,
      'third_flag',
      3
    )
    on conflict (institution_id, request_id, trigger) do nothing
    returning id into inserted_escalation_id;

    if inserted_escalation_id is not null then
      insert into public.request_events (
        institution_id,
        request_id,
        actor_user_id,
        actor_type,
        event_type,
        message,
        metadata
      ) values (
        new.institution_id,
        new.id,
        null,
        'system',
        'escalation',
        'This request reached the review threshold and is flagged for review.',
        jsonb_build_object(
          'escalation_event_id', inserted_escalation_id,
          'flag_count_at_trigger', 3
        )
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function juune_private.record_third_flag_escalation()
  from public, anon, authenticated;

drop trigger if exists requests_z_escalate_after_third_flag on public.requests;
create trigger requests_z_escalate_after_third_flag
  after update of lack_of_assistance_flags on public.requests
  for each row
  when (
    old.lack_of_assistance_flags < 3
    and new.lack_of_assistance_flags >= 3
  )
  execute function juune_private.record_third_flag_escalation();

create or replace function juune_private.enqueue_request_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  recipient_id uuid;
begin
  if new.event_type in ('flag', 'escalation') then
    return new;
  end if;

  if new.event_type = 'created' then
    for recipient_id in
      select distinct dm.user_id
      from public.requests r
      join public.users requester
        on requester.institution_id = r.institution_id
        and requester.id = r.requester_id
      join public.department_managers dm
        on dm.institution_id = r.institution_id
        and dm.department_id in (r.department_id, requester.department_id)
      join public.users recipient
        on recipient.institution_id = dm.institution_id
        and recipient.id = dm.user_id
        and recipient.status = 'active'
      where r.institution_id = new.institution_id
        and r.id = new.request_id
        and dm.user_id is distinct from new.actor_user_id
    loop
      insert into public.notifications (
        institution_id,
        recipient_user_id,
        event_type,
        related_entity_type,
        related_entity_id,
        channel,
        dedupe_key
      ) values (
        new.institution_id,
        recipient_id,
        'request_created',
        'request',
        new.request_id,
        'in_app',
        concat('request:', new.request_id, ':event:', new.id)
      )
      on conflict (institution_id, recipient_user_id, channel, dedupe_key)
        where dedupe_key is not null
        do nothing;
    end loop;
  elsif new.event_type in ('status_changed', 'assigned', 'response', 'reopened') then
    for recipient_id in
      select distinct recipients.user_id
      from public.requests r
      cross join lateral (
        values (r.requester_id), (r.assigned_to_user_id)
      ) as recipients(user_id)
      join public.users recipient
        on recipient.institution_id = r.institution_id
        and recipient.id = recipients.user_id
        and recipient.status = 'active'
      where r.institution_id = new.institution_id
        and r.id = new.request_id
        and recipients.user_id is not null
        and recipients.user_id is distinct from new.actor_user_id
    loop
      insert into public.notifications (
        institution_id,
        recipient_user_id,
        event_type,
        related_entity_type,
        related_entity_id,
        channel,
        dedupe_key
      ) values (
        new.institution_id,
        recipient_id,
        concat('request_', new.event_type::text),
        'request',
        new.request_id,
        'in_app',
        concat('request:', new.request_id, ':event:', new.id)
      )
      on conflict (institution_id, recipient_user_id, channel, dedupe_key)
        where dedupe_key is not null
        do nothing;
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function juune_private.enqueue_request_notification()
  from public, anon, authenticated;

drop trigger if exists request_events_enqueue_in_app_notification
  on public.request_events;
create trigger request_events_enqueue_in_app_notification
  after insert on public.request_events
  for each row execute function juune_private.enqueue_request_notification();

create or replace function juune_private.flag_request(required_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated_flag_count integer;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC4') then
    raise exception 'Request flag not permitted.' using errcode = '42501';
  end if;

  update public.requests r
  set lack_of_assistance_flags = r.lack_of_assistance_flags + 1
  where r.id = required_request_id
    and r.institution_id = juune_private.current_institution_id()
    and r.requester_id = juune_private.current_user_id()
  returning r.lack_of_assistance_flags into updated_flag_count;

  if updated_flag_count is null then
    raise exception 'Request flag not permitted.' using errcode = '42501';
  end if;
  return updated_flag_count;
end;
$$;

revoke all on function juune_private.flag_request(uuid)
  from public, anon, authenticated;
grant execute on function juune_private.flag_request(uuid) to authenticated;
