-- Phase 2 relational schema foundation. RLS, grants, and trusted JWT claim
-- enforcement are defined by the following migration; do not apply this file alone.

do $$
begin
  create type public.institution_status as enum ('setup', 'pilot', 'active', 'suspended');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.user_status as enum ('invited', 'active', 'suspended', 'deactivated');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.department_type as enum (
    'IT',
    'Facilities/Maintenance',
    'Administration',
    'Other'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.department_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_status as enum (
    'submitted',
    'acknowledged',
    'in_progress',
    'waiting_for_requester',
    'on_hold',
    'resolved',
    'closed',
    'reopened'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_sensitivity as enum ('standard', 'restricted');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_event_type as enum (
    'created',
    'status_changed',
    'assigned',
    'response',
    'flag',
    'escalation',
    'evidence_added',
    'reopened',
    'closed'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.notification_channel as enum ('in_app', 'email');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'read');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.content_state as enum ('draft', 'published', 'unpublished', 'expired');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.opportunity_type as enum (
    'vacancy',
    'promotion',
    'temporary_assignment',
    'training',
    'professional_development'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.audit_outcome as enum ('success', 'denied', 'failed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.escalation_trigger as enum ('third_flag');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.escalation_status as enum ('open', 'under_review', 'action_recorded', 'closed');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null check (char_length(btrim(name)) between 1 and 160),
  timezone varchar(80) not null,
  configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuration) = 'object'),
  status public.institution_status not null default 'setup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  code varchar(40) primary key,
  display_name varchar(80) not null,
  check (code in ('employee', 'department_manager', 'senior_leadership', 'platform_admin'))
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name varchar(120) not null check (char_length(btrim(name)) between 1 and 120),
  type public.department_type not null,
  status public.department_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id)
);

create unique index if not exists departments_active_name_per_institution_uidx
  on public.departments (institution_id, lower(name))
  where status = 'active';

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  institutional_id varchar(120) not null
    check (char_length(btrim(institutional_id)) between 1 and 120),
  name varchar(120) not null check (char_length(btrim(name)) between 1 and 120),
  email varchar(254) not null check (char_length(btrim(email)) between 3 and 254),
  department_id uuid,
  status public.user_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  constraint users_department_same_institution_fk
    foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
    on delete restrict
);

create unique index if not exists users_institutional_id_per_institution_uidx
  on public.users (institution_id, institutional_id);

create unique index if not exists users_email_per_institution_uidx
  on public.users (institution_id, lower(email));

create table if not exists public.user_roles (
  institution_id uuid not null,
  user_id uuid not null,
  role_code varchar(40) not null references public.roles(code) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (institution_id, user_id, role_code),
  foreign key (institution_id, user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create table if not exists public.department_managers (
  institution_id uuid not null,
  department_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (institution_id, department_id, user_id),
  foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
    on delete restrict,
  foreign key (institution_id, user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create index if not exists department_managers_user_idx
  on public.department_managers (institution_id, user_id);

create table if not exists public.request_categories (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name varchar(120) not null check (char_length(btrim(name)) between 1 and 120),
  description varchar(1000),
  default_department_id uuid not null,
  sensitivity_default public.request_sensitivity not null default 'standard',
  evidence_policy varchar(1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  foreign key (institution_id, default_department_id)
    references public.departments (institution_id, id)
    on delete restrict
);

create unique index if not exists request_categories_active_name_per_institution_uidx
  on public.request_categories (institution_id, lower(name))
  where active;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  reference varchar(30) not null check (char_length(btrim(reference)) between 1 and 30),
  requester_id uuid not null,
  category_id uuid not null,
  department_id uuid not null,
  assigned_to_user_id uuid,
  summary varchar(120) not null
    check (char_length(btrim(summary)) between 5 and 120),
  description varchar(5000) not null
    check (char_length(btrim(description)) between 10 and 5000),
  status public.request_status not null default 'submitted',
  sensitivity public.request_sensitivity not null default 'standard',
  estimate_days numeric(8, 2) check (estimate_days is null or estimate_days >= 0),
  lack_of_assistance_flags integer not null default 0
    check (lack_of_assistance_flags >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  unique (institution_id, id),
  unique (institution_id, reference),
  foreign key (institution_id, requester_id)
    references public.users (institution_id, id)
    on delete restrict,
  foreign key (institution_id, category_id)
    references public.request_categories (institution_id, id)
    on delete restrict,
  foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
    on delete restrict,
  foreign key (institution_id, assigned_to_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create index if not exists requests_institution_status_updated_idx
  on public.requests (institution_id, status, updated_at desc);

create index if not exists requests_institution_requester_created_idx
  on public.requests (institution_id, requester_id, created_at desc);

create index if not exists requests_institution_department_status_updated_idx
  on public.requests (institution_id, department_id, status, updated_at desc);

create table if not exists public.request_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  request_id uuid not null,
  actor_user_id uuid,
  actor_type varchar(10) not null default 'user'
    check (actor_type in ('user', 'system')),
  event_type public.request_event_type not null,
  message varchar(5000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint request_events_actor_required_check
    check ((actor_type = 'system' and actor_user_id is null)
      or (actor_type = 'user' and actor_user_id is not null)),
  foreign key (institution_id, request_id)
    references public.requests (institution_id, id)
    on delete restrict,
  foreign key (institution_id, actor_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create index if not exists request_events_request_created_idx
  on public.request_events (institution_id, request_id, created_at);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  request_id uuid not null,
  uploaded_by_user_id uuid not null,
  storage_key varchar(500) not null check (char_length(btrim(storage_key)) between 1 and 500),
  file_name varchar(255) not null check (char_length(btrim(file_name)) between 1 and 255),
  mime_type varchar(120) not null check (char_length(btrim(mime_type)) between 1 and 120),
  size_bytes bigint not null check (size_bytes > 0),
  sensitivity public.request_sensitivity not null,
  created_at timestamptz not null default now(),
  unique (storage_key),
  foreign key (institution_id, request_id)
    references public.requests (institution_id, id)
    on delete restrict,
  foreign key (institution_id, uploaded_by_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create index if not exists attachments_request_created_idx
  on public.attachments (institution_id, request_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  recipient_user_id uuid not null,
  event_type varchar(80) not null check (char_length(btrim(event_type)) between 1 and 80),
  related_entity_type varchar(40),
  related_entity_id uuid,
  channel public.notification_channel not null default 'in_app',
  status public.notification_status not null default 'pending',
  dedupe_key varchar(200),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  check ((related_entity_type is null) = (related_entity_id is null)),
  foreign key (institution_id, recipient_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create unique index if not exists notifications_recipient_channel_dedupe_uidx
  on public.notifications (institution_id, recipient_user_id, channel, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_recipient_status_created_idx
  on public.notifications (institution_id, recipient_user_id, status, created_at desc);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  title varchar(160) not null check (char_length(btrim(title)) between 1 and 160),
  body varchar(10000) not null check (char_length(btrim(body)) between 1 and 10000),
  publisher_user_id uuid not null,
  state public.content_state not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  check (expires_at is null or published_at is null or expires_at > published_at),
  foreign key (institution_id, publisher_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create table if not exists public.announcement_departments (
  institution_id uuid not null,
  announcement_id uuid not null,
  department_id uuid not null,
  primary key (institution_id, announcement_id, department_id),
  foreign key (institution_id, announcement_id)
    references public.announcements (institution_id, id)
    on delete restrict,
  foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
    on delete restrict
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  title varchar(160) not null check (char_length(btrim(title)) between 1 and 160),
  type public.opportunity_type not null,
  description varchar(10000) not null
    check (char_length(btrim(description)) between 1 and 10000),
  publisher_user_id uuid not null,
  state public.content_state not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  application_url text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, id),
  check (application_url is null or application_url ~ '^https://'),
  check (closes_at is null or opens_at is null or closes_at > opens_at),
  check (application_url is null or instructions is null),
  foreign key (institution_id, publisher_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create table if not exists public.opportunity_departments (
  institution_id uuid not null,
  opportunity_id uuid not null,
  department_id uuid not null,
  primary key (institution_id, opportunity_id, department_id),
  foreign key (institution_id, opportunity_id)
    references public.opportunities (institution_id, id)
    on delete restrict,
  foreign key (institution_id, department_id)
    references public.departments (institution_id, id)
    on delete restrict
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  actor_user_id uuid,
  action varchar(120) not null check (char_length(btrim(action)) between 1 and 120),
  target_type varchar(80) not null check (char_length(btrim(target_type)) between 1 and 80),
  target_id varchar(120) not null check (char_length(btrim(target_id)) between 1 and 120),
  created_at timestamptz not null default now(),
  outcome public.audit_outcome not null default 'success',
  correlation_id varchar(120),
  foreign key (institution_id, actor_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create index if not exists audit_events_institution_timestamp_idx
  on public.audit_events (institution_id, created_at desc);

create table if not exists public.escalation_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  request_id uuid not null,
  trigger public.escalation_trigger not null default 'third_flag',
  flag_count_at_trigger integer not null default 3
    check (flag_count_at_trigger >= 3),
  status public.escalation_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (institution_id, id),
  unique (institution_id, request_id, trigger),
  foreign key (institution_id, request_id)
    references public.requests (institution_id, id)
    on delete restrict
);

create table if not exists public.escalation_authorities (
  institution_id uuid not null,
  escalation_event_id uuid not null,
  authority_user_id uuid not null,
  primary key (institution_id, escalation_event_id, authority_user_id),
  foreign key (institution_id, escalation_event_id)
    references public.escalation_events (institution_id, id)
    on delete restrict,
  foreign key (institution_id, authority_user_id)
    references public.users (institution_id, id)
    on delete restrict
);

create table if not exists public.permission_definitions (
  code varchar(40) primary key,
  description varchar(240) not null
);

create table if not exists public.role_permissions (
  institution_id uuid not null references public.institutions(id) on delete restrict,
  role_code varchar(40) not null references public.roles(code) on delete restrict,
  permission_code varchar(40) not null
    references public.permission_definitions(code) on delete restrict,
  granted_at timestamptz not null default now(),
  primary key (institution_id, role_code, permission_code)
);

create index if not exists role_permissions_lookup_idx
  on public.role_permissions (institution_id, permission_code, role_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.reject_immutable_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Append-only records cannot be changed.'
    using errcode = '42501';
end;
$$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists request_categories_set_updated_at on public.request_categories;
create trigger request_categories_set_updated_at
  before update on public.request_categories
  for each row execute function public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

drop trigger if exists request_events_append_only on public.request_events;
create trigger request_events_append_only
  before update or delete on public.request_events
  for each row execute function public.reject_immutable_history_mutation();

drop trigger if exists audit_events_append_only on public.audit_events;
create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.reject_immutable_history_mutation();

comment on table public.institutions is
  'Juune Phase 2 relational schema; authorization policies are installed by the following migration.';
