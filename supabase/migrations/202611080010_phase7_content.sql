create or replace function juune_private.is_safe_external_https_url(required_url text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select required_url ~*
    '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$'
$$;

alter table public.opportunities
  drop constraint if exists opportunities_application_url_check;
alter table public.opportunities
  add constraint opportunities_application_url_check
  check (
    application_url is null
    or juune_private.is_safe_external_https_url(application_url)
  );

create or replace function juune_private.valid_content_audience(required_department_ids uuid[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select cardinality(coalesce(required_department_ids, array[]::uuid[])) = (
    select count(distinct selected.department_id)::integer
    from unnest(coalesce(required_department_ids, array[]::uuid[]))
      as selected(department_id)
    join public.departments d
      on d.id = selected.department_id
      and d.institution_id = juune_private.current_institution_id()
      and d.status = 'active'
  )
    and juune_private.is_active_principal()
$$;

create or replace function public.list_current_announcements(
  required_search text default null,
  required_department_id uuid default null
)
returns table (
  id uuid,
  title text,
  body text,
  publisher_name text,
  published_at timestamptz,
  expires_at timestamptz,
  audience_department_names text[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    a.id,
    a.title::text,
    a.body::text,
    publisher.name::text,
    a.published_at,
    a.expires_at,
    coalesce(
      array(
        select d.name::text
        from public.announcement_departments ad
        join public.departments d
          on d.id = ad.department_id
          and d.institution_id = ad.institution_id
        where ad.institution_id = a.institution_id
          and ad.announcement_id = a.id
        order by d.name
      ),
      array[]::text[]
    )
  from public.announcements a
  join public.users publisher
    on publisher.id = a.publisher_user_id
    and publisher.institution_id = a.institution_id
  where juune_private.can_read_announcement(a.id)
    and (a.expires_at is null or a.expires_at > now())
    and (
      required_search is null
      or a.title ilike '%' || required_search || '%'
      or a.body ilike '%' || required_search || '%'
    )
    and (
      required_department_id is null
      or not exists (
        select 1
        from public.announcement_departments target
        where target.institution_id = a.institution_id
          and target.announcement_id = a.id
      )
      or exists (
        select 1
        from public.announcement_departments target
        where target.institution_id = a.institution_id
          and target.announcement_id = a.id
          and target.department_id = required_department_id
      )
    )
  order by a.published_at desc, a.id
$$;

create or replace function public.read_current_announcement(
  required_announcement_id uuid
)
returns table (
  id uuid,
  title text,
  body text,
  publisher_name text,
  published_at timestamptz,
  expires_at timestamptz,
  audience_department_names text[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select a.*
  from public.list_current_announcements(null, null) a
  where a.id = required_announcement_id
$$;

create or replace function public.list_my_announcement_drafts()
returns table (
  id uuid,
  title text,
  body text,
  expires_at timestamptz,
  audience_department_ids uuid[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    a.id,
    a.title::text,
    a.body::text,
    a.expires_at,
    coalesce(
      array(
        select ad.department_id
        from public.announcement_departments ad
        where ad.institution_id = a.institution_id
          and ad.announcement_id = a.id
        order by ad.department_id
      ),
      array[]::uuid[]
    )
  from public.announcements a
  where a.institution_id = juune_private.current_institution_id()
    and a.publisher_user_id = juune_private.current_user_id()
    and a.state = 'draft'
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC8')
  order by a.updated_at desc, a.id
$$;

create or replace function public.create_announcement(
  required_title text,
  required_body text,
  required_department_ids uuid[],
  required_expires_at timestamptz,
  publish_now boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  created public.announcements%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC8') then
    raise exception 'Announcement publishing is not permitted.'
      using errcode = '42501';
  end if;
  if char_length(btrim(required_title)) not between 5 and 120
    or char_length(btrim(required_body)) not between 10 and 5000
    or (required_expires_at is not null and required_expires_at <= now())
    or not juune_private.valid_content_audience(required_department_ids) then
    raise exception 'Announcement details or audience are invalid.'
      using errcode = '22023';
  end if;

  insert into public.announcements (
    institution_id,
    title,
    body,
    publisher_user_id,
    state,
    published_at,
    expires_at
  ) values (
    juune_private.current_institution_id(),
    btrim(required_title),
    btrim(required_body),
    juune_private.current_user_id(),
    case when publish_now then 'published'::public.content_state
      else 'draft'::public.content_state end,
    case when publish_now then now() else null end,
    required_expires_at
  )
  returning * into created;

  insert into public.announcement_departments (
    institution_id, announcement_id, department_id
  )
  select created.institution_id, created.id, selected.department_id
  from unnest(coalesce(required_department_ids, array[]::uuid[]))
    as selected(department_id);

  return jsonb_build_object(
    'id', created.id,
    'title', created.title,
    'state', created.state
  );
end
$$;

create or replace function public.update_announcement_draft(
  required_announcement_id uuid,
  required_title text,
  required_body text,
  required_department_ids uuid[],
  required_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated public.announcements%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC8') then
    raise exception 'Announcement editing is not permitted.'
      using errcode = '42501';
  end if;
  if char_length(btrim(required_title)) not between 5 and 120
    or char_length(btrim(required_body)) not between 10 and 5000
    or (required_expires_at is not null and required_expires_at <= now())
    or not juune_private.valid_content_audience(required_department_ids) then
    raise exception 'Announcement details or audience are invalid.'
      using errcode = '22023';
  end if;

  update public.announcements a
  set title = btrim(required_title),
      body = btrim(required_body),
      expires_at = required_expires_at,
      updated_at = now()
  where a.id = required_announcement_id
    and a.institution_id = juune_private.current_institution_id()
    and a.publisher_user_id = juune_private.current_user_id()
    and a.state = 'draft'
  returning a.* into updated;
  if updated.id is null then
    raise exception 'Announcement draft is not available.'
      using errcode = '42501';
  end if;

  delete from public.announcement_departments ad
  where ad.institution_id = updated.institution_id
    and ad.announcement_id = updated.id;
  insert into public.announcement_departments (
    institution_id, announcement_id, department_id
  )
  select updated.institution_id, updated.id, selected.department_id
  from unnest(coalesce(required_department_ids, array[]::uuid[]))
    as selected(department_id);

  return jsonb_build_object(
    'id', updated.id,
    'title', updated.title,
    'state', updated.state
  );
end
$$;

create or replace function public.publish_announcement_draft(
  required_announcement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  published public.announcements%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC8') then
    raise exception 'Announcement publishing is not permitted.'
      using errcode = '42501';
  end if;

  update public.announcements a
  set state = 'published',
      published_at = now(),
      updated_at = now()
  where a.id = required_announcement_id
    and a.institution_id = juune_private.current_institution_id()
    and a.publisher_user_id = juune_private.current_user_id()
    and a.state = 'draft'
    and (a.expires_at is null or a.expires_at > now())
  returning a.* into published;
  if published.id is null then
    raise exception 'Announcement draft is not available to publish.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', published.id,
    'title', published.title,
    'state', published.state
  );
end
$$;

create or replace function public.list_current_opportunities(
  required_search text default null,
  required_department_id uuid default null,
  required_type public.opportunity_type default null,
  required_closing_from date default null,
  required_closing_to date default null
)
returns table (
  id uuid,
  title text,
  type public.opportunity_type,
  description text,
  publisher_name text,
  department_names text[],
  opens_at timestamptz,
  closes_at timestamptz,
  application_url text,
  instructions text
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    o.id,
    o.title::text,
    o.type,
    o.description::text,
    publisher.name::text,
    coalesce(
      array(
        select d.name::text
        from public.opportunity_departments od
        join public.departments d
          on d.id = od.department_id
          and d.institution_id = od.institution_id
        where od.institution_id = o.institution_id
          and od.opportunity_id = o.id
        order by d.name
      ),
      array[]::text[]
    ),
    o.opens_at,
    o.closes_at,
    o.application_url,
    o.instructions
  from public.opportunities o
  join public.users publisher
    on publisher.id = o.publisher_user_id
    and publisher.institution_id = o.institution_id
  where juune_private.can_read_opportunity(o.id)
    and (o.closes_at is null or o.closes_at > now())
    and (required_type is null or o.type = required_type)
    and (
      required_closing_from is null
      or (
        o.closes_at is not null
        and o.closes_at >= (required_closing_from::timestamp at time zone 'UTC')
      )
    )
    and (
      required_closing_to is null
      or (
        o.closes_at is not null
        and o.closes_at < ((required_closing_to + 1)::timestamp at time zone 'UTC')
      )
    )
    and (
      required_search is null
      or o.title ilike '%' || required_search || '%'
      or o.description ilike '%' || required_search || '%'
    )
    and (
      required_department_id is null
      or not exists (
        select 1
        from public.opportunity_departments target
        where target.institution_id = o.institution_id
          and target.opportunity_id = o.id
      )
      or exists (
        select 1
        from public.opportunity_departments target
        where target.institution_id = o.institution_id
          and target.opportunity_id = o.id
          and target.department_id = required_department_id
      )
    )
  order by o.closes_at nulls last, o.title, o.id
$$;

create or replace function public.read_current_opportunity(
  required_opportunity_id uuid
)
returns table (
  id uuid,
  title text,
  type public.opportunity_type,
  description text,
  publisher_name text,
  department_names text[],
  opens_at timestamptz,
  closes_at timestamptz,
  application_url text,
  instructions text
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select o.*
  from public.list_current_opportunities(null, null, null, null, null) o
  where o.id = required_opportunity_id
$$;

create or replace function public.list_my_opportunity_drafts()
returns table (
  id uuid,
  title text,
  type public.opportunity_type,
  description text,
  opens_at timestamptz,
  closes_at timestamptz,
  application_url text,
  instructions text,
  audience_department_ids uuid[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    o.id,
    o.title::text,
    o.type,
    o.description::text,
    o.opens_at,
    o.closes_at,
    o.application_url,
    o.instructions,
    coalesce(
      array(
        select od.department_id
        from public.opportunity_departments od
        where od.institution_id = o.institution_id
          and od.opportunity_id = o.id
        order by od.department_id
      ),
      array[]::uuid[]
    )
  from public.opportunities o
  where o.institution_id = juune_private.current_institution_id()
    and o.publisher_user_id = juune_private.current_user_id()
    and o.state = 'draft'
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC10')
  order by o.updated_at desc, o.id
$$;

create or replace function public.create_opportunity(
  required_title text,
  required_type public.opportunity_type,
  required_description text,
  required_department_ids uuid[],
  required_opens_at timestamptz,
  required_closes_at timestamptz,
  required_application_url text,
  required_instructions text,
  publish_now boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  created public.opportunities%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC10') then
    raise exception 'Opportunity publishing is not permitted.'
      using errcode = '42501';
  end if;
  if char_length(btrim(required_title)) not between 5 and 120
    or char_length(btrim(required_description)) not between 10 and 5000
    or (required_closes_at is not null and required_opens_at is not null
      and required_closes_at <= required_opens_at)
    or (required_closes_at is not null and required_closes_at <= now())
    or (required_application_url is null and required_instructions is null)
    or (required_application_url is not null and required_instructions is not null)
    or (required_application_url is not null
      and not juune_private.is_safe_external_https_url(required_application_url))
    or (required_instructions is not null
      and char_length(btrim(required_instructions)) not between 10 and 5000)
    or not juune_private.valid_content_audience(required_department_ids) then
    raise exception 'Opportunity details or audience are invalid.'
      using errcode = '22023';
  end if;

  insert into public.opportunities (
    institution_id,
    title,
    type,
    description,
    publisher_user_id,
    state,
    opens_at,
    closes_at,
    application_url,
    instructions
  ) values (
    juune_private.current_institution_id(),
    btrim(required_title),
    required_type,
    btrim(required_description),
    juune_private.current_user_id(),
    case when publish_now then 'published'::public.content_state
      else 'draft'::public.content_state end,
    required_opens_at,
    required_closes_at,
    required_application_url,
    nullif(btrim(required_instructions), '')
  )
  returning * into created;

  insert into public.opportunity_departments (
    institution_id, opportunity_id, department_id
  )
  select created.institution_id, created.id, selected.department_id
  from unnest(coalesce(required_department_ids, array[]::uuid[]))
    as selected(department_id);

  return jsonb_build_object(
    'id', created.id,
    'title', created.title,
    'state', created.state
  );
end
$$;

create or replace function public.update_opportunity_draft(
  required_opportunity_id uuid,
  required_title text,
  required_type public.opportunity_type,
  required_description text,
  required_department_ids uuid[],
  required_opens_at timestamptz,
  required_closes_at timestamptz,
  required_application_url text,
  required_instructions text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated public.opportunities%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC10') then
    raise exception 'Opportunity editing is not permitted.'
      using errcode = '42501';
  end if;
  if char_length(btrim(required_title)) not between 5 and 120
    or char_length(btrim(required_description)) not between 10 and 5000
    or (required_closes_at is not null and required_opens_at is not null
      and required_closes_at <= required_opens_at)
    or (required_closes_at is not null and required_closes_at <= now())
    or (required_application_url is null and required_instructions is null)
    or (required_application_url is not null and required_instructions is not null)
    or (required_application_url is not null
      and not juune_private.is_safe_external_https_url(required_application_url))
    or (required_instructions is not null
      and char_length(btrim(required_instructions)) not between 10 and 5000)
    or not juune_private.valid_content_audience(required_department_ids) then
    raise exception 'Opportunity details or audience are invalid.'
      using errcode = '22023';
  end if;

  update public.opportunities o
  set title = btrim(required_title),
      type = required_type,
      description = btrim(required_description),
      opens_at = required_opens_at,
      closes_at = required_closes_at,
      application_url = required_application_url,
      instructions = nullif(btrim(required_instructions), ''),
      updated_at = now()
  where o.id = required_opportunity_id
    and o.institution_id = juune_private.current_institution_id()
    and o.publisher_user_id = juune_private.current_user_id()
    and o.state = 'draft'
  returning o.* into updated;
  if updated.id is null then
    raise exception 'Opportunity draft is not available.'
      using errcode = '42501';
  end if;

  delete from public.opportunity_departments od
  where od.institution_id = updated.institution_id
    and od.opportunity_id = updated.id;
  insert into public.opportunity_departments (
    institution_id, opportunity_id, department_id
  )
  select updated.institution_id, updated.id, selected.department_id
  from unnest(coalesce(required_department_ids, array[]::uuid[]))
    as selected(department_id);

  return jsonb_build_object(
    'id', updated.id,
    'title', updated.title,
    'state', updated.state
  );
end
$$;

create or replace function public.publish_opportunity_draft(
  required_opportunity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  published public.opportunities%rowtype;
begin
  if not juune_private.is_active_principal()
    or not juune_private.has_permission('SEC10') then
    raise exception 'Opportunity publishing is not permitted.'
      using errcode = '42501';
  end if;

  update public.opportunities o
  set state = 'published',
      updated_at = now()
  where o.id = required_opportunity_id
    and o.institution_id = juune_private.current_institution_id()
    and o.publisher_user_id = juune_private.current_user_id()
    and o.state = 'draft'
    and (o.closes_at is null or o.closes_at > now())
  returning o.* into published;
  if published.id is null then
    raise exception 'Opportunity draft is not available to publish.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', published.id,
    'title', published.title,
    'state', published.state
  );
end
$$;

create or replace function public.get_current_opportunity_application(
  required_opportunity_id uuid
)
returns table (application_url text)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select o.application_url
  from public.opportunities o
  where o.id = required_opportunity_id
    and o.institution_id = juune_private.current_institution_id()
    and juune_private.can_read_opportunity(o.id)
    and o.state = 'published'
    and (o.opens_at is null or o.opens_at <= now())
    and (o.closes_at is null or o.closes_at > now())
    and o.application_url is not null
    and juune_private.is_safe_external_https_url(o.application_url)
$$;

drop trigger if exists announcements_audit_publish on public.announcements;
drop trigger if exists opportunities_audit_publish on public.opportunities;
drop trigger if exists announcements_audit_update on public.announcements;
create trigger announcements_audit_update
  after update on public.announcements
  for each row execute function juune_private.audit_security_change();
drop trigger if exists opportunities_audit_update on public.opportunities;
create trigger opportunities_audit_update
  after update on public.opportunities
  for each row execute function juune_private.audit_security_change();

revoke all on function juune_private.is_safe_external_https_url(text)
  from public, anon, authenticated;
revoke all on function juune_private.valid_content_audience(uuid[])
  from public, anon, authenticated;
revoke all on function public.list_current_announcements(text, uuid)
  from public, anon;
revoke all on function public.read_current_announcement(uuid)
  from public, anon;
revoke all on function public.list_my_announcement_drafts()
  from public, anon;
revoke all on function public.create_announcement(text, text, uuid[], timestamptz, boolean)
  from public, anon;
revoke all on function public.update_announcement_draft(uuid, text, text, uuid[], timestamptz)
  from public, anon;
revoke all on function public.publish_announcement_draft(uuid)
  from public, anon;
revoke all on function public.list_current_opportunities(text, uuid, public.opportunity_type, date, date)
  from public, anon;
revoke all on function public.read_current_opportunity(uuid)
  from public, anon;
revoke all on function public.list_my_opportunity_drafts()
  from public, anon;
revoke all on function public.create_opportunity(text, public.opportunity_type, text, uuid[], timestamptz, timestamptz, text, text, boolean)
  from public, anon;
revoke all on function public.update_opportunity_draft(uuid, text, public.opportunity_type, text, uuid[], timestamptz, timestamptz, text, text)
  from public, anon;
revoke all on function public.publish_opportunity_draft(uuid)
  from public, anon;
revoke all on function public.get_current_opportunity_application(uuid)
  from public, anon;

grant execute on function public.list_current_announcements(text, uuid) to authenticated;
grant execute on function public.read_current_announcement(uuid) to authenticated;
grant execute on function public.list_my_announcement_drafts() to authenticated;
grant execute on function public.create_announcement(text, text, uuid[], timestamptz, boolean) to authenticated;
grant execute on function public.update_announcement_draft(uuid, text, text, uuid[], timestamptz) to authenticated;
grant execute on function public.publish_announcement_draft(uuid) to authenticated;
grant execute on function public.list_current_opportunities(text, uuid, public.opportunity_type, date, date) to authenticated;
grant execute on function public.read_current_opportunity(uuid) to authenticated;
grant execute on function public.list_my_opportunity_drafts() to authenticated;
grant execute on function public.create_opportunity(text, public.opportunity_type, text, uuid[], timestamptz, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.update_opportunity_draft(uuid, text, public.opportunity_type, text, uuid[], timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.publish_opportunity_draft(uuid) to authenticated;
grant execute on function public.get_current_opportunity_application(uuid) to authenticated;
grant execute on function juune_private.is_safe_external_https_url(text) to authenticated;
