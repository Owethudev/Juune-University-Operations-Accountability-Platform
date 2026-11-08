create or replace function juune_private.is_pilot_department(
  required_name text,
  required_type public.department_type
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select required_name = required_type::text
    and required_type in ('IT', 'Facilities/Maintenance', 'Administration')
$$;

create or replace function juune_private.enforce_pilot_department()
returns trigger
language plpgsql
set search_path = pg_catalog, public, juune_private
as $$
begin
  if not juune_private.is_pilot_department(new.name, new.type) then
    raise exception 'Department is outside the approved pilot scope.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists departments_enforce_pilot_scope on public.departments;
create trigger departments_enforce_pilot_scope
  before insert or update of name, type on public.departments
  for each row execute function juune_private.enforce_pilot_department();

create or replace function juune_private.enforce_active_category_department()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.departments d
    where d.institution_id = new.institution_id
      and d.id = new.default_department_id
      and d.status = 'active'
      and juune_private.is_pilot_department(d.name, d.type)
  ) then
    raise exception 'Choose an active pilot department for routing.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function juune_private.enforce_active_category_department()
  from public, anon, authenticated;

drop trigger if exists request_categories_enforce_active_department
  on public.request_categories;
create trigger request_categories_enforce_active_department
  before insert or update of institution_id, default_department_id
  on public.request_categories
  for each row execute function juune_private.enforce_active_category_department();

create or replace function juune_private.prevent_unreassigned_department_deactivation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.status = 'active' and new.status = 'inactive' then
    if exists (
      select 1
      from public.requests r
      where r.institution_id = old.institution_id
        and r.department_id = old.id
        and r.status not in ('resolved', 'closed')
    ) then
      raise exception 'Reassign open requests before deactivating this department.'
        using errcode = '23514';
    end if;
    if exists (
      select 1
      from public.request_categories rc
      where rc.institution_id = old.institution_id
        and rc.default_department_id = old.id
    ) then
      raise exception 'Reassign category routing before deactivating this department.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function juune_private.prevent_unreassigned_department_deactivation()
  from public, anon, authenticated;

drop trigger if exists departments_prevent_unreassigned_deactivation
  on public.departments;
create trigger departments_prevent_unreassigned_deactivation
  before update of status on public.departments
  for each row execute function juune_private.prevent_unreassigned_department_deactivation();

create or replace function juune_private.require_designated_admin_approvers()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'DELETE' and new.user_id = juune_private.current_user_id() then
    raise exception 'Administrators cannot grant roles to themselves.'
      using errcode = '42501';
  end if;
  if (tg_op <> 'INSERT' and old.role_code = 'platform_admin')
    or (tg_op <> 'DELETE' and new.role_code = 'platform_admin') then
    raise exception 'Administrator grants and removals require the designated second-approver process.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function juune_private.require_designated_admin_approvers()
  from public, anon, authenticated;

drop trigger if exists user_roles_require_designated_approvers
  on public.user_roles;
create trigger user_roles_require_designated_approvers
  before insert or update of role_code or delete on public.user_roles
  for each row execute function juune_private.require_designated_admin_approvers();

create or replace function juune_private.require_sensitive_permission_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  old_permission text;
  new_permission text;
begin
  if tg_op <> 'INSERT' then old_permission := old.permission_code; end if;
  if tg_op <> 'DELETE' then new_permission := new.permission_code; end if;
  if tg_table_name = 'role_permissions'
    and tg_op <> 'DELETE'
    and exists (
      select 1
      from public.user_roles ur
      where ur.institution_id = new.institution_id
        and ur.user_id = juune_private.current_user_id()
        and ur.role_code = new.role_code
    ) then
    raise exception 'Administrators cannot grant permissions to their own roles.'
      using errcode = '42501';
  end if;
  if tg_table_name = 'user_permissions'
    and tg_op <> 'DELETE'
    and new.user_id = juune_private.current_user_id() then
    raise exception 'Administrators cannot grant permissions to themselves.'
      using errcode = '42501';
  end if;
  if old_permission in ('SEC11', 'SEC12', 'SEC13')
    or new_permission in ('SEC11', 'SEC12', 'SEC13') then
    raise exception 'Sensitive permission changes require the designated second-approver process.'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function juune_private.require_sensitive_permission_approval()
  from public, anon, authenticated;

drop trigger if exists role_permissions_require_designated_approvers
  on public.role_permissions;
create trigger role_permissions_require_designated_approvers
  before insert or update of permission_code or delete on public.role_permissions
  for each row execute function juune_private.require_sensitive_permission_approval();

drop trigger if exists user_permissions_require_designated_approvers
  on public.user_permissions;
create trigger user_permissions_require_designated_approvers
  before insert or update of permission_code or delete on public.user_permissions
  for each row execute function juune_private.require_sensitive_permission_approval();

create or replace function juune_private.record_governance_request_update()
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
  elsif new.department_id is distinct from old.department_id
    or new.assigned_to_user_id is distinct from old.assigned_to_user_id then
    recorded_event := 'assigned';
  elsif new.lack_of_assistance_flags is distinct from old.lack_of_assistance_flags then
    recorded_event := 'flag';
  else
    return new;
  end if;

  insert into public.request_events (
    institution_id, request_id, actor_user_id, actor_type,
    event_type, metadata
  ) values (
    new.institution_id,
    new.id,
    juune_private.current_user_id(),
    'user',
    recorded_event,
    jsonb_build_object(
      'old_status', old.status,
      'new_status', new.status,
      'old_department_id', old.department_id,
      'new_department_id', new.department_id,
      'old_assigned_to_user_id', old.assigned_to_user_id,
      'new_assigned_to_user_id', new.assigned_to_user_id,
      'old_lack_of_assistance_flags', old.lack_of_assistance_flags,
      'new_lack_of_assistance_flags', new.lack_of_assistance_flags
    )
  );
  return new;
end;
$$;

revoke all on function juune_private.record_governance_request_update()
  from public, anon, authenticated;

drop trigger if exists requests_record_security_event on public.requests;
create trigger requests_record_security_event
  after update of status, department_id, assigned_to_user_id,
    lack_of_assistance_flags
  on public.requests
  for each row execute function juune_private.record_governance_request_update();

create or replace function juune_private.audit_request_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.audit_events (
    institution_id, actor_user_id, action, target_type, target_id, outcome
  ) values (
    new.institution_id,
    new.actor_user_id,
    'request_event.' || new.event_type::text,
    'requests',
    new.request_id::text,
    'success'
  );
  return new;
end;
$$;

revoke all on function juune_private.audit_request_event()
  from public, anon, authenticated;

drop trigger if exists request_events_audit_insert on public.request_events;
create trigger request_events_audit_insert
  after insert on public.request_events
  for each row execute function juune_private.audit_request_event();

create or replace function public.get_admin_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  result jsonb;
begin
  if not juune_private.has_role('platform_admin')
    or not juune_private.has_permission('SEC11') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'departments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'type', d.type,
        'status', d.status
      ) order by d.name)
      from public.departments d
      where d.institution_id = juune_private.current_institution_id()
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rc.id,
        'name', rc.name,
        'description', rc.description,
        'defaultDepartmentId', rc.default_department_id,
        'sensitivityDefault', rc.sensitivity_default,
        'active', rc.active
      ) order by rc.name)
      from public.request_categories rc
      where rc.institution_id = juune_private.current_institution_id()
    ), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', r.code,
        'displayName', r.display_name
      ) order by r.code)
      from public.roles r
    ), '[]'::jsonb),
    'rolePermissions', case
      when juune_private.has_permission('SEC13') then coalesce((
        select jsonb_agg(jsonb_build_object(
          'roleCode', rp.role_code,
          'permissionCode', rp.permission_code,
          'description', pd.description
        ) order by rp.role_code, rp.permission_code)
        from public.role_permissions rp
        join public.permission_definitions pd
          on pd.code = rp.permission_code
        where rp.institution_id = juune_private.current_institution_id()
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'permissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', pd.code,
        'description', pd.description
      ) order by pd.code)
      from public.permission_definitions pd
    ), '[]'::jsonb),
    'users', case
      when juune_private.has_permission('SEC13') then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'department', d.name,
          'status', u.status,
          'roleCodes', coalesce((
            select jsonb_agg(ur.role_code order by ur.role_code)
            from public.user_roles ur
            where ur.institution_id = u.institution_id
              and ur.user_id = u.id
          ), '[]'::jsonb)
        ) order by u.name)
        from public.users u
        left join public.departments d
          on d.institution_id = u.institution_id
          and d.id = u.department_id
        where u.institution_id = juune_private.current_institution_id()
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'escalation', jsonb_build_object(
      'trigger', 'third_flag',
      'recipientConfigurationEnabled', false
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.save_request_category(
  required_category_id uuid,
  required_name text,
  required_description text,
  required_default_department_id uuid,
  required_sensitivity_default public.request_sensitivity,
  required_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  saved_category public.request_categories;
begin
  if not juune_private.has_role('platform_admin')
    or not juune_private.has_permission('SEC11') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if required_name is null or char_length(btrim(required_name)) not between 1 and 120
    or (required_description is not null and char_length(required_description) > 1000)
    or required_default_department_id is null
    or required_sensitivity_default is null
    or required_active is null then
    raise exception 'Check the category details.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.departments d
    where d.institution_id = juune_private.current_institution_id()
      and d.id = required_default_department_id
      and d.status = 'active'
      and juune_private.is_pilot_department(d.name, d.type)
  ) then
    raise exception 'Choose an active pilot department for routing.'
      using errcode = '23514';
  end if;
  if required_category_id is null then
    insert into public.request_categories (
      institution_id, name, description, default_department_id,
      sensitivity_default, active
    ) values (
      juune_private.current_institution_id(), btrim(required_name),
      nullif(btrim(required_description), ''), required_default_department_id,
      required_sensitivity_default, required_active
    )
    returning * into saved_category;
  else
    update public.request_categories rc
    set name = btrim(required_name),
        description = nullif(btrim(required_description), ''),
        default_department_id = required_default_department_id,
        sensitivity_default = required_sensitivity_default,
        active = required_active
    where rc.institution_id = juune_private.current_institution_id()
      and rc.id = required_category_id
    returning * into saved_category;
    if not found then
      raise exception 'Category not found.' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object(
    'id', saved_category.id,
    'name', saved_category.name,
    'description', saved_category.description,
    'defaultDepartmentId', saved_category.default_department_id,
    'sensitivityDefault', saved_category.sensitivity_default,
    'active', saved_category.active
  );
end;
$$;

create or replace function public.set_governance_user_role(
  required_user_id uuid,
  required_role_code text,
  required_granted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_user public.users;
  manager_department_id uuid;
begin
  if not juune_private.has_role('platform_admin')
    or not juune_private.has_permission('SEC13') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if required_user_id is null or required_role_code is null
    or required_granted is null or required_role_code = 'platform_admin'
    or required_user_id = juune_private.current_user_id() then
    raise exception 'Administrator access requires the designated second-approver process.'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.roles r where r.code = required_role_code) then
    raise exception 'Choose a valid role.' using errcode = '22023';
  end if;
  select u.* into target_user
  from public.users u
  where u.institution_id = juune_private.current_institution_id()
    and u.id = required_user_id
    and u.status = 'active';
  if not found then
    raise exception 'Choose an active user in this institution.'
      using errcode = '23514';
  end if;
  if required_granted then
    if required_role_code = 'department_manager' then
      manager_department_id := target_user.department_id;
      if manager_department_id is null or not exists (
        select 1
        from public.departments d
        where d.institution_id = juune_private.current_institution_id()
          and d.id = manager_department_id
          and d.status = 'active'
      ) then
        raise exception 'Assign the manager to an active pilot department first.'
          using errcode = '23514';
      end if;
      insert into public.department_managers (
        institution_id, department_id, user_id
      ) values (
        juune_private.current_institution_id(),
        manager_department_id,
        required_user_id
      )
      on conflict do nothing;
    end if;
    insert into public.user_roles (institution_id, user_id, role_code)
    values (
      juune_private.current_institution_id(),
      required_user_id,
      required_role_code
    )
    on conflict do nothing;
  else
    if exists (
      select 1
      from public.user_roles ur
      where ur.institution_id = juune_private.current_institution_id()
        and ur.user_id = required_user_id
        and ur.role_code = required_role_code
    ) and (
      select count(*)
      from public.user_roles ur
      where ur.institution_id = juune_private.current_institution_id()
        and ur.user_id = required_user_id
    ) <= 1 then
      raise exception 'An active user must retain at least one role.'
        using errcode = '23514';
    end if;
    delete from public.user_roles ur
    where ur.institution_id = juune_private.current_institution_id()
      and ur.user_id = required_user_id
      and ur.role_code = required_role_code;
    if required_role_code = 'department_manager' then
      delete from public.department_managers dm
      where dm.institution_id = juune_private.current_institution_id()
        and dm.user_id = required_user_id;
    end if;
  end if;
  return jsonb_build_object(
    'userId', required_user_id,
    'roleCode', required_role_code,
    'granted', required_granted
  );
end;
$$;

create or replace function public.set_governance_role_permission(
  required_role_code text,
  required_permission_code text,
  required_granted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not juune_private.has_role('platform_admin')
    or not juune_private.has_permission('SEC13') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if required_role_code is null or required_permission_code is null
    or required_granted is null
    or required_permission_code in ('SEC11', 'SEC12', 'SEC13') then
    raise exception 'Sensitive permission changes require the designated second-approver process.'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.roles r where r.code = required_role_code)
    or not exists (
      select 1 from public.permission_definitions pd
      where pd.code = required_permission_code
    ) then
    raise exception 'Choose a valid role and permission.'
      using errcode = '22023';
  end if;
  if required_granted then
    insert into public.role_permissions (
      institution_id, role_code, permission_code
    ) values (
      juune_private.current_institution_id(),
      required_role_code,
      required_permission_code
    )
    on conflict do nothing;
  else
    delete from public.role_permissions rp
    where rp.institution_id = juune_private.current_institution_id()
      and rp.role_code = required_role_code
      and rp.permission_code = required_permission_code;
  end if;
  return jsonb_build_object(
    'roleCode', required_role_code,
    'permissionCode', required_permission_code,
    'granted', required_granted
  );
end;
$$;

create or replace function public.deactivate_department(
  required_department_id uuid,
  replacement_department_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  affected_requests integer := 0;
  affected_users integer := 0;
  reassigned_user_ids uuid[] := array[]::uuid[];
begin
  if not juune_private.has_role('platform_admin')
    or not juune_private.has_permission('SEC11') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if required_department_id is null or replacement_department_id is null
    or required_department_id = replacement_department_id then
    raise exception 'Choose a different active department for reassignment.'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.departments d
    where d.institution_id = juune_private.current_institution_id()
      and d.id = required_department_id
      and d.status = 'active'
  ) or not exists (
    select 1 from public.departments d
    where d.institution_id = juune_private.current_institution_id()
      and d.id = replacement_department_id
      and d.status = 'active'
      and juune_private.is_pilot_department(d.name, d.type)
  ) then
    raise exception 'Choose an active pilot department for reassignment.'
      using errcode = '23514';
  end if;

  update public.requests r
  set department_id = replacement_department_id
  where r.institution_id = juune_private.current_institution_id()
    and r.department_id = required_department_id
    and r.status not in ('resolved', 'closed');
  get diagnostics affected_requests = row_count;

  update public.request_categories rc
  set default_department_id = replacement_department_id
  where rc.institution_id = juune_private.current_institution_id()
    and rc.default_department_id = required_department_id;

  with changed_users as (
    update public.users u
    set department_id = replacement_department_id
    where u.institution_id = juune_private.current_institution_id()
      and u.department_id = required_department_id
    returning u.id
  ),
  user_audit as (
    insert into public.audit_events (
      institution_id, actor_user_id, action, target_type, target_id, outcome
    )
    select
      juune_private.current_institution_id(),
      juune_private.current_user_id(),
      'users.department_reassigned',
      'users',
      changed_users.id::text,
      'success'
    from changed_users
    returning target_id
  )
  select coalesce(array_agg(user_audit.target_id::uuid), array[]::uuid[])
  into reassigned_user_ids
  from user_audit;
  affected_users := cardinality(reassigned_user_ids);

  insert into public.department_managers (
    institution_id, department_id, user_id
  )
  select dm.institution_id, replacement_department_id, dm.user_id
  from public.department_managers dm
  where dm.institution_id = juune_private.current_institution_id()
    and dm.department_id = required_department_id
  on conflict do nothing;

  delete from public.department_managers dm
  where dm.institution_id = juune_private.current_institution_id()
    and dm.department_id = required_department_id;

  update public.departments d
  set status = 'inactive'
  where d.institution_id = juune_private.current_institution_id()
    and d.id = required_department_id;

  return jsonb_build_object(
    'reassignedRequests', affected_requests,
    'reassignedUsers', affected_users
  );
end;
$$;

create or replace function public.list_audit_events(
  required_from_date date default null,
  required_to_date date default null,
  required_actor_user_id uuid default null,
  required_action text default null,
  required_target_id text default null,
  required_page integer default 1,
  required_page_size integer default 25
)
returns table (
  id uuid,
  actor_id uuid,
  actor_name text,
  action text,
  target_type text,
  target_id text,
  created_at timestamptz,
  outcome public.audit_outcome
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not juune_private.has_permission('SEC12') then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if required_page < 1 or required_page > 10000
    or required_page_size < 1 or required_page_size > 50
    or (required_from_date is not null and required_to_date is not null
      and required_from_date > required_to_date) then
    raise exception 'Check the audit filters.' using errcode = '22023';
  end if;

  return query
  select
    ae.id,
    ae.actor_user_id,
    coalesce(u.name, 'System')::text,
    ae.action::text,
    ae.target_type::text,
    ae.target_id::text,
    ae.created_at,
    ae.outcome
  from public.audit_events ae
  left join public.users u
    on u.institution_id = ae.institution_id
    and u.id = ae.actor_user_id
  where ae.institution_id = juune_private.current_institution_id()
    and (required_from_date is null or ae.created_at >= required_from_date::timestamptz)
    and (required_to_date is null or ae.created_at < (required_to_date + 1)::timestamptz)
    and (required_actor_user_id is null or ae.actor_user_id = required_actor_user_id)
    and (required_action is null or ae.action = required_action)
    and (required_target_id is null or ae.target_id = required_target_id)
  order by ae.created_at desc, ae.id
  limit required_page_size
  offset (required_page - 1) * required_page_size;

  insert into public.audit_events (
    institution_id, actor_user_id, action, target_type, target_id, outcome
  ) values (
    juune_private.current_institution_id(),
    juune_private.current_user_id(),
    'audit_events.read',
    'audit_events',
    'filtered',
    'success'
  );
end;
$$;

revoke all on function public.get_admin_configuration() from public, anon;
revoke all on function public.save_request_category(
  uuid, text, text, uuid, public.request_sensitivity, boolean
) from public, anon;
revoke all on function public.set_governance_user_role(uuid, text, boolean)
  from public, anon;
revoke all on function public.set_governance_role_permission(text, text, boolean)
  from public, anon;
revoke all on function public.deactivate_department(uuid, uuid) from public, anon;
revoke all on function public.list_audit_events(
  date, date, uuid, text, text, integer, integer
) from public, anon;

grant execute on function public.get_admin_configuration() to authenticated;
grant execute on function public.save_request_category(
  uuid, text, text, uuid, public.request_sensitivity, boolean
) to authenticated;
grant execute on function public.set_governance_user_role(uuid, text, boolean)
  to authenticated;
grant execute on function public.set_governance_role_permission(text, text, boolean)
  to authenticated;
grant execute on function public.deactivate_department(uuid, uuid)
  to authenticated;
grant execute on function public.list_audit_events(
  date, date, uuid, text, text, integer, integer
) to authenticated;
