-- Run only against an isolated Supabase test project after Phase 2 migrations
-- and seed.sql. This transaction rolls back every fixture mutation.
begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  affected_rows integer;
begin
  if juune_private.current_institution_id()
      <> '00000000-0000-4000-8000-000000000001'::uuid
    or (select count(*) from public.institutions) <> 1 then
    raise exception 'T-SEC-15a: valid institution claim must allow access within its tenant';
  end if;
  if (select count(*) from public.requests) <> 1 then
    raise exception 'T-SEC-2a/b: employee must see only their own request';
  end if;
  if (select count(*) from public.users) <> 1 then
    raise exception 'T-SEC-14a/b: employee must see only their own profile';
  end if;
  if (select count(*) from public.announcements) <> 1 then
    raise exception 'T-SEC-7a/b: employee must see only published announcements in their audience';
  end if;
  if (select count(*) from public.opportunities) <> 1 then
    raise exception 'T-SEC-9a/b: employee must see only current opportunities in their audience';
  end if;
  if (select count(*) from public.audit_events) <> 0 then
    raise exception 'T-SEC-12b: employee must not read audit events';
  end if;

  insert into public.requests (
    institution_id, reference, requester_id, category_id, department_id,
    summary, description
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'JU-RLS-EMPLOYEE',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    'Synthetic RLS request',
    'Request created by the synthetic employee in the isolated RLS test.'
  );

  insert into public.request_events (
    institution_id, request_id, actor_user_id, actor_type, event_type, message
  ) values (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000201',
    'user',
    'response',
    'Synthetic response from the requester.'
  );

  if juune_private.flag_request('00000000-0000-4000-8000-000000000401') <> 1 then
    raise exception 'T-SEC-4a: requester flag was not recorded';
  end if;

  begin
    update public.requests
    set lack_of_assistance_flags = 3
    where id = '00000000-0000-4000-8000-000000000401';
    raise exception 'T-SEC-4b: direct flag counter update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  update public.requests
  set status = 'closed'
  where id = '00000000-0000-4000-8000-000000000401';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'T-SEC-3b: requester must not update a managed request';
  end if;

  begin
    insert into public.user_roles (institution_id, user_id, role_code)
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000201',
      'platform_admin'
    );
    raise exception 'T-SEC-13b: employee unexpectedly granted themselves a role';
  exception
    when insufficient_privilege then null;
  end;

  if (select count(*) from public.request_dashboard_summary) <> 0 then
    raise exception 'T-SEC-6b: employee must not read dashboard summaries';
  end if;

  if (select count(*) from public.announcements where state = 'draft') <> 0 then
    raise exception 'T-SEC-7b: draft announcement must remain hidden';
  end if;

  if (select count(*) from public.opportunities where state = 'draft') <> 0 then
    raise exception 'T-SEC-9b: draft opportunity must remain hidden';
  end if;
  if (select count(*) from public.request_events) <> 3 then
    raise exception 'T-SEC-4a: requester must see their request timeline';
  end if;

  begin
    insert into public.announcements (
      institution_id, title, body, publisher_user_id
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'Unauthorized synthetic announcement',
      'This employee does not have a publisher grant.',
      '00000000-0000-4000-8000-000000000201'
    );
    raise exception 'T-SEC-8b: non-publisher unexpectedly created an announcement';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.users
    set department_id = '00000000-0000-4000-8000-000000000102'
    where id = '00000000-0000-4000-8000-000000000201';
    raise exception 'T-SEC-14b: profile write unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.opportunities (
      institution_id, title, type, description, publisher_user_id
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'Unauthorized synthetic opportunity',
      'training',
      'This employee does not have a publisher grant.',
      '00000000-0000-4000-8000-000000000201'
    );
    raise exception 'T-SEC-10b: non-publisher unexpectedly created an opportunity';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform count(*) from public.attachments;
    raise exception 'T-SEC-5b: evidence table unexpectedly accessible';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-facilities-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.requests) <> 1
    or not exists (
      select 1 from public.requests
      where id = '00000000-0000-4000-8000-000000000402'
    ) then
    raise exception 'T-TENANT-1: Facilities employee must see only their own request';
  end if;
  if (select count(*) from public.announcements) <> 0 then
    raise exception 'T-SEC-7b: out-of-audience announcement must be hidden';
  end if;
  if (select count(*) from public.opportunities) <> 0 then
    raise exception 'T-SEC-9b: out-of-audience opportunity must be hidden';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-it-manager","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  affected_rows integer;
begin
  if (select count(*) from public.requests) <> 2
    or not exists (
      select 1 from public.requests
      where id = '00000000-0000-4000-8000-000000000401'
    ) then
    raise exception 'T-SEC-2a/b: manager must see only standard requests in their assigned department';
  end if;
  if exists (
    select 1 from public.requests
    where id in (
      '00000000-0000-4000-8000-000000000402',
      '00000000-0000-4000-8000-000000000403'
    )
  ) then
    raise exception 'T-SEC-2b: manager must not see out-of-department or restricted requests';
  end if;

  update public.requests
  set status = 'acknowledged'
  where id = '00000000-0000-4000-8000-000000000401';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'T-SEC-3a: assigned department manager must update a standard request';
  end if;

  update public.requests
  set status = 'closed'
  where id = '00000000-0000-4000-8000-000000000402';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'T-SEC-3b: manager must not update a request in another department';
  end if;

  update public.requests
  set status = 'closed'
  where id = '00000000-0000-4000-8000-000000000403';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'T-SEC-3b: manager must not update a restricted, unauthorized request';
  end if;

  if (select count(*) from public.request_events) <> 4 then
    raise exception 'T-SEC-4a/b: manager must see only history for an accessible request';
  end if;
  if (
    select count(distinct department_id)
    from public.request_dashboard_summary
  ) <> 1
    or (
      select sum(request_count)
      from public.request_dashboard_summary
    ) <> 2 then
    raise exception 'T-SEC-6a: manager summary must cover only standard requests in managed departments';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-senior-leader","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.requests) <> 2
    or not exists (
      select 1 from public.requests
      where id = '00000000-0000-4000-8000-000000000402'
    )
    or not exists (
      select 1 from public.requests
      where id = '00000000-0000-4000-8000-000000000403'
    ) then
    raise exception 'T-SEC-2a/b: leadership must see owned and explicitly granted requests only';
  end if;
  if exists (
    select 1 from public.requests
    where id = '00000000-0000-4000-8000-000000000401'
  ) then
    raise exception 'T-SEC-2b: leadership must not see unrelated requests';
  end if;
  if (
    select count(distinct department_id)
    from public.request_dashboard_summary
  ) <> 2
    or (
      select sum(request_count)
      from public.request_dashboard_summary
    ) <> 3 then
    raise exception 'T-SEC-6a/b: leadership summary must be institution-wide and exclude restricted details';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-platform-admin","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  affected_rows integer;
begin
  if (select count(*) from public.requests) <> 0 then
    raise exception 'T-SEC-2b: platform administrator must not inherit request access';
  end if;
  if (select count(*) from public.audit_events) = 0 then
    raise exception 'T-SEC-12a: authorized audit reviewer must read audit events';
  end if;
  if (select count(*) from public.request_dashboard_summary) <> 0 then
    raise exception 'T-SEC-6b: administrator must not inherit dashboard scope';
  end if;

  update public.institutions
  set configuration = '{"rls_test":true}'::jsonb
  where id = '00000000-0000-4000-8000-000000000001';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'T-SEC-11a: platform administrator must manage institution configuration';
  end if;
  if not exists (
    select 1 from public.audit_events
    where institution_id = '00000000-0000-4000-8000-000000000001'
      and target_type = 'institutions'
      and action = 'authorization.update'
  ) then
    raise exception 'T-SEC-11a: institution configuration change must be audited for its tenant';
  end if;

  begin
    update public.institutions
    set configuration = '[]'::jsonb
    where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'T-SEC-11b: invalid institution configuration unexpectedly succeeded';
  exception
    when check_violation then null;
  end;

  insert into public.role_permissions (institution_id, role_code, permission_code)
  values (
    '00000000-0000-4000-8000-000000000001',
    'employee',
    'SEC6'
  );
  if not exists (
    select 1 from public.audit_events
    where target_type = 'role_permissions'
      and action = 'authorization.insert'
  ) then
    raise exception 'T-SEC-13a: permission change must create an audit event';
  end if;

  insert into public.announcements (
    institution_id, title, body, publisher_user_id
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'Synthetic publisher authorization test',
    'Explicit publisher grant permits this content creation.',
    '00000000-0000-4000-8000-000000000204'
  );

  insert into public.opportunities (
    institution_id, title, type, description, publisher_user_id
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'Synthetic publisher opportunity test',
    'training',
    'Explicit publisher grant permits this opportunity creation.',
    '00000000-0000-4000-8000-000000000204'
  );

  if not exists (
    select 1 from public.announcements
    where title = 'Synthetic publisher authorization test'
  ) or not exists (
    select 1 from public.opportunities
    where title = 'Synthetic publisher opportunity test'
  ) then
    raise exception 'T-SEC-8a/10a: explicitly granted publisher must create content';
  end if;

  begin
    delete from public.user_roles
    where institution_id = '00000000-0000-4000-8000-000000000001'
      and user_id = '00000000-0000-4000-8000-000000000204'
      and role_code = 'platform_admin';
    raise exception 'T-SEC-11b: last platform administrator removal unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.requests) <> 0
    or (select count(*) from public.users) <> 0
    or (select count(*) from public.departments) <> 0 then
    raise exception 'T-SEC-15b: mismatched institution claim must expose no rows';
  end if;
end
$$;

rollback;
