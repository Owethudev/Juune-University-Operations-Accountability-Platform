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
  if (
    select count(*)
    from public.list_current_announcements(null, null)
  ) <> 1 then
    raise exception 'T-SEC-7a/T-SEC-7b: employee must see only current in-audience announcements';
  end if;

  if exists (
    select 1
    from public.list_current_announcements(null, null)
    where id = '00000000-0000-4000-8000-000000000701'
  ) then
    raise exception 'T-US6-3: unpublished announcements must not appear in the current feed';
  end if;

  if (
    select count(*)
    from public.list_current_opportunities(null, null, null)
  ) <> 1 then
    raise exception 'T-SEC-9a/T-SEC-9b: employee must see only current in-audience opportunities';
  end if;

  if exists (select 1 from public.list_my_announcement_drafts())
    or exists (select 1 from public.list_my_opportunity_drafts()) then
    raise exception 'T-SEC-8b/T-SEC-10b: non-publishers must not read publisher drafts';
  end if;

  begin
    perform public.create_announcement(
      'Unauthorized synthetic notice',
      'Unauthorized test content should not be inserted.',
      array[]::uuid[],
      null,
      true
    );
    raise exception 'T-SEC-8b: non-publisher create must fail';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.create_opportunity(
      'Unauthorized synthetic opportunity',
      'training',
      'Unauthorized opportunity test content should not be inserted.',
      array[]::uuid[],
      now(),
      now() + interval '1 day',
      null,
      'Synthetic instructions for unauthorized access testing.',
      true
    );
    raise exception 'T-SEC-10b: non-publisher create must fail';
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
  if exists (select 1 from public.list_current_announcements(null, null))
    or exists (
      select 1
      from public.list_current_opportunities(null, null, null)
    ) then
    raise exception 'T-SEC-7b/T-SEC-9b: out-of-audience department must not see IT content';
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
  created_content jsonb;
  created_id uuid;
  created_opportunity jsonb;
  created_opportunity_id uuid;
begin
  if not exists (
    select 1
    from public.list_my_announcement_drafts()
    where id = '00000000-0000-4000-8000-000000000701'
  ) or not exists (
    select 1
    from public.list_my_opportunity_drafts()
    where id = '00000000-0000-4000-8000-000000000801'
  ) then
    raise exception 'T-SEC-8a/T-SEC-10a: publishers must read their own drafts';
  end if;

  created_content := public.create_announcement(
    'Synthetic phase seven notice',
    'Synthetic announcement content created only for rollback testing.',
    array['00000000-0000-4000-8000-000000000101']::uuid[],
    now() + interval '1 day',
    true
  );
  created_id := (created_content ->> 'id')::uuid;

  if not exists (
    select 1
    from public.announcements a
    join public.announcement_departments ad
      on ad.institution_id = a.institution_id
      and ad.announcement_id = a.id
    where a.id = created_id
      and a.publisher_user_id = '00000000-0000-4000-8000-000000000204'
      and a.state = 'published'
      and a.published_at is not null
      and ad.department_id = '00000000-0000-4000-8000-000000000101'
  ) then
    raise exception 'T-US6-1/T-BR12-1: publisher, audience, state, and publication timestamp must be recorded';
  end if;

  if not exists (
    select 1
    from public.audit_events ae
    where ae.target_type = 'announcements'
      and ae.target_id = created_id::text
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
  ) then
    raise exception 'T-US6-2: publisher changes must have an audit event';
  end if;

  update public.announcements
  set expires_at = now() - interval '1 minute'
  where id = '00000000-0000-4000-8000-000000000702';
  if exists (
    select 1
    from public.list_current_announcements(null, null)
    where id = '00000000-0000-4000-8000-000000000702'
  ) then
    raise exception 'T-US6-3: expired announcements must not appear as current';
  end if;

  created_opportunity := public.create_opportunity(
    'Synthetic phase seven opportunity',
    'training',
    'Synthetic opportunity content created only for rollback testing.',
    array['00000000-0000-4000-8000-000000000101']::uuid[],
    now(),
    now() + interval '1 day',
    'https://careers.example.invalid/apply',
    null,
    true
  );
  created_opportunity_id := (created_opportunity ->> 'id')::uuid;
  if not exists (
    select 1
    from public.opportunities o
    join public.opportunity_departments od
      on od.institution_id = o.institution_id
      and od.opportunity_id = o.id
    where o.id = created_opportunity_id
      and o.publisher_user_id = '00000000-0000-4000-8000-000000000204'
      and o.state = 'published'
      and o.application_url = 'https://careers.example.invalid/apply'
      and od.department_id = '00000000-0000-4000-8000-000000000101'
  ) then
    raise exception 'T-US7-1/T-BR12-1: publisher, audience, state, and safe application link must be recorded';
  end if;

  if not exists (
    select 1
    from public.audit_events ae
    where ae.target_type = 'opportunities'
      and ae.target_id = created_opportunity_id::text
      and ae.actor_user_id = '00000000-0000-4000-8000-000000000204'
  ) then
    raise exception 'T-US7-1: opportunity publishing must have an audit event';
  end if;

  if exists (
    select 1
    from public.list_current_opportunities(null, null, null) o
    where o.id = '00000000-0000-4000-8000-000000000801'
  ) then
    raise exception 'T-US7-2: draft opportunities must not appear as open';
  end if;

  update public.opportunities
  set application_url = 'https://careers.example.invalid/apply',
      closes_at = now() - interval '1 minute'
  where id = '00000000-0000-4000-8000-000000000802';
  if exists (
    select 1
    from public.get_current_opportunity_application(
      '00000000-0000-4000-8000-000000000802'
    )
  ) then
    raise exception 'T-EDGE-12: an expired opportunity must not redirect to an application';
  end if;
  if exists (
    select 1
    from public.list_current_opportunities(null, null, null)
    where id = '00000000-0000-4000-8000-000000000802'
  ) then
    raise exception 'T-US7-2: past-closing opportunities must not appear as open';
  end if;
end
$$;

rollback;
