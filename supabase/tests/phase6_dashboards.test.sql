-- Run only against the isolated synthetic test project; all fixture changes roll back.
begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"synthetic-it-manager","institution_id":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  if (
    select coalesce(sum(request_count), 0)
    from public.request_dashboard_summary_filtered(
      '2026-01-02',
      '2026-01-02',
      'submitted',
      '00000000-0000-4000-8000-000000000101'
    )
  ) <> 1 then
    raise exception 'T-US5-1: manager filters must return only the assigned department aggregate';
  end if;

  if exists (
    select 1
    from public.request_dashboard_summary_filtered(
      null, null, null, null
    )
    where department_id <> '00000000-0000-4000-8000-000000000101'
  ) then
    raise exception 'T-SEC-6a: manager summary must exclude departments outside their scope';
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
  if (
    select coalesce(sum(request_count), 0)
    from public.request_dashboard_summary_filtered(
      null, null, null, null
    )
  ) <> 2 then
    raise exception 'T-US5-2: leadership summary must include institution-wide standard requests only';
  end if;

  if exists (
    select 1
    from public.request_dashboard_summary_filtered(
      null, null, null, null
    )
    where department_id = '00000000-0000-4000-8000-000000000103'
  ) then
    raise exception 'T-EDGE-8: restricted request details must not appear in dashboard aggregates';
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
  if (
    select count(*)
    from public.request_dashboard_summary_filtered(
      null, null, null, null
    )
  ) <> 0 then
    raise exception 'T-SEC-6b: employees must not read manager dashboard summaries';
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
  if (
    select count(*)
    from public.request_dashboard_summary_filtered(
      null, null, null, null
    )
  ) <> 0 then
    raise exception 'T-SEC-6b: platform administrators must not inherit dashboard scope';
  end if;
end
$$;

rollback;
