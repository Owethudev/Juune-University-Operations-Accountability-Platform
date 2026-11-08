-- Run only against the isolated synthetic test project; all fixture changes roll back.
begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.save_request_category(
      null,
      'Unauthorized synthetic category',
      null,
      '00000000-0000-4000-8000-000000000101',
      'standard',
      true
    );
    raise exception 'T-US8-2/T-SEC-11b: non-admin configuration writes must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform * from public.list_audit_events();
    raise exception 'T-SEC-12b: unauthorized audit reads must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.request_categories (
      institution_id, name, default_department_id, sensitivity_default, active
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'Unauthorized direct category change',
      '00000000-0000-4000-8000-000000000101',
      'standard',
      true
    );
    raise exception 'T-BR13-1: non-admin direct configuration writes must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.set_governance_user_role(
      '00000000-0000-4000-8000-000000000205',
      'department_manager',
      true
    );
    raise exception 'T-BR13-1: non-admin role changes must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.set_governance_role_permission(
      'employee',
      'SEC1',
      false
    );
    raise exception 'T-BR13-1: non-admin permission changes must fail';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-platform-admin","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  saved_category jsonb;
  saved_id uuid;
  reassignment jsonb;
begin
  saved_category := public.save_request_category(
    null,
    'Synthetic Phase Eight Category',
    'Synthetic category created for rollback-only configuration testing.',
    '00000000-0000-4000-8000-000000000101',
    'standard',
    true
  );
  saved_id := (saved_category ->> 'id')::uuid;

  if not exists (
    select 1
    from public.request_categories rc
    where rc.id = saved_id
      and rc.institution_id = '00000000-0000-4000-8000-000000000001'
      and rc.default_department_id = '00000000-0000-4000-8000-000000000101'
  ) then
    raise exception 'T-US8-1: valid configuration must be persisted';
  end if;

  if not exists (
    select 1
    from public.audit_events ae
    where ae.target_type = 'request_categories'
      and ae.target_id = saved_id::text
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
      and ae.created_at <= now()
  ) then
    raise exception 'T-US8-1/T-BR11-1: configuration write must be audited with actor and time';
  end if;

  perform public.set_governance_user_role(
    '00000000-0000-4000-8000-000000000201',
    'department_manager',
    true
  );
  if not exists (
    select 1
    from public.audit_events ae
    where ae.action = 'authorization.insert'
      and ae.target_type = 'user_roles'
      and ae.target_id = '00000000-0000-4000-8000-000000000201:department_manager'
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
  ) then
    raise exception 'T-SEC-13a/T-BR11-1: authorized role changes must be audited';
  end if;
  if not exists (
    select 1
    from public.department_managers dm
    where dm.institution_id = '00000000-0000-4000-8000-000000000001'
      and dm.department_id = '00000000-0000-4000-8000-000000000101'
      and dm.user_id = '00000000-0000-4000-8000-000000000201'
  ) then
    raise exception 'T-SEC-13a: granting department manager must configure the active assigned unit';
  end if;

  begin
    perform public.set_governance_user_role(
      '00000000-0000-4000-8000-000000000201',
      'platform_admin',
      true
    );
    raise exception 'T-SEC-13b: administrator role grants must remain gated';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.set_governance_user_role(
      '00000000-0000-4000-8000-000000000204',
      'department_manager',
      true
    );
    raise exception 'T-SEC-13b: administrators cannot elevate their own roles';
  exception
    when insufficient_privilege then null;
  end;

  perform public.set_governance_role_permission(
    'employee',
    'SEC2',
    true
  );
  if not exists (
    select 1
    from public.audit_events ae
    where ae.action = 'authorization.insert'
      and ae.target_type = 'role_permissions'
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
  ) then
    raise exception 'T-SEC-13a/T-BR11-1: authorized permission changes must be audited';
  end if;

  begin
    perform public.set_governance_role_permission(
      'employee',
      'SEC12',
      true
    );
    raise exception 'T-SEC-13b: sensitive permission grants must remain gated';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.save_request_category(
      null,
      'Invalid synthetic routing category',
      null,
      '00000000-0000-4000-8000-000000000999',
      'standard',
      true
    );
    raise exception 'T-US8-3/T-BR13-1: invalid routing references must fail';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.departments (institution_id, name, type, status)
    values (
      '00000000-0000-4000-8000-000000000001',
      'Synthetic Unapproved Unit',
      'IT',
      'active'
    );
    raise exception 'T-BR14-1: pilot configuration must reject an unapproved department';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.user_roles
    where institution_id = '00000000-0000-4000-8000-000000000001'
      and user_id = '00000000-0000-4000-8000-000000000204'
      and role_code = 'platform_admin';
    raise exception 'T-US8-3/T-SEC-11b: last administrator removal must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.role_permissions
    where institution_id = '00000000-0000-4000-8000-000000000001'
      and role_code = 'platform_admin'
      and permission_code = 'SEC12';
    raise exception 'T-SEC-13b: sensitive permission mutation must remain gated';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.deactivate_department(
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000102'
    );
    raise exception 'T-EDGE-1: a department cannot be deactivated without a distinct replacement';
  exception
    when invalid_parameter_value then null;
  end;

  reassignment := public.deactivate_department(
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000101'
  );
  if (reassignment ->> 'reassignedRequests')::integer < 1 then
    raise exception 'T-EDGE-1: open requests must be reassigned before deactivation';
  end if;

  if not exists (
    select 1
    from public.requests r
    where r.id = '00000000-0000-4000-8000-000000000402'
      and r.department_id = '00000000-0000-4000-8000-000000000101'
  ) then
    raise exception 'T-EDGE-1: open request department must be reassigned';
  end if;

  if not exists (
    select 1
    from public.audit_events ae
    where ae.action = 'request_event.assigned'
      and ae.target_type = 'requests'
      and ae.target_id = '00000000-0000-4000-8000-000000000402'
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
  ) then
    raise exception 'T-BR11-1: request reassignment must be audited';
  end if;

  if not exists (
    select 1 from public.departments d
    where d.id = '00000000-0000-4000-8000-000000000102'
      and d.status = 'inactive'
  ) then
    raise exception 'T-EDGE-1: department must deactivate after successful reassignment';
  end if;
end
$$;

do $$
declare
  event_row record;
begin
  select * into event_row
  from public.list_audit_events(
    null,
    null,
    '00000000-0000-4000-8000-000000000204',
    'request_categories.insert',
    null,
    1,
    25
  )
  limit 1;
  if event_row.id is null
    or event_row.actor_name <> 'Synthetic Platform Administrator'
    or event_row.target_type <> 'request_categories' then
    raise exception 'T-SEC-12a: authorized audit reviewer receives safe filtered events';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  insert into public.request_events (
    institution_id, request_id, actor_user_id, actor_type,
    event_type, message, metadata
  ) values (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000201',
    'user',
    'response',
    'Synthetic response event for rollback-only audit testing.',
    '{"kind":"response"}'::jsonb
  );
  perform juune_private.flag_request('00000000-0000-4000-8000-000000000401');
  perform juune_private.flag_request('00000000-0000-4000-8000-000000000401');
  perform juune_private.flag_request('00000000-0000-4000-8000-000000000401');

  if not exists (
    select 1
    from public.audit_events ae
    where ae.action = 'request_event.response'
      and ae.target_id = '00000000-0000-4000-8000-000000000401'
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000201'
  ) or not exists (
    select 1
    from public.audit_events ae
    where ae.action = 'request_event.escalation'
      and ae.target_id = '00000000-0000-4000-8000-000000000401'
      and ae.actor_user_id is null
  ) then
    raise exception 'T-BR11-1: response and escalation events must be audited';
  end if;
end
$$;

rollback;
