-- Run only against the isolated synthetic test project after Phase 4 migration.
-- This transaction rolls back every fixture mutation.
begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  alternate_request_id uuid;
  managed_request_id uuid;
begin
  insert into public.requests (
    institution_id,
    reference,
    requester_id,
    category_id,
    department_id,
    summary,
    description,
    sensitivity,
    idempotency_key
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'JU-P4ROUTE01',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000102',
    'Synthetic alternate routing',
    'This synthetic request verifies an employee may correct the recommendation.',
    'standard',
    '00000000-0000-4000-8000-000000000907'
  );

  select id
  into alternate_request_id
  from public.requests
  where institution_id = '00000000-0000-4000-8000-000000000001'
    and requester_id = '00000000-0000-4000-8000-000000000201'
    and idempotency_key = '00000000-0000-4000-8000-000000000907';

  if not exists (
    select 1
    from public.requests
    where id = alternate_request_id
      and department_id = '00000000-0000-4000-8000-000000000102'
  ) then
    raise exception 'T-US3-2: active alternate department was not saved';
  end if;

  if not exists (
    select 1
    from public.request_events
    where request_id = alternate_request_id
      and event_type = 'created'
  ) then
    raise exception 'T-US2-1: the created event must be visible to the requester';
  end if;

  insert into public.request_events (
    institution_id,
    request_id,
    actor_user_id,
    actor_type,
    event_type,
    message,
    metadata
  ) values (
    '00000000-0000-4000-8000-000000000001',
    alternate_request_id,
    '00000000-0000-4000-8000-000000000201',
    'user',
    'response',
    'Synthetic response visible to request participants.',
    '{}'::jsonb
  );

  if not exists (
    select 1
    from public.request_events
    where request_id = alternate_request_id
      and event_type = 'response'
      and actor_user_id = '00000000-0000-4000-8000-000000000201'
      and created_at is not null
  ) then
    raise exception 'T-US2-3: response history must record actor and time';
  end if;

  if not exists (
    select 1
    from public.get_request_display(alternate_request_id)
    where requester_name = 'Synthetic Employee'
      and department_name = 'Facilities/Maintenance'
  ) then
    raise exception 'T-US2-1: authorised detail must return only the required participant names';
  end if;

  insert into public.requests (
    institution_id,
    reference,
    requester_id,
    category_id,
    department_id,
    summary,
    description,
    sensitivity,
    idempotency_key
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'JU-P4STATUS01',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    'Synthetic status transition',
    'This synthetic request verifies status history and reason recording.',
    'standard',
    '00000000-0000-4000-8000-000000000908'
  );

  select id
  into managed_request_id
  from public.requests
  where institution_id = '00000000-0000-4000-8000-000000000001'
    and requester_id = '00000000-0000-4000-8000-000000000201'
    and idempotency_key = '00000000-0000-4000-8000-000000000908';

  if not exists (
    select 1
    from public.requests
    where id = managed_request_id
      and status = 'submitted'
  ) then
    raise exception 'T-US2-1: requester must see the current request status';
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
  alternate_request_id uuid;
  managed_request_id uuid;
begin
  select id
  into alternate_request_id
  from public.requests
  where institution_id = '00000000-0000-4000-8000-000000000001'
    and requester_id = '00000000-0000-4000-8000-000000000201'
    and idempotency_key = '00000000-0000-4000-8000-000000000907';

  if (
    select count(*)
    from public.get_request_display(alternate_request_id)
  ) <> 0 then
    raise exception 'T-SEC-2b: cross-department manager received another request detail';
  end if;

  select id
  into managed_request_id
  from public.requests
  where reference = 'JU-P4STATUS01';

  update public.requests
  set assigned_to_user_id = '00000000-0000-4000-8000-000000000202'
  where id = alternate_request_id;
  if found then
    raise exception 'T-SEC-3b: manager updated a request in another department';
  end if;

  update public.requests
  set assigned_to_user_id = '00000000-0000-4000-8000-000000000202'
  where id = managed_request_id;

  update public.requests
  set status = 'acknowledged'
  where id = managed_request_id;

  update public.requests
  set status = 'in_progress'
  where id = managed_request_id;

  begin
    update public.requests
    set status = 'on_hold'
    where id = managed_request_id;
    raise exception 'T-EDGE-10: on-hold transition succeeded without its required reason';
  exception
    when check_violation then null;
  end;

  update public.requests
  set status = 'resolved',
      status_reason = 'Synthetic reason: the reported issue was addressed.'
  where id = managed_request_id;

  if not exists (
    select 1
    from public.request_events
    where request_id = managed_request_id
      and event_type = 'status_changed'
      and metadata ->> 'status_reason'
        = 'Synthetic reason: the reported issue was addressed.'
      and actor_user_id = '00000000-0000-4000-8000-000000000202'
  ) then
    raise exception 'T-US2-3: status history must record actor, time, and reason';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  managed_request_id uuid;
begin
  select id
  into managed_request_id
  from public.requests
  where reference = 'JU-P4STATUS01';

  insert into public.request_events (
    institution_id,
    request_id,
    actor_user_id,
    actor_type,
    event_type,
    message,
    metadata
  ) values (
    '00000000-0000-4000-8000-000000000001',
    managed_request_id,
    '00000000-0000-4000-8000-000000000201',
    'user',
    'response',
    'Synthetic reason: the reported issue has returned.',
    '{"kind":"reopen_request"}'::jsonb
  );
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-it-manager","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  managed_request_id uuid;
begin
  select id
  into managed_request_id
  from public.requests
  where reference = 'JU-P4STATUS01';

  update public.requests
  set status = 'reopened',
      status_reason = null
  where id = managed_request_id;

  if not exists (
    select 1
    from public.request_events
    where request_id = managed_request_id
      and event_type = 'reopened'
      and actor_user_id = '00000000-0000-4000-8000-000000000202'
  ) then
    raise exception 'T-EDGE-10: manager confirmation must record the reopen transition';
  end if;
end
$$;

rollback;
