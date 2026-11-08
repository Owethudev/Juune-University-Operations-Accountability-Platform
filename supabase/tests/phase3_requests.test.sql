-- Run only against the isolated synthetic test project after Phase 3 migration.
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
  created_request_id uuid;
begin
  if juune_private.current_institution_id()
    <> '00000000-0000-4000-8000-000000000001' then
    raise exception 'T-US1-1: synthetic institution claim was not resolved';
  end if;
  if juune_private.current_user_id()
    <> '00000000-0000-4000-8000-000000000201' then
    raise exception 'T-US1-1: synthetic employee claim was not resolved';
  end if;
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC1') then
    raise exception 'T-SEC-1a: synthetic employee must be active and have SEC1';
  end if;
  if not juune_private.has_permission('SEC2') then
    raise exception 'T-SEC-1a: synthetic employee must have SEC2 to receive the created request';
  end if;
  if not exists (
    select 1
    from public.request_categories
    where id = '00000000-0000-4000-8000-000000000301'
      and institution_id = '00000000-0000-4000-8000-000000000001'
      and default_department_id = '00000000-0000-4000-8000-000000000101'
      and active
      and sensitivity_default = 'standard'
  ) then
    raise exception 'T-US1-1: synthetic category must be active and route to the expected department';
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
    'JU-TESTP3001',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    'Synthetic Phase 3 request',
    'A synthetic request for the Phase 3 persistence test.',
    'standard',
    '00000000-0000-4000-8000-000000000901'
  );

  select id
  into created_request_id
  from public.requests
  where institution_id = '00000000-0000-4000-8000-000000000001'
    and requester_id = '00000000-0000-4000-8000-000000000201'
    and idempotency_key = '00000000-0000-4000-8000-000000000901';

  if created_request_id is null then
    raise exception 'T-US1-1: valid request must be selectable after insert';
  end if;

  if not exists (
    select 1
    from public.requests
    where id = created_request_id
      and status = 'submitted'
      and reference = 'JU-TESTP3001'
      and requester_id = '00000000-0000-4000-8000-000000000201'
  ) then
    raise exception 'T-US1-1: valid request must be saved with submitted status, reference, and requester';
  end if;

  if not exists (
    select 1
    from public.request_events
    where request_id = created_request_id
      and event_type = 'created'
      and actor_user_id = '00000000-0000-4000-8000-000000000201'
  ) then
    raise exception 'T-US1-1: creation event must be recorded atomically';
  end if;

  begin
    insert into public.requests (
      institution_id,
      reference,
      requester_id,
      category_id,
      department_id,
      summary,
      description,
      idempotency_key
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'JU-TESTP3002',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000101',
      'Synthetic Phase 3 retry',
      'A duplicate request that must not be stored.',
      '00000000-0000-4000-8000-000000000901'
    );
    raise exception 'T-EDGE-3: duplicate idempotency key unexpectedly created another request';
  exception
    when unique_violation then null;
  end;

  if (
    select count(*)
    from public.requests
    where institution_id = '00000000-0000-4000-8000-000000000001'
      and requester_id = '00000000-0000-4000-8000-000000000201'
      and idempotency_key = '00000000-0000-4000-8000-000000000901'
  ) <> 1 then
    raise exception 'T-EDGE-3: idempotency key must map to exactly one request';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-platform-admin","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  begin
    insert into public.requests (
      institution_id,
      reference,
      requester_id,
      category_id,
      department_id,
      summary,
      description
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'JU-TESTP3003',
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000101',
      'Synthetic unauthorized request',
      'A role without SEC1 must not create this request.'
    );
    raise exception 'T-SEC-1b: unauthorized role unexpectedly created a request';
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
  begin
    insert into public.requests (
      institution_id,
      reference,
      requester_id,
      category_id,
      department_id,
      summary,
      description
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'JU-TESTP3004',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000101',
      'Synthetic cross-tenant request',
      'A mismatched signed tenant must not create this request.'
    );
    raise exception 'T-SEC-1b: mismatched institution claim unexpectedly created a request';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

rollback;
