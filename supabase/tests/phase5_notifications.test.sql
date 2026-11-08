-- Run only against the isolated synthetic test project after Phase 5 migration.
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
  test_request_id uuid := '00000000-0000-4000-8000-000000000401';
  flag_count integer;
begin
  if not exists (
    select 1
    from public.requests
    where id = test_request_id
      and requester_id = '00000000-0000-4000-8000-000000000201'
      and lack_of_assistance_flags = 0
  ) then
    raise exception 'T-US4-3: expected the untouched synthetic requester fixture';
  end if;

  select juune_private.flag_request(test_request_id) into flag_count;
  if flag_count <> 1 then
    raise exception 'T-US4-3: first flag count was not recorded';
  end if;
  select juune_private.flag_request(test_request_id) into flag_count;
  if flag_count <> 2 then
    raise exception 'T-US4-3: second flag count was not recorded';
  end if;
  select juune_private.flag_request(test_request_id) into flag_count;
  if flag_count <> 3 then
    raise exception 'T-US4-3: third flag count was not recorded';
  end if;

  if (
    select count(*)
    from public.escalation_events
    where request_id = test_request_id
      and trigger = 'third_flag'
      and flag_count_at_trigger = 3
  ) <> 1 then
    raise exception 'T-EDGE-5: third-flag crossing must create exactly one escalation';
  end if;

  if (
    select count(*)
    from public.request_events
    where request_id = test_request_id
      and event_type = 'escalation'
      and actor_type = 'system'
      and actor_user_id is null
      and message = 'This request reached the review threshold and is flagged for review.'
  ) <> 1 then
    raise exception 'T-BR8-1: escalation history must be neutral and unique';
  end if;

  if exists (
    select 1
    from public.notifications
    where related_entity_id = test_request_id
      and event_type = 'request_escalation'
  ) then
    raise exception 'T-US4-3: escalation notifications must remain gated until recipients are approved';
  end if;

  if exists (
    select 1
    from public.notifications
    where related_entity_id = test_request_id
      and channel <> 'in_app'
  ) then
    raise exception 'T-EDGE-4: no external email is enabled without approved provider configuration';
  end if;
end
$$;

reset role;
insert into public.request_events (
  institution_id,
  request_id,
  actor_user_id,
  actor_type,
  event_type,
  metadata
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000201',
  'user',
  'created',
  '{}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-it-manager","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  test_request_id uuid := '00000000-0000-4000-8000-000000000401';
begin
  if not exists (
    select 1
    from public.notifications
    where related_entity_id = test_request_id
      and recipient_user_id = '00000000-0000-4000-8000-000000000202'
      and channel = 'in_app'
      and event_type = 'request_created'
  ) then
    raise exception 'T-BR4-1: the assigned department manager must receive an in-app notification';
  end if;

  if (
    select count(*)
    from public.escalation_events
    where request_id = test_request_id
  ) <> 1 then
    raise exception 'T-SEC-4b: request-access policy must scope escalation history to participants';
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
    test_request_id,
    '00000000-0000-4000-8000-000000000202',
    'user',
    'response',
    'Synthetic manager response for notification scope testing.',
    '{}'::jsonb
  );
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-employee","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  test_request_id uuid := '00000000-0000-4000-8000-000000000401';
begin
  if exists (
    select 1
    from public.notifications
    where related_entity_id = test_request_id
      and event_type = 'request_created'
  ) then
    raise exception 'T-SEC-4a: employee must not read the manager notification';
  end if;

  if not exists (
    select 1
    from public.notifications
    where related_entity_id = test_request_id
      and event_type = 'request_response'
      and recipient_user_id = '00000000-0000-4000-8000-000000000201'
      and channel = 'in_app'
      and read_at is null
  ) then
    raise exception 'T-SEC-4a: requester must receive their own in-app notification';
  end if;
end
$$;

rollback;
