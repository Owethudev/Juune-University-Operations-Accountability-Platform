-- Deterministic synthetic test data only. Do not use for production or real staff.
-- The test-only JWT contract uses sub=users.institutional_id and a signed
-- institution_id claim. Never use these synthetic identities in production.

insert into public.institutions (
  id, name, timezone, configuration, status, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  'Synthetic Pilot Institution',
  'UTC',
  '{}'::jsonb,
  'pilot',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00'
)
on conflict (id) do nothing;

insert into public.roles (code, display_name) values
  ('employee', 'Employee'),
  ('department_manager', 'Department manager'),
  ('senior_leadership', 'Senior leadership'),
  ('platform_admin', 'Platform administrator')
on conflict (code) do nothing;

insert into public.departments (
  id, institution_id, name, type, status, created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'IT',
    'IT',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'Facilities/Maintenance',
    'Facilities/Maintenance',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000001',
    'Administration',
    'Administration',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
on conflict (id) do nothing;

insert into public.users (
  id, institution_id, institutional_id, name, email, department_id,
  status, created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'synthetic-employee',
    'Synthetic Employee',
    'employee@example.invalid',
    '00000000-0000-4000-8000-000000000101',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000001',
    'synthetic-it-manager',
    'Synthetic IT Manager',
    'it.manager@example.invalid',
    '00000000-0000-4000-8000-000000000101',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000001',
    'synthetic-senior-leader',
    'Synthetic Senior Leader',
    'leader@example.invalid',
    null,
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000001',
    'synthetic-platform-admin',
    'Synthetic Platform Administrator',
    'platform.admin@example.invalid',
    null,
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    '00000000-0000-4000-8000-000000000001',
    'synthetic-facilities-employee',
    'Synthetic Facilities Employee',
    'facilities.employee@example.invalid',
    '00000000-0000-4000-8000-000000000102',
    'active',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
on conflict (id) do nothing;

insert into public.user_roles (institution_id, user_id, role_code, assigned_at) values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'employee',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    'department_manager',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000203',
    'senior_leadership',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000204',
    'platform_admin',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000205',
    'employee',
    '2026-01-01 00:00:00+00'
  )
on conflict (institution_id, user_id, role_code) do nothing;

insert into public.department_managers (
  institution_id, department_id, user_id, created_at
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000202',
  '2026-01-01 00:00:00+00'
)
on conflict (institution_id, department_id, user_id) do nothing;

insert into public.request_categories (
  id, institution_id, name, description, default_department_id,
  sensitivity_default, active, created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    'IT support',
    'Synthetic test category for IT support requests.',
    '00000000-0000-4000-8000-000000000101',
    'standard',
    true,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    'Facilities maintenance',
    'Synthetic test category for maintenance requests.',
    '00000000-0000-4000-8000-000000000102',
    'standard',
    true,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    'Administration support',
    'Synthetic test category for administration requests.',
    '00000000-0000-4000-8000-000000000103',
    'standard',
    true,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000001',
    'Synthetic restricted category',
    'Synthetic category for restricted-access policy tests.',
    '00000000-0000-4000-8000-000000000103',
    'restricted',
    true,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
on conflict (id) do nothing;

insert into public.requests (
  id, institution_id, reference, requester_id, category_id, department_id,
  summary, description, status, sensitivity, created_at, updated_at,
  resolved_at, closed_at
) values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000001',
    'JU-TEST0001',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    'Synthetic IT request',
    'Synthetic description for an IT support test request.',
    'submitted',
    'standard',
    '2026-01-02 09:00:00+00',
    '2026-01-02 09:00:00+00',
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000001',
    'JU-TEST0002',
    '00000000-0000-4000-8000-000000000205',
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000102',
    'Synthetic maintenance request',
    'Synthetic description for a maintenance test request.',
    'in_progress',
    'standard',
    '2026-01-03 09:00:00+00',
    '2026-01-04 09:00:00+00',
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000001',
    'JU-TEST0003',
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000103',
    'Synthetic administration request',
    'Synthetic description for an administration test request.',
    'resolved',
    'restricted',
    '2026-01-05 09:00:00+00',
    '2026-01-06 09:00:00+00',
    '2026-01-06 09:00:00+00',
    null
  )
on conflict (id) do nothing;

insert into public.request_access_grants (
  id, institution_id, request_id, user_id, granted_by_user_id, reason, granted_at
) values (
  '00000000-0000-4000-8000-000000000451',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000204',
  'Synthetic explicit access test grant.',
  '2026-01-04 10:00:00+00'
)
on conflict (institution_id, request_id, user_id) do nothing;

insert into public.request_events (
  id, institution_id, request_id, actor_user_id, actor_type,
  event_type, message, metadata, created_at
) values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000201',
    'user',
    'created',
    'Synthetic request created for test data.',
    '{}'::jsonb,
    '2026-01-02 09:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000202',
    'user',
    'status_changed',
    'Synthetic test status update.',
    '{}'::jsonb,
    '2026-01-04 09:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000503',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000202',
    'user',
    'status_changed',
    'Synthetic test resolution event.',
    '{}'::jsonb,
    '2026-01-06 09:00:00+00'
  )
on conflict (id) do nothing;

insert into public.notifications (
  id, institution_id, recipient_user_id, event_type, related_entity_type,
  related_entity_id, channel, status, dedupe_key, created_at
) values (
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000201',
  'request_status_changed',
  'request',
  '00000000-0000-4000-8000-000000000402',
  'in_app',
  'pending',
  'synthetic-request-402-status',
  '2026-01-04 09:00:00+00'
)
on conflict (id) do nothing;

insert into public.announcements (
  id, institution_id, title, body, publisher_user_id, state,
  created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000001',
  'Synthetic draft announcement',
  'Synthetic announcement content for database tests only.',
  '00000000-0000-4000-8000-000000000204',
  'draft',
  '2026-01-07 09:00:00+00',
  '2026-01-07 09:00:00+00'
)
on conflict (id) do nothing;

insert into public.announcements (
  id, institution_id, title, body, publisher_user_id, state, published_at,
  created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000001',
  'Synthetic published announcement',
  'Synthetic published content for audience policy tests.',
  '00000000-0000-4000-8000-000000000204',
  'published',
  '2026-01-07 10:00:00+00',
  '2026-01-07 09:00:00+00',
  '2026-01-07 10:00:00+00'
)
on conflict (id) do nothing;

insert into public.announcement_departments (
  institution_id, announcement_id, department_id
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000101'
)
on conflict (institution_id, announcement_id, department_id) do nothing;

insert into public.opportunities (
  id, institution_id, title, type, description, publisher_user_id, state,
  opens_at, closes_at, instructions, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000001',
  'Synthetic training opportunity',
  'training',
  'Synthetic opportunity content for database tests only.',
  '00000000-0000-4000-8000-000000000204',
  'draft',
  '2026-02-01 00:00:00+00',
  '2026-03-01 00:00:00+00',
  'Synthetic instructions for tests only.',
  '2026-01-08 09:00:00+00',
  '2026-01-08 09:00:00+00'
)
on conflict (id) do nothing;

insert into public.opportunities (
  id, institution_id, title, type, description, publisher_user_id, state,
  opens_at, closes_at, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000802',
  '00000000-0000-4000-8000-000000000001',
  'Synthetic published training',
  'training',
  'Synthetic published opportunity for audience policy tests.',
  '00000000-0000-4000-8000-000000000204',
  'published',
  '2026-01-01 00:00:00+00',
  '2099-01-01 00:00:00+00',
  '2026-01-08 09:00:00+00',
  '2026-01-08 09:00:00+00'
)
on conflict (id) do nothing;

insert into public.opportunity_departments (
  institution_id, opportunity_id, department_id
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000802',
  '00000000-0000-4000-8000-000000000101'
)
on conflict (institution_id, opportunity_id, department_id) do nothing;

insert into public.audit_events (
  id, institution_id, actor_user_id, action, target_type, target_id,
  created_at, outcome, correlation_id
) values (
  '00000000-0000-4000-8000-000000000901',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000204',
  'synthetic_seed',
  'test_fixture',
  'synthetic-phase-two',
  '2026-01-08 09:00:00+00',
  'success',
  'synthetic-seed-v1'
)
on conflict (id) do nothing;

insert into public.permission_definitions (code, description) values
  ('SEC1', 'Create a request as an active user in the matching institution.'),
  ('SEC2', 'Read requests only as requester, assigned department manager, or explicit grantee.'),
  ('SEC3', 'Update or assign standard requests in a managed department.'),
  ('SEC4', 'Read or add request events for an authorized participant.'),
  ('SEC5', 'Private evidence access; disabled until storage/privacy approval.'),
  ('SEC6', 'Read scoped dashboard summaries; detail remains separately protected.'),
  ('SEC7', 'Read published, current announcements in the assigned audience.'),
  ('SEC8', 'Publish announcements only as an explicitly granted publisher.'),
  ('SEC9', 'Read published, current opportunities in the assigned audience.'),
  ('SEC10', 'Publish opportunities only as an explicitly granted publisher.'),
  ('SEC11', 'Manage institution configuration as a platform administrator.'),
  ('SEC12', 'Read institution audit events as an explicitly authorized reviewer.'),
  ('SEC13', 'Manage roles, permissions, and request access grants with audit.'),
  ('SEC14', 'Read own profile; profile writes remain denied.'),
  ('SEC15', 'Access data only within the institution in the verified JWT.')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (institution_id, role_code, permission_code)
select
  '00000000-0000-4000-8000-000000000001',
  grants.role_code,
  grants.permission_code
from (values
  ('employee', 'SEC1'),
  ('employee', 'SEC2'),
  ('employee', 'SEC4'),
  ('employee', 'SEC7'),
  ('employee', 'SEC9'),
  ('employee', 'SEC14'),
  ('department_manager', 'SEC2'),
  ('department_manager', 'SEC3'),
  ('department_manager', 'SEC4'),
  ('department_manager', 'SEC6'),
  ('department_manager', 'SEC7'),
  ('department_manager', 'SEC9'),
  ('department_manager', 'SEC14'),
  ('senior_leadership', 'SEC6'),
  ('senior_leadership', 'SEC2'),
  ('senior_leadership', 'SEC7'),
  ('senior_leadership', 'SEC9'),
  ('senior_leadership', 'SEC14'),
  ('platform_admin', 'SEC11'),
  ('platform_admin', 'SEC12'),
  ('platform_admin', 'SEC13'),
  ('platform_admin', 'SEC14')
) as grants(role_code, permission_code)
on conflict (institution_id, role_code, permission_code) do nothing;

insert into public.user_permissions (
  institution_id, user_id, permission_code, granted_by_user_id, granted_at
) values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000204',
    'SEC8',
    '00000000-0000-4000-8000-000000000204',
    '2026-01-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000204',
    'SEC10',
    '00000000-0000-4000-8000-000000000204',
    '2026-01-01 00:00:00+00'
  )
on conflict (institution_id, user_id, permission_code) do nothing;
