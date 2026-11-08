-- Phase 2 authorization draft. The Supabase/PostgREST gateway must validate
-- the institutional issuer, audience, signature, and expiry before these
-- policies are enabled in a hosted project.
--
-- Trusted claim contract:
--   sub            = public.users.institutional_id (external identity subject),
--                    scoped to the institution and matched to an active user.
--   institution_id = Juune public.institutions.id (UUID), signed by the
--                    trusted issuer.
-- Roles and permissions are loaded from database tables, never trusted from
-- JWT role claims. Missing, malformed, inactive, or mismatched claims deny access.

create schema if not exists juune_private;
revoke all on schema juune_private from public, anon, authenticated;
grant usage on schema juune_private to authenticated;

create table if not exists public.user_permissions (
  institution_id uuid not null,
  user_id uuid not null,
  permission_code varchar(40) not null
    references public.permission_definitions(code) on delete restrict,
  granted_by_user_id uuid,
  granted_at timestamptz not null default now(),
  primary key (institution_id, user_id, permission_code),
  foreign key (institution_id, user_id)
    references public.users (institution_id, id) on delete restrict,
  foreign key (institution_id, granted_by_user_id)
    references public.users (institution_id, id) on delete restrict
);

create table if not exists public.request_access_grants (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  granted_by_user_id uuid not null,
  reason varchar(500) not null check (char_length(btrim(reason)) between 5 and 500),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (institution_id, request_id, user_id),
  foreign key (institution_id, request_id)
    references public.requests (institution_id, id) on delete restrict,
  foreign key (institution_id, user_id)
    references public.users (institution_id, id) on delete restrict,
  foreign key (institution_id, granted_by_user_id)
    references public.users (institution_id, id) on delete restrict
);

create index if not exists request_access_grants_user_idx
  on public.request_access_grants (institution_id, user_id, request_id)
  where revoked_at is null;

create or replace function juune_private.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case
    when (auth.jwt() ->> 'institution_id') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (auth.jwt() ->> 'institution_id')::uuid
    else null
  end
$$;

create or replace function juune_private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select u.id
  from public.users u
  where u.institution_id = juune_private.current_institution_id()
    and u.institutional_id = (auth.jwt() ->> 'sub')
    and u.status = 'active'
  limit 1
$$;

create or replace function juune_private.is_active_principal()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.users u
    where u.id = juune_private.current_user_id()
      and u.institution_id = juune_private.current_institution_id()
      and u.status = 'active'
  )
$$;

create or replace function juune_private.has_role(required_role varchar)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and exists (
      select 1
      from public.user_roles ur
      where ur.institution_id = juune_private.current_institution_id()
        and ur.user_id = juune_private.current_user_id()
        and ur.role_code = required_role
    )
$$;

create or replace function juune_private.has_permission(required_permission varchar)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and (
      exists (
        select 1
        from public.user_permissions up
        where up.institution_id = juune_private.current_institution_id()
          and up.user_id = juune_private.current_user_id()
          and up.permission_code = required_permission
      )
      or exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp
          on rp.institution_id = ur.institution_id
          and rp.role_code = ur.role_code
        where ur.institution_id = juune_private.current_institution_id()
          and ur.user_id = juune_private.current_user_id()
          and rp.permission_code = required_permission
      )
    )
$$;

create or replace function juune_private.is_manager_of(required_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and exists (
      select 1
      from public.department_managers dm
      where dm.institution_id = juune_private.current_institution_id()
        and dm.department_id = required_department_id
        and dm.user_id = juune_private.current_user_id()
        and exists (
          select 1
          from public.user_roles ur
          where ur.institution_id = dm.institution_id
            and ur.user_id = dm.user_id
            and ur.role_code = 'department_manager'
        )
    )
$$;

create or replace function juune_private.has_role_for_user(
  required_user_id uuid,
  required_role varchar
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.users u
      on u.institution_id = ur.institution_id
      and u.id = ur.user_id
    where ur.institution_id = juune_private.current_institution_id()
      and ur.user_id = required_user_id
      and ur.role_code = required_role
      and u.status = 'active'
  )
$$;

create or replace function juune_private.is_active_tenant_user(required_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.users u
    where u.id = required_user_id
      and u.institution_id = juune_private.current_institution_id()
      and u.status = 'active'
  )
$$;

create or replace function juune_private.is_valid_assignee(
  required_user_id uuid,
  required_department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.users u
    where u.id = required_user_id
      and u.institution_id = juune_private.current_institution_id()
      and u.department_id = required_department_id
      and u.status = 'active'
  )
$$;

create or replace function juune_private.can_access_request(required_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and exists (
      select 1
      from public.requests r
      where r.id = required_request_id
        and r.institution_id = juune_private.current_institution_id()
        and (
          r.requester_id = juune_private.current_user_id()
          or (
            r.sensitivity = 'standard'
            and juune_private.is_manager_of(r.department_id)
          )
          or exists (
            select 1
            from public.request_access_grants rag
            where rag.institution_id = r.institution_id
              and rag.request_id = r.id
              and rag.user_id = juune_private.current_user_id()
              and rag.revoked_at is null
          )
        )
    )
$$;

create or replace function juune_private.can_read_announcement(required_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and juune_private.has_permission('SEC7')
    and exists (
      select 1
      from public.announcements a
      where a.id = required_announcement_id
        and a.institution_id = juune_private.current_institution_id()
        and a.state = 'published'
        and a.published_at <= now()
        and (a.expires_at is null or a.expires_at > now())
        and (
          not exists (
            select 1
            from public.announcement_departments ad
            where ad.institution_id = a.institution_id
              and ad.announcement_id = a.id
          )
          or exists (
            select 1
            from public.announcement_departments ad
            join public.users u
              on u.institution_id = ad.institution_id
              and u.department_id = ad.department_id
            where ad.institution_id = a.institution_id
              and ad.announcement_id = a.id
              and u.id = juune_private.current_user_id()
              and u.status = 'active'
          )
        )
    )
$$;

create or replace function juune_private.owns_announcement(required_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and exists (
      select 1
      from public.announcements a
      where a.id = required_announcement_id
        and a.institution_id = juune_private.current_institution_id()
        and a.publisher_user_id = juune_private.current_user_id()
        and juune_private.has_permission('SEC8')
    )
$$;

create or replace function juune_private.can_read_opportunity(required_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and juune_private.has_permission('SEC9')
    and exists (
      select 1
      from public.opportunities o
      where o.id = required_opportunity_id
        and o.institution_id = juune_private.current_institution_id()
        and o.state = 'published'
        and (o.opens_at is null or o.opens_at <= now())
        and (o.closes_at is null or o.closes_at > now())
        and (
          not exists (
            select 1
            from public.opportunity_departments od
            where od.institution_id = o.institution_id
              and od.opportunity_id = o.id
          )
          or exists (
            select 1
            from public.opportunity_departments od
            join public.users u
              on u.institution_id = od.institution_id
              and u.department_id = od.department_id
            where od.institution_id = o.institution_id
              and od.opportunity_id = o.id
              and u.id = juune_private.current_user_id()
              and u.status = 'active'
          )
        )
    )
$$;

create or replace function juune_private.owns_opportunity(required_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select juune_private.is_active_principal()
    and exists (
      select 1
      from public.opportunities o
      where o.id = required_opportunity_id
        and o.institution_id = juune_private.current_institution_id()
        and o.publisher_user_id = juune_private.current_user_id()
        and juune_private.has_permission('SEC10')
    )
$$;

create or replace function juune_private.request_dashboard_summary()
returns table (
  department_id uuid,
  status public.request_status,
  request_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select r.department_id, r.status, count(*)
  from public.requests r
  where r.institution_id = juune_private.current_institution_id()
    and r.sensitivity = 'standard'
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC6')
    and (
      (
        juune_private.has_role('department_manager')
        and juune_private.is_manager_of(r.department_id)
      )
      or juune_private.has_role('senior_leadership')
    )
  group by r.department_id, r.status
$$;

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

create or replace view public.request_dashboard_summary
with (security_barrier = true)
as
select *
from juune_private.request_dashboard_summary();

revoke all on all functions in schema juune_private from public, anon, authenticated;
grant execute on function juune_private.current_institution_id() to authenticated;
grant execute on function juune_private.current_user_id() to authenticated;
grant execute on function juune_private.is_active_principal() to authenticated;
grant execute on function juune_private.has_role(varchar) to authenticated;
grant execute on function juune_private.has_permission(varchar) to authenticated;
grant execute on function juune_private.is_manager_of(uuid) to authenticated;
grant execute on function juune_private.has_role_for_user(uuid, varchar) to authenticated;
grant execute on function juune_private.is_active_tenant_user(uuid) to authenticated;
grant execute on function juune_private.is_valid_assignee(uuid, uuid) to authenticated;
grant execute on function juune_private.can_access_request(uuid) to authenticated;
grant execute on function juune_private.can_read_announcement(uuid) to authenticated;
grant execute on function juune_private.owns_announcement(uuid) to authenticated;
grant execute on function juune_private.can_read_opportunity(uuid) to authenticated;
grant execute on function juune_private.owns_opportunity(uuid) to authenticated;
revoke all on function juune_private.request_dashboard_summary() from public, anon, authenticated;
grant execute on function juune_private.request_dashboard_summary() to authenticated;
grant execute on function juune_private.flag_request(uuid) to authenticated;

create or replace function juune_private.audit_security_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  changed_row jsonb;
  target_identifier text;
  change_action text;
  row_institution_id uuid;
begin
  changed_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_identifier := coalesce(
    changed_row ->> 'id',
    concat_ws(':', changed_row ->> 'user_id', changed_row ->> 'role_code',
      changed_row ->> 'permission_code', changed_row ->> 'request_id'),
    'unknown'
  );
  row_institution_id := nullif(changed_row ->> 'institution_id', '')::uuid;
  change_action := 'authorization.' || lower(tg_op);

  insert into public.audit_events (
    institution_id, actor_user_id, action, target_type, target_id, outcome
  ) values (
    row_institution_id,
    juune_private.current_user_id(),
    change_action,
    tg_table_name,
    target_identifier,
    'success'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function juune_private.prevent_last_platform_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  remaining_admins integer;
begin
  if old.role_code <> 'platform_admin'
    or (tg_op = 'UPDATE' and new.role_code = 'platform_admin') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  perform 1
  from public.institutions i
  where i.id = old.institution_id
  for update;

  select count(*)
  into remaining_admins
  from public.user_roles ur
  join public.users u
    on u.institution_id = ur.institution_id
    and u.id = ur.user_id
  where ur.institution_id = old.institution_id
    and ur.role_code = 'platform_admin'
    and u.status = 'active'
    and ur.user_id <> old.user_id;

  if remaining_admins = 0 then
    raise exception 'The last active platform administrator cannot be removed.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

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
    recorded_event := 'status_changed';
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
      'new_lack_of_assistance_flags', new.lack_of_assistance_flags
    )
  );
  return new;
end;
$$;

revoke all on function juune_private.audit_security_change() from public, anon, authenticated;
revoke all on function juune_private.prevent_last_platform_admin_removal() from public, anon, authenticated;
revoke all on function juune_private.record_request_update() from public, anon, authenticated;

drop trigger if exists requests_record_security_event on public.requests;
create trigger requests_record_security_event
  after update of status, assigned_to_user_id, lack_of_assistance_flags
  on public.requests
  for each row execute function juune_private.record_request_update();

drop trigger if exists user_roles_prevent_last_admin_delete on public.user_roles;
create trigger user_roles_prevent_last_admin_delete
  before delete on public.user_roles
  for each row execute function juune_private.prevent_last_platform_admin_removal();

drop trigger if exists user_roles_prevent_last_admin_update on public.user_roles;
create trigger user_roles_prevent_last_admin_update
  before update of role_code on public.user_roles
  for each row execute function juune_private.prevent_last_platform_admin_removal();

drop trigger if exists user_roles_audit_changes on public.user_roles;
create trigger user_roles_audit_changes
  after insert or update or delete on public.user_roles
  for each row execute function juune_private.audit_security_change();

drop trigger if exists department_managers_audit_changes on public.department_managers;
create trigger department_managers_audit_changes
  after insert or delete on public.department_managers
  for each row execute function juune_private.audit_security_change();

drop trigger if exists institutions_audit_changes on public.institutions;
create trigger institutions_audit_changes
  after update on public.institutions
  for each row execute function juune_private.audit_security_change();

drop trigger if exists departments_audit_changes on public.departments;
create trigger departments_audit_changes
  after insert or update on public.departments
  for each row execute function juune_private.audit_security_change();

drop trigger if exists request_categories_audit_changes on public.request_categories;
create trigger request_categories_audit_changes
  after insert or update on public.request_categories
  for each row execute function juune_private.audit_security_change();

drop trigger if exists role_permissions_audit_changes on public.role_permissions;
create trigger role_permissions_audit_changes
  after insert or update or delete on public.role_permissions
  for each row execute function juune_private.audit_security_change();

drop trigger if exists user_permissions_audit_changes on public.user_permissions;
create trigger user_permissions_audit_changes
  after insert or update or delete on public.user_permissions
  for each row execute function juune_private.audit_security_change();

drop trigger if exists request_access_grants_audit_changes on public.request_access_grants;
create trigger request_access_grants_audit_changes
  after insert or update or delete on public.request_access_grants
  for each row execute function juune_private.audit_security_change();

drop trigger if exists announcements_audit_insert on public.announcements;
create trigger announcements_audit_insert
  after insert on public.announcements
  for each row execute function juune_private.audit_security_change();

drop trigger if exists announcements_audit_publish on public.announcements;
create trigger announcements_audit_publish
  after update of state on public.announcements
  for each row execute function juune_private.audit_security_change();

drop trigger if exists opportunities_audit_insert on public.opportunities;
create trigger opportunities_audit_insert
  after insert on public.opportunities
  for each row execute function juune_private.audit_security_change();

drop trigger if exists opportunities_audit_publish on public.opportunities;
create trigger opportunities_audit_publish
  after update of state on public.opportunities
  for each row execute function juune_private.audit_security_change();

revoke all on table
  public.institutions,
  public.roles,
  public.departments,
  public.users,
  public.user_roles,
  public.department_managers,
  public.request_categories,
  public.requests,
  public.request_events,
  public.attachments,
  public.notifications,
  public.announcements,
  public.announcement_departments,
  public.opportunities,
  public.opportunity_departments,
  public.audit_events,
  public.escalation_events,
  public.escalation_authorities,
  public.permission_definitions,
  public.role_permissions,
  public.user_permissions,
  public.request_access_grants
from public, anon, authenticated;

alter table public.institutions enable row level security;
alter table public.institutions force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.departments enable row level security;
alter table public.departments force row level security;
alter table public.users enable row level security;
alter table public.users force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.department_managers enable row level security;
alter table public.department_managers force row level security;
alter table public.request_categories enable row level security;
alter table public.request_categories force row level security;
alter table public.requests enable row level security;
alter table public.requests force row level security;
alter table public.request_events enable row level security;
alter table public.request_events force row level security;
alter table public.attachments enable row level security;
alter table public.attachments force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.announcements enable row level security;
alter table public.announcements force row level security;
alter table public.announcement_departments enable row level security;
alter table public.announcement_departments force row level security;
alter table public.opportunities enable row level security;
alter table public.opportunities force row level security;
alter table public.opportunity_departments enable row level security;
alter table public.opportunity_departments force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.escalation_events enable row level security;
alter table public.escalation_events force row level security;
alter table public.escalation_authorities enable row level security;
alter table public.escalation_authorities force row level security;
alter table public.permission_definitions enable row level security;
alter table public.permission_definitions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.user_permissions enable row level security;
alter table public.user_permissions force row level security;
alter table public.request_access_grants enable row level security;
alter table public.request_access_grants force row level security;

drop policy if exists institutions_tenant_select on public.institutions;
create policy institutions_tenant_select on public.institutions
  for select to authenticated
  using (
    id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
  );

drop policy if exists institutions_admin_update on public.institutions;
create policy institutions_admin_update on public.institutions
  for update to authenticated
  using (
    id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  )
  with check (
    id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists roles_active_select on public.roles;
create policy roles_active_select on public.roles
  for select to authenticated
  using (juune_private.is_active_principal());

drop policy if exists departments_tenant_select on public.departments;
create policy departments_tenant_select on public.departments
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
  );

drop policy if exists departments_admin_insert on public.departments;
create policy departments_admin_insert on public.departments
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists departments_admin_update on public.departments;
create policy departments_admin_update on public.departments
  for update to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select to authenticated
  using (
    id = juune_private.current_user_id()
    and institution_id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
  );

drop policy if exists user_roles_self_select on public.user_roles;
create policy user_roles_self_select on public.user_roles
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

drop policy if exists user_roles_admin_select on public.user_roles;
create policy user_roles_admin_select on public.user_roles
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles
  for delete to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

drop policy if exists department_managers_self_select on public.department_managers;
create policy department_managers_self_select on public.department_managers
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists department_managers_admin_insert on public.department_managers;
create policy department_managers_admin_insert on public.department_managers
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role_for_user(user_id, 'department_manager')
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists department_managers_admin_select on public.department_managers;
create policy department_managers_admin_select on public.department_managers
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists department_managers_admin_delete on public.department_managers;
create policy department_managers_admin_delete on public.department_managers
  for delete to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists request_categories_tenant_select on public.request_categories;
create policy request_categories_tenant_select on public.request_categories
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
    and (active or juune_private.has_permission('SEC11'))
  );

drop policy if exists request_categories_admin_insert on public.request_categories;
create policy request_categories_admin_insert on public.request_categories
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists request_categories_admin_update on public.request_categories;
create policy request_categories_admin_update on public.request_categories
  for update to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC11')
  );

drop policy if exists requests_scoped_select on public.requests;
create policy requests_scoped_select on public.requests
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_permission('SEC2')
    and juune_private.can_access_request(id)
  );

drop policy if exists requests_scoped_insert on public.requests;
create policy requests_scoped_insert on public.requests
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and requester_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC1')
    and status = 'submitted'
    and assigned_to_user_id is null
    and lack_of_assistance_flags = 0
    and exists (
      select 1
      from public.request_categories rc
      where rc.id = category_id
        and rc.institution_id = institution_id
        and rc.default_department_id = department_id
        and rc.active
        and rc.sensitivity_default = sensitivity
    )
  );

drop policy if exists requests_manager_update on public.requests;
create policy requests_manager_update on public.requests
  for update to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_permission('SEC3')
    and juune_private.is_manager_of(department_id)
    and juune_private.can_access_request(id)
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_permission('SEC3')
    and juune_private.is_manager_of(department_id)
    and juune_private.can_access_request(id)
    and (
      assigned_to_user_id is null
      or juune_private.is_valid_assignee(assigned_to_user_id, department_id)
    )
  );

drop policy if exists request_events_scoped_select on public.request_events;
create policy request_events_scoped_select on public.request_events
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_permission('SEC4')
    and juune_private.can_access_request(request_id)
  );

drop policy if exists request_events_scoped_insert on public.request_events;
create policy request_events_scoped_insert on public.request_events
  for insert to authenticated
  with check (
    institution_id = juune_private.current_institution_id()
    and actor_user_id = juune_private.current_user_id()
    and actor_type = 'user'
    and juune_private.has_permission('SEC4')
    and juune_private.can_access_request(request_id)
    and event_type in ('response', 'reopened')
  );

drop policy if exists notifications_self_select on public.notifications;
create policy notifications_self_select on public.notifications
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and recipient_user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
  for update to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and recipient_user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and recipient_user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists announcements_published_select on public.announcements;
create policy announcements_published_select on public.announcements
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.can_read_announcement(id)
  );

drop policy if exists announcements_publisher_write on public.announcements;
create policy announcements_publisher_write on public.announcements
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and publisher_user_id = juune_private.current_user_id()
    and juune_private.has_permission('SEC8')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and publisher_user_id = juune_private.current_user_id()
    and juune_private.has_permission('SEC8')
  );

drop policy if exists announcement_departments_published_select on public.announcement_departments;
create policy announcement_departments_published_select on public.announcement_departments
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.can_read_announcement(announcement_id)
  );

drop policy if exists announcement_departments_publisher_write on public.announcement_departments;
create policy announcement_departments_publisher_write on public.announcement_departments
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.owns_announcement(announcement_id)
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.owns_announcement(announcement_id)
  );

drop policy if exists opportunities_published_select on public.opportunities;
create policy opportunities_published_select on public.opportunities
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.can_read_opportunity(id)
  );

drop policy if exists opportunities_publisher_write on public.opportunities;
create policy opportunities_publisher_write on public.opportunities
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and publisher_user_id = juune_private.current_user_id()
    and juune_private.has_permission('SEC10')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and publisher_user_id = juune_private.current_user_id()
    and juune_private.has_permission('SEC10')
  );

drop policy if exists opportunity_departments_published_select on public.opportunity_departments;
create policy opportunity_departments_published_select on public.opportunity_departments
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.can_read_opportunity(opportunity_id)
  );

drop policy if exists opportunity_departments_publisher_write on public.opportunity_departments;
create policy opportunity_departments_publisher_write on public.opportunity_departments
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.owns_opportunity(opportunity_id)
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.owns_opportunity(opportunity_id)
  );

drop policy if exists audit_events_authorized_select on public.audit_events;
create policy audit_events_authorized_select on public.audit_events
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_permission('SEC12')
  );

drop policy if exists escalation_events_scoped_select on public.escalation_events;
create policy escalation_events_scoped_select on public.escalation_events
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.can_access_request(request_id)
  );

drop policy if exists escalation_authorities_self_select on public.escalation_authorities;
create policy escalation_authorities_self_select on public.escalation_authorities
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and authority_user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists permission_definitions_active_select on public.permission_definitions;
create policy permission_definitions_active_select on public.permission_definitions
  for select to authenticated
  using (juune_private.is_active_principal());

drop policy if exists role_permissions_tenant_select on public.role_permissions;
create policy role_permissions_tenant_select on public.role_permissions
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.is_active_principal()
  );

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

drop policy if exists user_permissions_self_select on public.user_permissions;
create policy user_permissions_self_select on public.user_permissions
  for select to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and user_id = juune_private.current_user_id()
    and juune_private.is_active_principal()
  );

drop policy if exists user_permissions_admin_write on public.user_permissions;
create policy user_permissions_admin_write on public.user_permissions
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and granted_by_user_id = juune_private.current_user_id()
    and juune_private.is_active_tenant_user(user_id)
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

drop policy if exists request_access_grants_authorized on public.request_access_grants;
create policy request_access_grants_authorized on public.request_access_grants
  for all to authenticated
  using (
    institution_id = juune_private.current_institution_id()
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  )
  with check (
    institution_id = juune_private.current_institution_id()
    and granted_by_user_id = juune_private.current_user_id()
    and juune_private.is_active_tenant_user(user_id)
    and juune_private.has_role('platform_admin')
    and juune_private.has_permission('SEC13')
  );

grant select on public.institutions, public.roles, public.departments,
  public.user_roles, public.department_managers, public.request_categories,
  public.requests, public.request_events, public.notifications,
  public.announcements, public.announcement_departments,
  public.opportunities, public.opportunity_departments,
  public.audit_events, public.escalation_events,
  public.escalation_authorities, public.permission_definitions,
  public.role_permissions, public.user_permissions,
  public.request_access_grants to authenticated;
grant select (id, institution_id, institutional_id, name, email, department_id, status)
  on public.users to authenticated;

grant update (configuration) on public.institutions to authenticated;
grant insert (institution_id, name, type, status) on public.departments to authenticated;
grant update (name, type, status) on public.departments to authenticated;
grant insert (
  institution_id, name, description, default_department_id, sensitivity_default,
  evidence_policy, active
) on public.request_categories to authenticated;
grant update (
  name, description, default_department_id, sensitivity_default,
  evidence_policy, active
) on public.request_categories to authenticated;
grant insert (
  institution_id, reference, requester_id, category_id, department_id, summary,
  description, sensitivity
) on public.requests to authenticated;
grant update (
  assigned_to_user_id, status, estimate_days, resolved_at, closed_at
) on public.requests to authenticated;
grant insert (
  institution_id, request_id, actor_user_id, actor_type, event_type, message, metadata
) on public.request_events to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert (
  institution_id, title, body, publisher_user_id, state, published_at, expires_at
) on public.announcements to authenticated;
grant update (title, body, state, published_at, expires_at)
  on public.announcements to authenticated;
grant insert (
  institution_id, type, title, description, publisher_user_id, state, opens_at,
  closes_at, application_url, instructions
) on public.opportunities to authenticated;
grant update (
  type, title, description, state, opens_at, closes_at, application_url, instructions
) on public.opportunities to authenticated;
grant insert (institution_id, announcement_id, department_id)
  on public.announcement_departments to authenticated;
grant delete on public.announcement_departments to authenticated;
grant insert (institution_id, opportunity_id, department_id)
  on public.opportunity_departments to authenticated;
grant delete on public.opportunity_departments to authenticated;
grant insert (institution_id, user_id, role_code) on public.user_roles to authenticated;
grant delete on public.user_roles to authenticated;
grant insert (institution_id, role_code, permission_code)
  on public.role_permissions to authenticated;
grant update (permission_code) on public.role_permissions to authenticated;
grant delete on public.role_permissions to authenticated;
grant insert (
  institution_id, user_id, permission_code, granted_by_user_id
) on public.user_permissions to authenticated;
grant update (granted_by_user_id) on public.user_permissions to authenticated;
grant delete on public.user_permissions to authenticated;
grant insert (
  institution_id, request_id, user_id, granted_by_user_id, reason
) on public.request_access_grants to authenticated;
grant update (revoked_at) on public.request_access_grants to authenticated;
grant delete on public.request_access_grants to authenticated;
revoke all on public.request_dashboard_summary from public, anon, authenticated;
grant select on public.request_dashboard_summary to authenticated;
