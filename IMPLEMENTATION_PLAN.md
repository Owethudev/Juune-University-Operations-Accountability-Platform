# IMPLEMENTATION_PLAN.md: Juune University Operations & Accountability Platform

## 0. Plan details

Field | Value
App name | Juune University Operations & Accountability Platform
Built from PRD version | v1.10 owner-directed update; PRD v1.1 and conditional implementation decisions approved
Screen designs | S1–S12 exports are in docs/designs; product-owner design sign-off confirmed 08 Nov 2026.
Plan version | v1.10
Repository | https://github.com/Owethudev/Juune-University-Operations-Accountability-Platform
Status | PRD v1.1 approved; Phase 1 decisions owner-approved; later-phase manual gates remain documented
Last updated | 08 Nov 2026

## 1. Start here (instructions for the coding agent)

Before writing any code:

1. Read this whole file from top to bottom.
2. Read docs/PRD.md.
3. Review the signed-off S1–S12 exports in docs/designs and the screen specifications in docs/PRD.md. Confirm the status of illustrative
content in Section 18 before implementing screen text, data or preference controls.
4. Check Section 18. If any clarification is still Open, stop and ask the human. Do not start.
5. Check that the prerequisites in Section 4.2 are installed.
6. Start Phase 1 only. Follow Section 2 at all times.

## 2. Rules for the coding agent (copy word for word, do not edit)

1. One phase at a time. Only work on the phase the human asked for. When that phase's Definition of Done is complete, stop and wait
for the human to say "Start Phase <number>".
2. Test-driven development (TDD) for every task. Follow the cycle in Section 12.1:
- Write the test.
- Run it and see it fail for the right reason.
- Write the smallest code that makes it pass.
- Run all tests.
- Refactor while all tests still pass.
3. Never cheat a test. Never delete, skip, weaken or change a test just to make it pass. If you believe a test is wrong, stop and explain
why to the human.
4. Never break earlier work. Every test from earlier phases must still pass before a phase is done.
5. Build only what is planned. Build only what is in this file and docs/PRD.md. Never build anything in Section 3.3 (Deferred).
6. Ask, don't guess. If anything is missing, unclear or contradictory, stop, add it to Section 18, and ask the human.
7. Match the designs. Every screen must match its design in Section 7.3: layout, order, labels, text, colours and spacing. Use the design
tokens in Section 7.1. Never hard-code colours, font sizes or spacing.
8. Every state, every screen. Each screen must handle every state listed for it in Section 7.3 (chosen from normal, empty, loading, error,
offline, success, plus any screen-specific states).

9. Exact wording. Use the exact labels and messages from the PRD. Never invent wording.
10. Security first.
- Never put secret keys in app code, logs, test files or Git.
- Every permission rule in Section 9 must be enforced on the server or database, never only in the app.
- Every permission rule must have a test.
11. Full check before "done". Run the full check command (Section 4.3) before saying a phase is done, then add a short summary of
the results to the Progress log (Section 17).
12. Record your progress. After each phase:
- tick the checkboxes for that phase in this file;
- add a row to the Progress log;
- commit using the commit message given in the phase.
13. No surprise libraries. Do not add, remove or upgrade any library or tool not listed in Section 4.1 without asking the human first.
14. Stuck rule. If the same problem is still failing after 3 attempts, stop and report:
- what you tried;
- the exact error;
- what you need from the human.
15. Clean code. Follow the folder structure in Section 5. Use the PRD's key terms (Section 3.4) for names in code. Keep files small and
focused.

## 3. Project summary and scope

3.1 Summary

Juune is a responsive web-based operational layer for university employees and management to submit, route, track and escalate
cross-department operational requests. It provides role-scoped dashboards, communications and history, announcements, internal
opportunities, configurable governance and an auditable record of important actions. The first pilot covers IT, Facilities/Maintenance and
Administration.

Platform: Responsive web application for desktop, tablet and phone browsers.

3.2 Features in scope

ID | Feature | Priority | Built in phase
F1 | Operational requests | Must | Phase 2
F2 | Request tracking and communication
history
Must | Phase 2

F3 | Recommended department routing | Must | Phase 2
F4 | Reminders, estimates and escalation Must | Phase 3
F5 | Department and leadership dashboards Must | Phase 4
F6 | Announcements and departmental
discussions
Must | Phase 5

F7 | Employee opportunities | Must | Phase 5
F8 | Configurable governance | Must | Phase 6

3.3 Deferred: do NOT build

• Replacement for the university LMS, HR, finance or specialist service-management tools.
• Student-facing request platform.
• Automatic fault-finding, staff discipline or misconduct determination when a request escalates.
• Guaranteed resolution times or automated performance of the receiving department’s work.

• Deep integrations during the standalone pilot.
• Immediate rollout to every university department or institution; pilot scope is IT, Facilities/Maintenance and Administration only unless
the pilot owner approves expansion.
• Opportunity application processing inside Juune unless separately approved; the MVP supports approved application/contact links or
instructions.
• Any feature, workflow, integration or role capability not supported by the approved PRD.

3.4 Key terms (use these names in code)

Term (PRD 1.6) | Name in code | Meaning
Request | Request / requests | Traceable operational issue or service enquiry
submitted by an employee.
Requester | requester / requesterId | Employee who submits or owns a request.
Receiving department | Department / departmentId | Department selected or recommended to handle a
request.
Dual-manager visibility | dualManagerRecipients | Notification to receiving department manager and
requester’s manager, where valid and permitted.
Escalation | EscalationEvent | Review notification to an appropriate higher authority
after a configured trigger; not a finding of fault.
Resolution estimate | estimateDays | Category-level estimate based on available institutional
historical data; not a guarantee.
Sensitive request | sensitiveRequest / sensitivity | Request whose category or evidence requires restricted
access.
Audit trail | AuditEvent | Timestamped record of important operational,
configuration and permission actions.
Institution / tenant | Institution / institutionId | University boundary separating users, requests and
configuration.
Request category | RequestCategory / requestCategories | Configured category with a default department and
sensitivity/evidence policy.
Request event | RequestEvent | Append-only history event associated with a request.

## 4. Tech stack, prerequisites and commands

4.1 Stack

The owner-approved stack is React + Vite, Node.js + Express, and Supabase (PostgreSQL). The owner also approved the TypeScript,
root npm-workspaces, Express-only Supabase client and PostgreSQL RLS proposals in Section 18. Version numbers and remaining
supporting tools are proposed baselines; project provisioning, trusted identity claims and migration details remain manual gates.

Layer | Tool | Version | Used for
Frontend | React + Vite | React 19.x / Vite 7.x proposed; verify
stable compatibility
Responsive browser application

Language | TypeScript | Version not specified in PRD – use
compatible stable release
Frontend types and safer API contracts;
backend language approved in Q24
Styling | Tailwind CSS | 4.x proposed | Design tokens and responsive styling
Routing / UI | React Router; accessible component
primitives as needed
React Router 7.x proposed | Client-side navigation and accessible UI

Backend | Node.js + Express | Node.js 22 LTS / Express 5.x proposed Versioned REST API and business
operations
Database | Supabase (PostgreSQL) | Platform selected by product owner; use the Express-only Supabase client and PostgreSQL RLS;
relational schema/migration details remain gated
Validation | Zod or Joi (choose one) | Not specified | Validate API body, params, query and
configuration
Server functions | Express services and background
workers/jobs
Not specified | Business rules, scheduled reminders and
email retry
Data fetching and caching | Not specified in PRD – requires
clarification
— | Select only if needed; do not add a library
without approval
Unit and component tests | Vitest + React Testing Library (proposed) Compatible stable versions | Unit logic and frontend components

Layer | Tool | Version | Used for
Database and permission tests | Supertest plus isolated hosted Supabase/PostgreSQL test database; project region and credentials
require manual approval/provisioning
— | API persistence, authorization and
tenant/department scope

Integration tests | Supertest | Proposed | Express routes and database integration
End-to-end tests | Playwright | Proposed | Critical browser journeys
Lint and type check | ESLint + TypeScript compiler | Compatible stable versions | Code quality and type checking
Build and hosting | Vite build; institution-approved frontend/API hosting and Supabase deployment
Hosting provider and versions not
specified
Release build and approved deployment

4.2 Prerequisites on the computer

n Node.js 22 LTS or institution-approved compatible Node.js version.
n npm compatible with the selected Node.js version.
n Git and access to the project repository.
n A supported code editor/IDE.
n Hosted Supabase development test project and isolated PostgreSQL database for Phase 1; provision only in an
institution-approved region with approved access/security configuration.
n Browser for responsive and accessibility checks.
n Playwright-supported browser installation for end-to-end tests.
n Institutional identity-provider test tenant/credentials before provider-specific integration; use a provider-neutral Phase 1 boundary.
n Approved transactional email test account/provider once OQ4 is answered.
n Approved private evidence-storage development location once OQ9 is answered.
n Institution-approved hosting and data-region details before deployment.
n Synthetic test users for Employee, Department manager, Senior leadership and Platform administrator roles.

4.3 Commands

Important: Exact commands cannot be confirmed until package scripts and the Supabase/PostgreSQL test setup are selected. The
following are recommended command names to implement in package.json; they are not existing verified commands. The approved
database test environment and required server-side environment variables must be available before database/integration tests and the
full check.

Purpose | Command
Install dependencies | npm install (from repository root; workspace setup to be confirmed)
Start the local backend | npm run dev:backend
Reset the database (migrations + seed data) | Implement npm run db:seed and a documented repeatable PostgreSQL migration/reset
script after the migration and access approach is approved
Start the app | npm run dev
Unit and component tests | npm run test:unit
Database and permission tests | npm run test:db
Integration tests | npm run test:integration
End-to-end tests | npm run test:e2e
Lint | npm run lint
Type check | npm run typecheck
Full check (run before every "done") | npm run check — must run lint, type check, unit/component, database/permission
and integration tests; exclude E2E only if browser runtime is not always available
Build for release | npm run build

## 5. Folder structure

The PRD provides this suggested structure. Add screen files under the relevant feature area; exact route filenames are implementation
details to settle during Phase 1. Do not invent a screen design where no design has been supplied.

juune/
frontend/
src/
app/ | app shell, providers and route definitions (S1–S12)
components/ | shared accessible components (Section 7.2)
features/
requests/ | F1, F2, F3, F4; S3, S4, S5
dashboards/ | F5; S2
announcements/ F6; S6
opportunities/ F7; S7
admin/ | F8; S9, S10
notifications/ | S8
profile/ | S11
auth/ | S1
services/ | API client and typed endpoint functions
hooks/ | reusable React hooks
types/ | shared frontend types
styles/ | Tailwind entry and design tokens
tests/ | frontend unit/component tests
backend/
src/
config/ | environment parsing and application config
middleware/ | auth, validation, authorization, rate limits, error handling
routes/ | versioned REST route definitions
controllers/ | thin HTTP adapters
services/ | business rules and orchestration
repositories/ | Supabase/PostgreSQL data access
models/ | schemas and indexes
jobs/ | reminders and notification retry jobs
notifications/ | in-app/email delivery
audit/ | audit event helpers
utils/ | shared safe utilities
tests/ | API, database, permission and integration tests
tests/
e2e/ | Playwright end-to-end tests
manual/ | phase checklists
docs/
PRD.md
IMPLEMENTATION_PLAN.md
security-and-privacy.md
runbooks/
.env.example
.gitignore
README.md
package.json

Screen-to-file mapping: S1 frontend/src/features/auth/; S2 features/dashboards/; S3–S5 features/requests/; S6
features/announcements/; S7 features/opportunities/; S8 features/notifications/; S9–S10 features/admin/;
S11 features/profile/; S12 app/ shared error handling. Each screen route and exact filename must be recorded in the route
registry during Phase 1.

Rule: a new folder may only be created if it is added to this section first.

## 6. Environment variables and secrets

The PRD lists the following variables. Some are conditional on the approved identity, storage and session approach. Do not create or
expose credentials until the relevant provider decisions are approved.

Name | What it is | Where to get it | Public or secret | Used by
VITE_API_BASE_URL | Frontend API base URL | Deployment configuration | Public | Frontend
SUPABASE_URL | Supabase project URL Supabase project settings Non-secret | Backend; frontend only if specifically approved
SUPABASE_ANON_KEY | Supabase public/anonymous API key | Supabase project settings | Public; server-side health check only | Backend only
SUPABASE_SERVICE_ROLE_KEY | Supabase service-role credential, only if required by the approved access approach Supabase project
settings Secret | Backend/scripts only; never frontend
AUTH_ISSUER_URL | Institutional identity issuer, if
applicable
Institution/identity provider | Server-side config; not
necessarily secret
Backend

AUTH_CLIENT_ID | Identity client identifier, if
required
Identity provider | Usually public; confirm provider App/backend as provider
requires
AUTH_CLIENT_SECRET | Identity client secret, if required Identity provider | Secret | Backend only
SESSION_SECRET /
TOKEN_SIGNING_KEY
Session/token signing if locally
managed
Secret manager | Secret | Backend only

EMAIL_PROVIDER_API_KEY Transactional email credential Approved email provider | Secret | Backend/jobs only
EMAIL_FROM_ADDRESS | Approved sender address | Institution/email provider | Public configuration | Backend
APP_BASE_URL | Public app URL used in links Deployment configuration | Public | Backend
NODE_ENV | Runtime mode | Deployment configuration | Non-secret | Backend
LOG_LEVEL | Logging verbosity | Deployment configuration | Non-secret | Backend

Name | What it is | Where to get it | Public or secret | Used by
UPLOAD_STORAGE_BUCKET /
UPLOAD_STORAGE_URL
Private evidence storage
location
Approved storage provider | Server configuration | Backend

UPLOAD_STORAGE_KEY | Storage access credential if
applicable
Storage provider | Secret | Backend only

RATE_LIMIT_WINDOW_MS Rate-limit window | Approved implementation
configuration
Non-secret | Backend

RATE_LIMIT_MAX | Rate limit per window | Approved implementation
configuration
Non-secret | Backend

.env.example (committed to Git, placeholder values only):
VITE_API_BASE_URL=http://localhost:4000/api/v1
SUPABASE_URL=https://replace-with-approved-project.supabase.co
SUPABASE_ANON_KEY=replace-with-public-anon-key
# Add only if required by the approved access approach; never expose to frontend.
SUPABASE_SERVICE_ROLE_KEY=replace-with-secret
AUTH_ISSUER_URL=replace-with-approved-issuer
AUTH_CLIENT_ID=replace-with-approved-client-id
AUTH_CLIENT_SECRET=replace-with-secret
SESSION_SECRET=replace-with-long-random-secret
TOKEN_SIGNING_KEY=replace-with-long-random-key
EMAIL_PROVIDER_API_KEY=replace-with-secret
EMAIL_FROM_ADDRESS=no-reply@example.invalid
APP_BASE_URL=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
UPLOAD_STORAGE_BUCKET=replace-with-private-bucket
UPLOAD_STORAGE_URL=replace-with-private-storage-url
UPLOAD_STORAGE_KEY=replace-with-secret
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=replace-with-approved-limit

Rules:

• Real values go in .env, which is listed in .gitignore and never committed.
• Secret values are never used in app code. They are used only in backend services, jobs, scripts or integration tests, read from
environment/secret management.
• VITE_ variables are public and must never contain secrets.
• If a new variable is needed, add it here and to .env.example first.
• Do not assume local credentials or a specific identity protocol; OQ1 must be answered before authentication integration.

## 7. Design system and screens

7.1 Design tokens

These are proposed PRD values, not approved final design decisions. Verify contrast for every foreground/background pairing before
design sign-off. Use tokens from one shared theme file; do not hard-code values in screens.

Token | Value | From PRD
color.primaryNavy | #18324B | 9.1 Primary navy
color.primaryBlue | #2F6690 | 9.1 Primary blue
color.accentTeal | #3A7D7A | 9.1 Accent teal
color.background | #F7F9FB | 9.1 Page background
color.surface | #FFFFFF | 9.1 Surface
color.border | #D8E0E7 | 9.1 Border
color.text | #17212B | 9.1 Body text
color.mutedText | #5B6570 | 9.1 Muted text; contrast must be checked
color.error | #9B2C2C | 9.1 Danger
font.family | System UI sans-serif | 9.1
font.size.h1 | 28 px desktop / 24 px mobile, weight not specified | 9.1 H1
font.size.h2 | 20 px, weight not specified | 9.1 H2
font.size.body | 16 px minimum, line-height 1.5 | 9.1 Body
font.size.small | 12 px minimum | 9.1 Small text

Token | Value | From PRD
space.1–space.8 | 4, 8, 12, 16, 24, 32, 40, 48 px | 9.1 Spacing scale
radius.card | 8 px | 9.1 Card radius
radius.modal | 12 px | 9.1 Modal radius
size.contentMax | 1200 px | 9.1 Content width
size.readingMax | 760 px | 9.1 Long-form reading width
size.controlMinHeight | 44 px | 9.1 Control height
size.touchMin | 44 × 44 px where practical | 9.4 Accessibility

7.2 Shared components

Component | File | Variants and states | Used on | Tests
Responsive top bar | components/ResponsiveTop
Bar.tsx
Desktop/mobile; title, notification
indicator, profile
S2–S11 | T-C-1

Role-aware navigation | components/RoleNavigatio
n.tsx
Links filtered by role; backend
remains authoritative
S2–S11 | T-C-2

Request status badge | components/RequestStatus
Badge.tsx
Text + icon/shape; never colour
alone
S2–S5, S8 | T-C-3

Timeline item | components/TimelineItem.
tsx
Event type, permitted actor,
timestamp, message/evidence
reference
S4 | T-C-4

Notification toast | components/NotificationT
oast.tsx
Success/error; persistent errors
also inline
All screens | T-C-5

Empty-state panel | components/EmptyStatePan
el.tsx
Message and useful next action Lists/dashboards | T-C-6

Confirmation modal | components/ConfirmationM
odal.tsx
Cancel/confirm;
irreversible/high-impact actions
S4, S6, S7, S9 | T-C-7

Offline banner | components/OfflineBanner
.tsx
Fixed offline message; no false
save claim
All data screens | T-C-8

Form field / validation | components/FormField.tsx Label, hint, error association and
accessible announcement
S1, S5, S6, S7, S9, S11 | T-C-9

Loading skeleton | components/LoadingState.
tsx
Labelled skeleton/progress All applicable screens | T-C-10

7.3 Screens

Design files were not included. Each row therefore identifies the PRD design specification; approved Stitch/exported designs must be
supplied before pixel-level implementation. "Tab bar" is not defined in the PRD; navigation is role-aware and responsive, so no tab bar is
assumed.

ID | Screen | Route / file | Design | Who can open it
(else redirect to)
Tab bar | Required states Phase

S1 | Sign in | /sign-in, featu
res/auth/SignI
nPage.tsx
PRD 8.3 S1; final
design missing
Logged out;
authenticated user
→ S2
No | Normal, Loading,
Error, Offline,
Success
1

S2 | Home / role
dashboard
/, features/das
hboards/HomePa
ge.tsx
PRD 8.3 S2; final
design missing
All authenticated
roles; logged out
→ S1
No | Normal, Empty,
Loading, Error,
Offline, Success
1 shell; Phase 4
dashboard data

S3 | My Requests /
Request Queue
/requests, feat
ures/requests/
RequestQueuePa
ge.tsx

PRD 8.3 S3; final
design missing
Employee/manage
r/leadership within
scope; else S12
No | Normal, Empty,
Loading, Error,
Offline, Success
2

S4 | Request Detail /requests/:req
uestId, feature
s/requests/Req
uestDetailPage
.tsx

PRD 8.3 S4; final
design missing
Authorised request
participants; else
S12
No | Normal, empty
history, Loading,
Error, Offline,
Success, Access
denied

2

S5 | New Request /requests/new,
features/reque
sts/NewRequest
Page.tsx

PRD 8.3 S5; final
design missing
Employee; other
roles only if policy
permits acting for
staff; else S12

No | Normal, Loading,
Error, Offline,
Success
2

S6 | Announcements /announcements
, features/anno
uncements/Anno
uncementsPage.
tsx

PRD 8.3 S6; final
design missing
Authenticated staff;
publishing actions
permission-gated;
else S12

No | Normal, Empty,
Loading, Error,
Offline, Success
5

ID | Screen | Route / file | Design | Who can open it
(else redirect to)
Tab bar | Required states Phase

S7 | Opportunities | /opportunities
, features/oppo
rtunities/Oppo
rtunitiesPage.
tsx

PRD 8.3 S7; final
design missing
Authenticated staff
subject to
audience; else S12
No | Normal, Empty,
Loading, Error,
Offline, Success
5

S8 | Notifications | /notifications
, features/noti
fications/Noti
ficationsPage.
tsx

PRD 8.3 S8; final
design missing
Authenticated staff;
logged out → S1
No | Normal, Empty,
Loading, Error,
Offline, Success,
Access denied for
revoked related
item

3

S9 | Admin Console /
Configuration
/admin, feature
s/admin/AdminC
onsolePage.tsx
PRD 8.3 S9; final
design missing
Platform
administrator only;
others → S12
No | Normal, Empty,
Loading, Error,
Offline, Success
6

S10 | Audit Log | /admin/audit, f
eatures/admin/
AuditLogPage.t
sx

PRD 8.3 S10; final
design missing
Authorised adminis
trator/security
reviewer; others →
S12

No | Normal, Empty,
Loading, Error,
Offline, Access
denied

6

S11 | Profile & Settings /profile, featu
res/profile/Pr
ofilePage.tsx
PRD 8.3 S11; final
design missing
Authenticated staff;
logged out → S1
No | Normal, Loading,
Error, Offline,
Success
1 shell

S12 | Access Denied /
Error
/access-denied
and shared safe
error route, app/A
ccessErrorPage
.tsx

PRD 8.3 S12; final
design missing
Any user when
needed
No | Normal, Loading
for retry, Error,
Offline, Success
1

Shared state copy: Offline: “You’re offline. Reconnect to load the latest information.” Access denied: “You don’t have permission to view
this item.” S1 sign-in error: “We couldn’t sign you in. Check your institutional account or contact your university support team.” S2
dashboard error: “We couldn’t load your dashboard. Try again.” S3 empty: “No requests match these filters.” S5 success: “Request
submitted.” S6 empty: “There are no announcements for this audience yet.” S7 empty: “No opportunities are available right now.” S8
empty: “You’re all caught up.” S9 success: “Settings saved.” S10 empty: “No audit events match these filters.” S11 success: “Preferences
saved.”

## 8. Data model and database

Database: Supabase (PostgreSQL), selected by the product owner on 08 Nov 2026. The entity fields below are the logical data
requirements carried forward from the earlier MongoDB-based draft; MongoDB collections/ObjectIds are not implementation instructions.
Map the logical entities to PostgreSQL tables, keys, constraints and indexes after the schema and trusted identity-claim mapping are
approved. Apply the owner-approved PostgreSQL RLS and Express authorization approach; enforce institution scoping on every read
and write.

8.1 Tables

Create PostgreSQL tables corresponding to the following logical entities after the relational mapping is approved.

Logical entity: institutions — one university tenant/configuration boundary.

Field | Type | Required? | Default | Constraints / notes
id | Relational primary key | Yes | generation strategy to be confirmed | Primary identifier
name | string (max 160) | Yes | — | Official display name supplied
by institution
timezone | string (max 80) | Yes | Africa/Johannesburg
proposed
Confirm institution timezone

configuration | validated object | No | — | No secrets in this object
status | enum | Yes | pilot | setup, pilot, active, suspended
createdAt, updatedAt | date | Yes | now | Store UTC

Logical entity: users — institutional staff account.

Field | Type | Required? | Default | Constraints / notes
id | Relational primary key | Yes | generation strategy to be confirmed | Immutable
institutionId | reference | Yes | assigned | Must match active tenant

Field | Type | Required? | Default | Constraints / notes
institutionalId | string (max 120) | Yes | — | Unique within institution; not
assumed to be a national ID
name | string (max 120) | Yes | — | Display name
email | email | Yes | identity source | Unique within institution;
verified/managed by identity
source
departmentId | reference | No | — | Must be active if assigned
roleIds | role/reference array | Yes | Employee | Only admin-authorised
assignment
status | enum | Yes | invited/active | invited, active, suspended,
deactivated
createdAt, updatedAt | date | Yes | now | Store UTC

Logical entity: departments — department within an institution.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
institutionId | reference | Yes | assigned | Tenant scope
name | string (max 120) | Yes | — | Unique active name per
institution proposed
type | enum | Yes | configured | IT, Facilities/Maintenance,
Administration, Other
managerUserIds | user references | No | — | Active users with manager
permission
status | enum | Yes | active | active, inactive; cannot
deactivate with open requests
unless reassigned
createdAt, updatedAt | date | Yes | now | UTC

Logical entity: requests — operational request.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
reference | string (max 30) | Yes | generated | Unique; human-readable format
requires confirmation
institutionId | reference | Yes | assigned | Tenant scope
requesterId | user reference | Yes | current user | Active user at submission
categoryId | category reference | Yes | selected | Active category required
departmentId | department reference | Yes | confirmed destination | Active destination required
assignedToUserId | user reference | No | — | Must be permitted in receiving
department
summary | string (max 120) | Yes | — | Proposed 5–120 characters
description | string (max 5000) | Yes | — | Proposed 10–5000 characters;
sensitive-data warning
status | enum | Yes | submitted | Submitted, Acknowledged, In
progress, Waiting for requester,
On hold, Resolved, Closed,
Reopened
sensitivity | enum | Yes | category default | standard, restricted
estimateDays | decimal | No | — | Only when historical estimate
passes approved quality
threshold
lackOfAssistanceFlags integer | Yes | 0 | Atomic increment; third flag
triggers escalation
createdAt, updatedAt | date | Yes | now | UTC; display institution
timezone
resolvedAt, closedAt | date | No | — | Set on valid transitions

Logical entity: requestCategories — configured category and routing default.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier

Field | Type | Required? | Default | Constraints / notes
institutionId | reference | Yes | assigned | Tenant scope
name | string (max 120) | Yes | — | Unique active name per
institution
description | string (max 1000) | No | — | Plain text
defaultDepartmentId | department reference | Yes | configured | Active department
sensitivityDefault | enum | Yes | standard | standard or restricted
evidencePolicy | string (max 1000) | No | — | Approved file types/size/visibility
policy
active | boolean | Yes | true | Inactive categories unavailable
for new requests; retain history

Logical entity: requestEvents — immutable request history event.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
requestId | request reference | Yes | assigned | Parent request
actorUserId | user reference/null | No | user or system | Null only for system event;
record system actor type
eventType | enum | Yes | — | created, status_changed,
assigned, response, flag,
escalation, evidence_added,
reopened, closed
message | string (max 5000) | No | — | Do not expose hidden content to
unauthorised readers
metadata | safe structured object | No | — | Whitelist fields; never secrets
createdAt | date | Yes | now | UTC, append-only

Logical entity: notifications — user notification delivery record.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
recipientUserId | user reference | Yes | assigned | Recipient
eventType | enum/string | Yes | — | Configured notification type
relatedEntityType,
relatedEntityId
type + ID | No | — | Re-check permission when
opened
channel | enum | Yes | in_app | in_app, email
status | enum | Yes | pending | pending, sent, failed, read
dedupeKey | string (max 200) | No | generated | Unique per scheduled
event/recipient/channel
createdAt, sentAt, readAt date | Yes/No | now/none | UTC timestamps

Logical entity: announcements — published institutional or departmental update.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
institutionId | reference | Yes | assigned | Tenant scope
title | string (max 160) | Yes | — | Plain text
body | string (max 10000) | Yes | — | Sanitize rich text if supported
audienceDepartmentIds department references | No | institution-wide only if approved Validate audience permission
publisherUserId | user reference | Yes | current user | Must have publish permission
state | enum | Yes | draft | draft, published, unpublished,
expired
publishedAt, expiresAt date | No | — | UTC

Logical entity: opportunities — internal vacancy/training/development listing.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier

Field | Type | Required? | Default | Constraints / notes
institutionId | reference | Yes | assigned | Tenant scope
title | string (max 160) | Yes | — | —
type | enum | Yes | — | vacancy, promotion, temporary
assignment, training,
professional development
description | string (max 10000) | Yes | — | Plain text or sanitised rich text
audienceDepartmentIds department references | No | configured | Audience policy
publisherUserId | user reference | Yes | current user | Must have publish permission
state | enum | Yes | draft | draft, published, unpublished,
expired
opensAt, closesAt | date | No | — | Validate date ordering
applicationUrl,
instructions
URL/string | No | — | Approved safe URL or
instructions

Logical entity: auditEvents — append-only security/configuration audit record.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
institutionId | reference | Yes | assigned | Tenant scope
actorUserId | user reference/null | No | system actor possible | Record actor type
action | string (max 120) | Yes | — | Assignment, response,
escalation,
permission/configuration
change, access event
targetType, targetId | string + ID | Yes | — | No sensitive body content by
default
timestamp | date | Yes | now | UTC, append-only
outcome | enum | Yes | success | success, denied, failed
correlationId | string (max 120) | No | generated | Trace related server events

Logical entity: escalationEvents — threshold-triggered review event.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
requestId | request reference | Yes | assigned | Related request
trigger | enum | Yes | third_flag | third_flag or approved future
trigger
flagCountAtTrigger | integer | Yes | 3 | Must meet configured threshold
authorityUserIds | user references | Yes | configured | Explicitly authorised recipients
status | enum | Yes | open | open, under_review,
action_recorded, closed
createdAt, reviewedAt date | Yes/No | now/none | UTC

Logical entity: attachments — evidence attached to a request.

Field | Type | Required? | Default | Constraints / notes
_id | ID | Yes | generated | Primary identifier
requestId | request reference | Yes | assigned | Related request
uploadedByUserId | user reference | Yes | current user | Must have request access
storageKey | string (max 500) | Yes | generated | Private storage reference; never
public
fileName | string (max 255) | Yes | sanitised original | Do not trust extension
mimeType | string (max 120) | Yes | detected | Allowlist and content validation
sizeBytes | integer | Yes | detected | Maximum to be configured
sensitivity | enum | Yes | inherited | At least as restrictive as request
createdAt | date | Yes | now | UTC

8.2 Relationships and delete behaviour

• Institution 1-to-many Users, Departments, RequestCategories, Requests, Announcements, Opportunities and AuditEvents.
• User 1-to-many Requests as requester; users may manage departments and receive Notifications.
• Department 1-to-many Requests and categories; department managers are Users.
• Request 1-to-many RequestEvents, Attachments and EscalationEvents.
• RequestCategory 1-to-many Requests and one configured default department.
• Notification references a recipient and optionally a related entity; opening a link always re-checks authorization.
• Block deletion of referenced institutions, departments/categories with active references, and any deletion that would erase required
request/audit history. Exact retention and deletion policy requires OQ10.
• Department deactivation with open requests must be blocked or require reassignment (EC1).
• Deactivated users cannot authenticate; retain audit history and records under approved retention policy.

8.3 Status changes

Collection.field | From | To | Triggered by | Enforced by
requests.status | New request | submitted | Employee submits | Request service; initial status
requests.status | submitted | acknowledged | Receiving department confirms
receipt
Approved transition map;
actor/time event
requests.status | acknowledged | in_progress | Responsible department starts
work
Approved transition map

requests.status | Active status | waiting_for_requester More information/action required Approved transition map
requests.status | Active status | on_hold | Work paused with reason | Approved transition map; reason
list requires configuration
requests.status | Active status | resolved | Department reports addressed Closure/confirmation policy
open (OQ8)
requests.status | resolved | closed | Authorised closure action | Institution closure policy (OQ8)
requests.status | resolved or closed | reopened | Permitted reopening action Reopen policy and reason
(OQ8)
escalationEvents.status open | under_review /
action_recorded / closed
Authorised reviewer | Escalation review workflow;
does not replace request status

Escalation is preferably represented as a separate event and must not automatically replace the operational request status (BR8). Every
status change records actor, timestamp and reason where applicable.

8.4 Indexes

Create and verify indexes corresponding to the PRD recommendations:

• requests: { institutionId: 1, status: 1, updatedAt: -1 }
• requests: { requesterId: 1, createdAt: -1 }
• requests: { departmentId: 1, status: 1, updatedAt: -1 }
• requestEvents: { requestId: 1, createdAt: 1 }
• notifications: { recipientUserId: 1, status: 1, createdAt: -1 }
• auditEvents: { institutionId: 1, timestamp: -1 }
• Unique institution-scoped user email and institutional ID indexes.
• Unique notification dedupeKey index where applicable.
• Add indexes for additional filters only after query patterns are confirmed and measured.

8.5 Automatic jobs and triggers

Name | Runs when | What it does | BR# | Test
Reminder scheduler | Configured schedule; cadence
unresolved
Finds reminders due under
institution policy and creates
deduplicated in-app/email
notifications

BR9 | T-BR9-1, T-EDGE-11

Notification retry worker | Failed/pending email delivery Retries safely; records delivery
status; never rolls back saved
request
BR4, BR9 | T-EDGE-4

Escalation threshold service Requester flags lack of
assistance
Atomically increments count; at
third flag creates exactly one
escalation event and notifies
configured authority

BR7, BR8 | T-012, T-EDGE-5

Content expiry processor | At/after configured
expiry/closing date or on read
Ensures expired/unpublished
announcements and
opportunities are not shown as
current

BR12 | T-019, T-021, T-EDGE-12

Audit event writer | Relevant
action/permission/configuration
change
Writes append-only
actor/time/action/target/outcome
record
BR11 | T-BR11-1

Exact scheduler frequency, retry schedule and reminder thresholds are not specified and remain open (OQ5).

8.6 Migrations (in order)

Use versioned, repeatable PostgreSQL migration scripts after Q26 and the relational schema are approved. Suggested logical order:

1. 001_create_institution_and_user_indexes: institutions, users, roles and tenant-scoped unique indexes.
2. 002_create_departments_and_categories: departments and request categories, including pilot configuration.
3. 003_create_requests_and_history: requests, request events and status indexes.
4. 004_create_notifications_and_audit: notifications and audit events.
5. 005_create_content_tables: announcements and opportunities.
6. 006_create_escalation_and_attachments: escalation events and attachment metadata/indexes.
7. Subsequent changes must be versioned and reversible where practical; document data backfills and backup requirements.

8.7 Seed data and test accounts

• Seed file: backend/src/scripts/seed.ts (proposed path; confirm in Phase 1). Load synthetic data only: IT,
Facilities/Maintenance and Administration; sample categories; example users for all four roles; requests across status values; one
sample announcement; one sample opportunity; and test audit events.
• Test accounts: One synthetic test identity per Employee, Department manager, Senior leadership and Platform administrator role.
Email/password values and test identity-provider mechanism are not specified in the PRD; generate through a controlled seed script or
test identity provider. Never place credentials in this plan, source control or logs.
• Use synthetic South African names and non-real institution data. Institution branding, user labels and sample records require
pilot-owner approval.

## 9. Security and permissions

Every authorization decision must be enforced on the server/API and, where applicable, in data access. Hiding a frontend control is not
authorization. Sensitive access and permission changes must be audited.

ID | Table / resource | Action | Who is allowed | Rule | Enforced by | Tests (allow / deny)
SEC1 | Requests | Create | Employee;
manager/leadership
only if explicitly
permitted

Authenticated active
user; institution scope;
required fields;
permitted destination

Auth middleware +
request service
T-SEC-1a / T-SEC-1b

ID | Table / resource | Action | Who is allowed | Rule | Enforced by | Tests (allow / deny)
SEC2 | Requests | Read | Requester, assigned
department
participants,
leadership/others with
explicit grant

Ownership,
department, institution
and sensitivity scope
Request authorization
service
T-SEC-2a / T-SEC-2b

SEC3 | Requests | Update status/assign Department manager
within assigned
department and action
permission; employee
only own
response/flag

No cross-department
action without explicit
grant
Authorization service T-SEC-3a / T-SEC-3b

SEC4 | Request
events/responses
Read/create | Authorised request
participants
Communication/histor
y visibility follows
request and sensitivity
permission

Request service | T-SEC-4a / T-SEC-4b

SEC5 | Attachments/evidence Read/download/uploa
d
Explicitly authorised
request participants
Category sensitivity
applies;
download/export
checked; private
storage only

Attachment service +
private storage access
T-SEC-5a / T-SEC-5b

SEC6 | Dashboards | Read | Manager within
assigned department;
senior leadership
institution summaries

Sensitive details
remain restricted
unless explicit grant
Dashboard service T-SEC-6a / T-SEC-6b

SEC7 | Announcements | Read | Authenticated users
within audience
Only published,
unexpired content for
permitted audience
Content service | T-SEC-7a / T-SEC-7b

SEC8 | Announcements | Publish/edit | Users with publish
permission
Server denies
unauthorized UI/API
actions; action audited
Permission
middleware + audit
service
T-SEC-8a / T-SEC-8b

SEC9 | Opportunities | Read | Authenticated users
within audience
Published/current
content only
Content service | T-SEC-9a / T-SEC-9b

SEC10 | Opportunities | Publish/edit | Users with publish
permission
Server denies
unauthorized actions;
action audited
Permission
middleware + audit
service
T-SEC-10a /
T-SEC-10b

SEC11 | Configuration | Create/update/delete Platform administrator
only
Validate references;
prevent invalid routing
and removal of final
active administrator

Admin authorization +
configuration service
T-SEC-11a /
T-SEC-11b

SEC12 | Audit log | Read | Authorised
administrator/security
reviewer
Explicit grant; never
expose secrets or
unnecessary personal
data

Audit authorization
service
T-SEC-12a /
T-SEC-12b

SEC13 | Roles/permissions Change | Platform administrator
only
Elevated server-side
permission; changes
audited
Admin authorization +
audit service
T-SEC-13a /
T-SEC-13b

SEC14 | User profile/role | Update | User may update only
approved
preferences;
administrator controls
role/department
assignment

User cannot
self-assign role or
department
Profile/admin services T-SEC-14a /
T-SEC-14b

SEC15 | All tenant resources Read/write | Authenticated users
with valid institution
scope
Never cross institution
boundary
Tenant-scope
middleware and
repository filters
T-SEC-15a /
T-SEC-15b

Always-on security checks (tested in the hardening phase):

n Every API resource and database access path applies institution, role, ownership, department and sensitivity checks as applicable;
automated tests fail if a route lacks authorization.
n Input is checked in the app and on the server; server validation is authoritative.
n Rate limits are enforced on authentication and abuse-sensitive operations. Exact limits are not specified; OQ5 covers
reminder/escalation policy and rate-limit values require security-owner approval.
n File uploads check type and size before upload and again on the server; exact allowlist, maximum size and malware scanning policy
are open (OQ9).
n No passwords, tokens, full sensitive content or unnecessary personal data are written to logs.
n Secrets are environment/secret-manager only; repository secret scan and history scan find no committed keys.
n Evidence storage is private; use short-lived permission-checked access links if object storage is selected.

n HTTPS is mandatory in deployed environments; secure cookies/session handling as applicable.
n Protect against injection, XSS, CSRF where applicable, broken access control and brute-force attempts.
n Access denials are logged safely without disclosing restricted record existence.
n POPIA notice, retention, data-subject process and incident contacts are approved before real staff data is used.

## 10. Backend operations

The PRD specifies behaviours and API architecture but does not define exact endpoint paths or exact error text for every operation.
Endpoint names below are proposed logical operation names; confirm REST route naming during Phase 1. Use a versioned REST API
and validate every request at the API boundary.

ID | Operation | Who can call it Input | Output | Rules | Errors (exact
message)
Built as | Tests

OP1 | Create request Employee;
others only if
policy permits
category,
destination,
summary,
description,
permitted
evidence
metadata

Request
ID/reference,
timestamp,
submitted status

BR1–BR4,
SEC1
“Please check
the highlighted
fields and try
again.”; field
messages from
S5

Express route →
controller →
request service/r
epository

T-001–T-003

OP2 | Get request list Authenticated
user within
scope
search, status/c
ategory/departm
ent/date filters,
pagination

Paginated
permitted
request
summaries

SEC2; scope
every query
“We couldn’t
load requests.
Try again.”
REST read +
repository filters
T-004,
T-014–T-016

OP3 | Get request
detail/history
Authorised
participant
request ID | Current status,
assigned
parties,
permitted
chronological
history, estimate
if reliable,
evidence
references

BR3, BR5,
SEC2, SEC4,
SEC5
“You don’t have
permission to
view this item.”
REST read +
request
authorization
service

T-004–T-006,
T-005

OP4 | Recommend
destination
Authenticated
user creating
request
category ID Configured
recommended
department or
no-match
response

BR2; active
routing config
No invented
exact message;
follow S5
guidance for
manual destinati
on/configuration

Routing service T-007–T-009

OP5 | Correct
destination
before submit
Request creator category,
permitted
alternate
department

Confirmed
destination
BR2; active
permitted
department
“Choose a
destination
department.”
Request
form/service
validation
T-008

OP6 | Add response Authorised
request
participant
request ID,
response text,
optional
permitted
evidence

Request event
and updated
timeline
BR3, BR5,
BR11, SEC4/5
“Please check
the highlighted
fields and try
again.”

Request event
service
T-006

OP7 | Change request
status
Receiving
department man
ager/authorised
actor

request ID,
target status,
reason if
required

Updated request
and status event
BR3, BR10,
BR11; OQ8
transitions
Exact transition-
specific wording
not specified;
use safe
validation error

Status transition
service
T-006,
T-EDGE-10

OP8 | Assign request Department
manager within
assigned
department

request ID,
permitted owner
ID
Updated
assignment,
history and audit
event

BR4, BR10,
BR11
Safe validation
message; exact
wording not
specified

Assignment
service
T-BR11-1,
T-SEC-3

OP9 | Flag lack of
assistance
Requester for
same request
request ID,
confirmation
Updated flag
count; escalation
event only at
threshold

BR7–BR8;
atomic
increment; one
escalation only

Exact message
not specified
Atomic request
update +
escalation
service

T-012,
T-EDGE-5

OP10 | Calculate
category
estimate
Authorised
request
view/dashboard
category and
eligible historical
data
Estimate or
unavailable state
BR6; quality
threshold OQ6
“A reliable
resolution
estimate isn’t
available for this
category yet.”

Estimate service T-010, T-011

OP11 | Create reminder
notifications
Scheduled
worker
due request and
policy
Deduplicated
in-app/email
notification
records

BR9; dedupe
scheduled event
“Your request
was saved, but
one or more
notifications
could not be
sent yet.” where
applicable

Background job
+ notification
service
T-013,
T-EDGE-11

ID | Operation | Who can call it Input | Output | Rules | Errors (exact
message)
Built as | Tests

OP12 | Deliver/retry
notification
Worker | notification
record, channel
sent/failed state
and delivery
metadata
BR4, BR9;
idempotent retry
“Notification
delivery failed”
safe state;
detailed provider
errors not
exposed

Notification
adapter/worker
T-EDGE-4

OP13 | Get role
dashboard
Authenticated
manager/leader
date/status/depa
rtment filters
Role-scoped
counts, lists and
trends
BR10, SEC6;
suppress
sensitive details
“We couldn’t
load your
dashboard. Try
again.”

Dashboard
service
T-014–T-016

OP14 | Publish/update
announcement
User with
publish
permission
title, body,
audience, state,
optional expiry
Announcement
and
publisher/time
BR12; SEC8 Exact field limits/
configuration not
specified
Content service
+ audit event
T-017–T-019

OP15 | List/read
announcements
Authenticated
staff
audience/filter/p
agination
Published,
unexpired
permitted
content

BR12, SEC7 “There are no
announcements
for this audience
yet.”

Content read
service
T-019

OP16 | Publish/update
opportunity
User with
opportunity
publish
permission

title, type,
description,
audience, dates,
application
instructions/link

Opportunity
record
BR12; SEC10;
approved safe
links
Exact field errors
not specified
Content service
+ audit event
T-020–T-022

OP17 | List/read
opportunities
Authenticated
staff
type/department
/closing-date
filters
Current
published
opportunities
BR12, SEC9 “No
opportunities are
available right
now.”

Content read
service
T-020–T-022,
T-EDGE-12

OP18 | Manage
configuration
Platform
administrator
departments,
roles,
categories,
routing,
workflows, escal
ation/access
configuration

Validated saved
configuration
and audit event
BR13–BR14,
SEC11/13
Explain invalid r
eference/final-ad
min restriction;
exact text not
specified

Admin service +
audit event
T-023–T-025

OP19 | Read audit log Authorised admi
nistrator/security
reviewer
date, actor,
action, target
filters
Read-only
permitted audit
events
BR11, SEC12 Safe
access-denied
response
Audit service T-SEC-12

OP20 | Read own profile; preference updates disabled in Phase 1
Authenticated user
Own profile
Own profile; sign-out clears session; no update fields configured
SEC14 | Generic denial for unsupported profile changes; “Preferences saved.” reserved until fields are approved
Profile service / identity provider boundary
T-NAV-1; T-OP20-1; T-SEC-14a/b

OP21 | Upload/downloa
d evidence
Authorised
request
participant
file, request ID Private
attachment
metadata /
short-lived
access

BR5, SEC5,
EC7
“This file can’t
be uploaded.
Check the
permitted file
type and size.”

Private storage
adapter +
attachment
service

T-EDGE-7,
T-SEC-5

## 11. Navigation rules

• Logged out: can only open S1. Any protected route → S1 or safe S12 response; do not reveal record existence.
• Logged in: opening S1 → S2.
• Role scope: S2 navigation is role-aware. Backend authorization remains mandatory for direct URLs/API calls.
• S3: employees see their own/explicitly authorised requests; managers see assigned department scope; leadership sees permitted
institution-level summaries and only explicitly authorised details.
• S4: only authorised request participants/roles; access revoked while open must be rechecked on every server action (EC9).
• S5: employee access; other roles only if institution policy permits acting for staff.
• S6/S7: authenticated staff subject to audience; publishing controls appear only for authorised publishers.
• S8: authenticated staff; opening a related item always rechecks permission.
• S9: Platform administrator only.
• S10: authorised administrator/security reviewer only.
• S11: authenticated staff; role/department are not self-editable. Sign-out clears local session and returns to S1.
• S12: safe recovery route; never confirm whether a restricted record exists.
• Tabs: No tab bar is specified in the PRD. Use role-aware responsive navigation; do not add a tab bar without approved design.

• Back button: Exact browser-history/back behaviour is not specified. Preserve safe browser navigation; modal cancel/close returns to
the prior screen state. Confirm final behaviour with approved designs.
• Navigation map: the PRD provides a tabular navigation map, not a Mermaid diagram. The graph below is a faithful representation of
those entry points.
flowchart TD
S1[ S1 Sign in ] -->|authenticated| S2[ S2 Home / role dashboard ]
S2 --> S3[ S3 My Requests / Request Queue ]
S2 --> S5[ S5 New Request ]
S2 --> S6[ S6 Announcements ]
S2 --> S7[ S7 Opportunities ]
S2 --> S8[ S8 Notifications ]
S2 --> S9[ S9 Admin Console / Configuration ]
S2 --> S11[ S11 Profile & Settings ]
S3 --> S4[ S4 Request Detail ]
S3 --> S5
S8 --> S4
S6 --> S6A[ Announcement detail / discussion ]
S7 --> S7A[ Opportunity detail ]
S9 --> S10[ S10 Audit Log ]
S9 --> S9A[ Configuration detail ]
S4 --> S3
S11 -->|sign out| S1
S12[ S12 Access Denied / Error ] -. safe recovery .-> S2

## 12. Testing strategy

12.1 The TDD cycle (every task, every phase)

1. Red: write one test for the behaviour, using the acceptance criterion or rule. Run it. It must fail, and fail for the expected reason (e.g.
"screen not found", not "syntax error").
2. Green: write the smallest amount of code that makes that test pass. Run all tests.
3. Refactor: clean up names, remove duplication, move code to the right folder. Run all tests again. They must still pass.
4. Repeat for the next test.

12.2 Test levels

Level | What it proves | Tool | Folder | Command
Unit | Business rules, validation,
routing and status transitions
Vitest (proposed) | backend/tests/unit/ and f
rontend/src/**/__tests__
/
npm run test:unit

Component | Components/screens show
correct content and states with
fake data
Vitest + React Testing Library supabase/ versioned health-check/database migration SQL; apply only to the approved test project
frontend/src/**/__tests_
_/
npm run test:unit

Database and permissions | PostgreSQL constraints/indexes and approved Supabase authorization policies
and server allow/deny decisions
Node test runner/Vitest + isolated
Supabase/PostgreSQL test database;
exact tooling to confirm
backend/tests/database/,
backend/tests/security/
npm run test:db

Integration | Express operations work against
local test backend/database
Supertest | backend/tests/integratio
n/
npm run test:integration

End-to-end | Critical user journeys work in
browser
Playwright (proposed) | tests/e2e/ | npm run test:e2e

Manual | Screens match approved
designs; real browser/device
checks, keyboard and screen
reader checks

Human | tests/manual/ checklists in
each phase
—

12.3 Test IDs

PRD acceptance tests use T-001 through T-025. Retain those identifiers in test titles or metadata and map them to template prefixes as
follows; do not silently change PRD identifiers.

Prefix / PRD ID | Comes from | Example
T-SETUP-# | Phase 1 tool and setup checks | T-SETUP-1
T-US1-# / PRD T-001–003 | Submit request acceptance criteria | T-US1-1 (T-001)
T-US2-# / PRD T-004–006 | Track request acceptance criteria | T-US2-1 (T-004)

Prefix / PRD ID | Comes from | Example
T-US3-# / PRD T-007–009 | Routing acceptance criteria | T-US3-1 (T-007)
T-US4-# / PRD T-010–013 | Reminder/estimate/escalation criteria | T-US4-1 (T-010)
T-US5-# / PRD T-014–016 | Dashboard criteria | T-US5-1 (T-014)
T-US6-# / PRD T-017–019 | Announcement criteria | T-US6-1 (T-017)
T-US7-# / PRD T-020–022 | Opportunity criteria | T-US7-1 (T-020)
T-US8-# / PRD T-023–025 | Governance criteria | T-US8-1 (T-023)
T-BR#-# | Business rules BR1–BR14 | T-BR7-1
T-SEC-#a / b | Permission allow/deny pairs | T-SEC-2a / T-SEC-2b
T-DB-# | Database constraints/indexes | T-DB-1
T-INT-# | Backend operations | T-INT-1
T-C-# | Shared components | T-C-1
T-S#-# | Screen-specific states/behaviour | T-S5-1
T-NAV-# | Navigation rules | T-NAV-1
T-EDGE-# | PRD edge cases EC1–EC12 | T-EDGE-1 (EC1)
T-E2E-# | User flows | T-E2E-1
T-NFR-# | Quality requirements | T-NFR-1
T-REL-# | Release checks | T-REL-1

12.4 Test data rules

• Tests never depend on each other or on execution order.
• Database tests start from a clean test database and deterministic synthetic seed data.
• Component tests use synthetic sample data only, never real network calls.
• Tests never use real personal data or real passwords.
• Test identity integration uses an approved test tenant or controlled test identity provider; do not mock authorization in security tests.

12.5 Coverage rules

• 100% of PRD acceptance criteria T-001–T-025 have an automated test, or a manual check where automation is not possible (marked
"manual").
• 100% of business rules BR1–BR14 have unit, integration or database tests.
• 100% of permission rules have an allow test and a deny test.
• 100% of PRD edge cases EC1–EC12 have a test.
• At least 80% line coverage for business-rule code (recommended template target; confirm if institution requires a different threshold).

## 13. Phases

Feature order follows the PRD's recommended phased sequence. The product owner approved PRD v1.1, the stack and the conditional
recommendations in Section 18 on 08 Nov 2026. The owner approved a read-only S11 profile with sign-out and no editable preferences
in Phase 1. Phase 1 may proceed; local environment configuration and the health-check RPC are required before T-SETUP-3/full check.
The hosted test project is owner-confirmed in an approved region. Other external providers remain gated until their approvals.

13.0 Phase overview

Phase | Name | Features | Screens | Main tests
1 | Foundation, configuration and
authentication boundary
— | S1, S2 shell, S11 full, S12 T-SETUP-#, T-AUTH-#,
T-NAV-#
2 | Requests, tracking and routing F1, F2, F3 | S3, S4, S5 | T-US1-#, T-US2-#, T-US3-#,
T-BR1–5, T-SEC-#
3 | Reminders, estimates,
notifications and escalation
F4 | S8; S4 updates | T-US4-#, T-BR6–9,
T-EDGE-4/5/6/11
4 | Dashboards and reporting | F5 | S2, S3 updates | T-US5-#, T-SEC-6, T-NFR-#

# Juune University Operations & Accountability Platform

IMPLEMENTATION PLAN — REVISION 1.2

Prepared for: Owethu Jezile | Revision date: 08 November 2026 | Status: Draft — implementation blocked by open clarifications

## Revision precedence and scope

This revision replaces Sections 13–19 of the submitted v1.0 implementation plan. Sections 1–12 remain as submitted except where
this revision explicitly overrides them. Section 2 (Rules for the coding agent) is retained verbatim in the original first 18 pages. The
revised phase order, test assignments, traceability matrix, edge-case checklist, progress log, clarification register and change log
below are authoritative.
Important: The feedback identifies genuine missing decisions. This revision does not invent institutional approvals. The plan
remains Draft; all unresolved owner decisions remain blocking under the existing Section 1 instruction. No production
authentication, real staff data, evidence upload, live notifications or deployment may proceed without the relevant approvals.

Repository placement correction
The file must be named IMPLEMENTATION_PLAN.md and stored at the repository root (for example,
/juune/IMPLEMENTATION_PLAN.md), not inside /docs. The PRD remains at /docs/PRD.md if that is the repository’s approved
location.

## 13. Phases

13.0 Phase overview
Phase Name | Features | Screens | Main tests
1 | Foundation and application shell — | S1, S2 shell, S11 full, S12 T-SETUP, T-AUTH, T-NAV, T-C-1/2/5/8/9/10, T-SEC-14
2 | Data and security | — | No UI | All PostgreSQL tables; T-DB; T-SEC-1a/b through T-SEC-15a/b; seed data
3 | F1 Operational requests | F1 | S5 | T-US1, T-BR1-1, T-SEC-1a/b, T-EDGE-3, T-C-9
4 | F2 Tracking and F3 routing | F2, F3 | S3, S4; S5 updates | T-US2/3, T-BR2/3/5, T-SEC-2–5, T-EDGE-2/7/9/10, T-C-3/4
5 | F4 Reminders, estimates and
escalation
F4 | S4 updates, S8 | T-US4, T-BR4/6/7/8/9, T-SEC-4/5, T-EDGE-4/5/6/11

6 | F5 Dashboards and reporting F5 | S2 data, S3 updates | T-US5, T-BR10, T-SEC-6, T-EDGE-8, T-C-6
7 | F6 Announcements and F7
opportunities
F6, F7 | S6, S7 | T-US6/7, T-BR12, T-SEC-7–10, T-EDGE-12, T-C-7

8 | F8 Governance and configuration F8 | S9, S10 | T-US8, T-BR11/13/14, T-SEC-11/12/13, T-EDGE-1
9 | Hardening and pilot readiness — | All S1–S12 | All T-SEC regression, T-NFR, T-E2E, full edge suite
10 | Release | — | All approved screens | T-REL, clean install, full suite

Phase-order rules
• Foundation → Data and security → feature phases (no more than two features in any feature phase) → separate Hardening →
Release.
• F8 has its own feature phase (Phase 8). Hardening is Phase 9 and does not contain F8 feature development.
• Phase 2 creates all PRD PostgreSQL tables, schema validation, indexes, security policy services and synthetic seed data. Phase 2 contains
no UI work.
• Security allow/deny pairs are written and first exercised in Phase 2; the relevant pairs are also included in the Step 1 table of the
feature phase that implements the protected resource.
• Every test is written before the code that makes it pass (TDD). No phase may mark a dependent test green by bypassing
authorization or using a guessed policy.
• OP20 and the complete S11 Profile & Settings screen are explicitly built in Phase 1. The owner approved read-only profile fields
and sign-out only; no preference edits are exposed until fields are approved.
• EC1 / T-EDGE-1 is built with OP18 in Phase 8. It is not tested as implemented before the department-deactivation operation exists.
• All Section 18 decision rows have owner-approved answers or recorded direct answers. The specific conditional manual gates still
apply; do not start a task that depends on an unmet gate.

13.1 Detailed phase plans

Phase 1: Foundation and application shell
Goal: Create a runnable application foundation, safe environment handling, replaceable institutional identity boundary, role-aware
navigation and complete S11 profile/settings screen with read-only fields and sign-out.
Covers: Stories: authentication/navigation foundation; Screens S1, S2 shell, S11 complete, S12; Operations: authentication
boundary and OP20; rules BR11/SEC14 foundations.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-SETUP-1 | Unit | Missing required environment values fail safely; no secret is printed.
T-SETUP-2 | Component | Application shell renders without protected content for a logged-out user.
T-SETUP-3 | Database | Connection abstraction can connect to an isolated test database.
T-SETUP-4 | Integration | Health endpoint returns safe status without environment details.
T-AUTH-1 | Security | Unauthenticated protected API requests are denied.
T-NAV-1 | Component | Logged-out and authenticated navigation guards behave as specified.
T-OP20-1 | Integration | Authenticated user can read their own profile; Phase 1 exposes no preference edits; sign-out clears session.
T-SEC-14a/b | Security | Allow: user reads own profile. Deny: user cannot update unsupported preferences, role, or department.
T-C-1 | Component | Responsive top bar renders title, notification indicator and profile responsively.
T-C-2 | Component | Role-aware navigation filters links; server remains authoritative.
T-C-5 | Component | Toast displays success/error; persistent error also appears inline.
T-C-8 | Component | Offline banner uses exact offline message and never claims unsaved work was saved.
T-C-9 | Component | Form field associates label, hint and error accessibly.
T-C-10 | Component | Loading skeleton is labelled and announced appropriately.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Create Node/Express API shell, environment parser, versioned routes, safe error middleware and health route.
• Implement a replaceable authentication adapter; production identity provider remains blocked by OQ1.
• Implement session boundary, role context and audit helper; never trust frontend role state.
• Apply the minimal `juune_health_check` migration in `supabase/migrations/202611080001_health_check.sql` to the approved hosted test project before T-SETUP-3.
• Implement OP20 own-profile read service. Disable profile/preference writes until fields are approved; role/department remain
identity/admin-managed.
• Keep secrets server-side; VITE_ variables are public and must never contain secrets.
Step 3: Frontend (Green)
• Build React/Vite/TypeScript/Tailwind application shell, route guards and design tokens from plan Section 7.1.
• Build S1 sign-in boundary, S2 shell, complete read-only S11 Profile & Settings and S12 safe error/access-denied route.
• Build responsive top bar, role-aware navigation, toast, offline banner, form field and loading skeleton components.
• Implement sign-out and clear local session state. Do not render preference controls or a save action until editable fields are
approved; when enabled later, use the exact PRD success message “Preferences saved.”
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Run desktop/tablet/mobile viewport checks.
• Verify keyboard-only navigation, visible focus, accessible labels and 44px practical touch targets.
• Inspect frontend bundle, logs and repository for secrets.
• Verify profile update cannot alter role or department; verify sign-out returns to S1.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.

• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 1: foundation and profile preferences
STOP. Wait for the human to say “Start Phase 2”.

Phase 2: Data and security
Goal: Establish every PostgreSQL table, schema, validation rule, index, relationship, tenant boundary, permission policy and
deterministic synthetic seed before feature UI.
Covers: All PRD Section 10 entities mapped to PostgreSQL tables and Section 9 SEC1–SEC15; T-DB tests; no feature UI and no production data.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-DB-1 | Database | All approved PostgreSQL tables have required fields, types, defaults and constraints mapped from PRD Section 10.
T-DB-2 | Database | Relationships, delete behaviour and status invariants are enforced.
T-DB-3 | Database | Required indexes exist and query plans use scoped indexes.
T-DB-4 | Database | Migrations/setup are repeatable against a clean test database.
T-SEED-1 | Database | Synthetic seed data covers Employee, Department manager, Senior leadership and Platform administrator.
T-TENANT-1 | Security | Repository access is always institution-scoped; cross-tenant query is denied.
T-SEC-1a/b | Security | Requests create: allow active scoped user with valid fields; deny invalid/inactive/out-of-scope create.
T-SEC-2a/b | Security | Requests read: allow requester/authorised participants; deny unrelated user and out-of-scope tenant.
T-SEC-3a/b | Security | Request update/assignment: allow assigned manager/authorised actor; deny cross-department action.
T-SEC-4a/b | Security | Request events/responses: allow authorised participants; deny unauthorised history/response access.
T-SEC-5a/b | Security | Evidence: allow authorised private access; deny unauthorised upload/read/download.
T-SEC-6a/b | Security | Dashboard: allow manager’s assigned department and leadership summaries; deny sensitive detail without
grant.
T-SEC-7a/b | Security | Announcements read: allow published, unexpired audience member; deny
unpublished/expired/out-of-audience.
T-SEC-8a/b | Security | Announcements publish/edit: allow publisher permission; deny non-publisher UI/API mutation.
T-SEC-9a/b | Security | Opportunities read: allow published/current audience; deny unpublished/closed/out-of-audience.
T-SEC-10a/b | Security | Opportunities publish/edit: allow publisher permission; deny non-publisher mutation.
T-SEC-11a/b | Security | Configuration: allow platform administrator valid config; deny non-admin/invalid config/last-admin removal.
T-SEC-12a/b | Security | Audit log: allow explicitly authorised reviewer; deny other roles and secret/personal-data exposure.
T-SEC-13a/b | Security | Roles/permissions: allow approved administrator change with audit; deny non-admin privilege change.
T-SEC-14a/b | Security | Profile: allow own-profile read; deny unsupported preference, role, or department updates.
T-SEC-15a/b | Security | Tenant scope: allow matching institution; deny all cross-institution reads/writes.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Create approved PostgreSQL tables and schemas for all PRD entities: Institution, User, Department, RequestCategory, Request, RequestEvent, Attachment,
Notification, Announcement, Opportunity, AuditEvent and any explicitly specified configuration entities.
• Implement schema validation, required/default/unique constraints, relationship checks, delete behaviour, status invariants and
indexes from the PRD.
• Implement shared tenant-scope middleware, permission policy registry and server-side authorization helpers for SEC1–SEC15.
• Create deterministic synthetic seed data for all four roles and the three pilot departments only.
• Implement private-storage adapter boundary; do not enable evidence uploads until OQ9 and privacy approval are resolved.
• Supabase (PostgreSQL), Express-only Supabase client access and PostgreSQL RLS are approved. The Phase 2 engineering contract
maps signed JWT `sub` to `users.institutional_id` within signed `institution_id`; `role=authenticated` selects the PostgREST
database role only, while application permissions come from database tables. Do not trust caller-supplied headers, accept JWT role
claims as application permissions, assume Supabase Auth, or expose a service-role key to the frontend. The real issuer, audience,
signature/JWKS trust configuration and user-provisioning process remain deployment gates.
Step 3: Frontend
No user-interface work in this phase. This is a data, schema, seed and server-security phase only.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.

• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Run schema and index checks on a clean database.
• Inspect seed records to confirm synthetic-only data and institution isolation.
• Exercise each SEC allow/deny pair against its policy-level test fixture; record results by exact test ID.
• Run `supabase/tests/phase2_rls.test.sql` only against the isolated test project after migration and seed deployment; the transaction rolls back its test mutations.
• Verify no UI code or screen is added in this phase.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 2: data and security
STOP. Wait for the human to say “Start Phase 3”.

Phase 3: F1 Operational requests
Goal: Allow a staff member to create a valid operational request with a unique reference, correct initial status and clear
confirmation.
Covers: Feature F1 / US1; OP1; Screen S5; BR1; SEC1; includes duplicate-submit protection EC3.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US1-1 (T-001) | Integration | Valid request creates unique reference, timestamp, submitted status and destination.
T-US1-2 (T-002) | Component/API Missing or invalid fields create no request and show field-specific guidance.
T-US1-3 (T-003) | E2E | Successful submission confirms and opens request detail.
T-BR1-1 | Unit/integration | Requester, category, summary/description and destination are mandatory before submit.
T-SEC-1a/b | Security | Allow valid active scoped employee create; deny invalid/inactive or unauthorized create.
T-EDGE-3 (EC3) | Integration/E2E Repeated submit with slow network does not create duplicate requests.
T-C-9 | Component | S5 form labels, hints and validation messages are associated and accessible.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement OP1 request creation and server-side validation using BR1.
• Generate request references only after OQ17 confirms the format; do not assume JU-000123 is final.
• Implement idempotency/duplicate-submit protection and append-only initial request event.
• Enforce institution boundary and SEC1 on every API path.
Step 3: Frontend (Green)
• Build S5 New Request form with category, routing recommendation placeholder, destination, summary, description and permitted
evidence metadata.
• Use the exact PRD validation copy: “Choose a category.” “Enter a short summary.” “Enter a description.” “Choose a destination
department.”
• Do not enforce proposed character limits until OQ18 is approved; do not enable upload before OQ9.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Submit valid and invalid requests using synthetic Employee accounts.
• Repeat submission under simulated slow network and verify one request only.

• Verify reference and confirmation content against approved PRD decisions.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 3: F1 operational requests
STOP. Wait for the human to say “Start Phase 4”.

Phase 4: F2 Tracking and F3 routing
Goal: Provide secure request lists/details, chronological history, permitted responses and advisory routing with destination
correction.
Covers: Features F2/F3; US2/US3; OP2–OP8 and OP21; Screens S3/S4 and S5 updates; BR2/BR3/BR5/BR10; SEC2–SEC5.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US2-1 (T-004) | Integration | Authorised user sees status, assigned department/owner and permitted chronological history.
T-US2-2 (T-005) | Security | Unauthorised direct URL/API access is denied without revealing record details.
T-US2-3 (T-006) | Integration | Status/response event records actor and timestamp.
T-US3-1 (T-007) | Unit/component Configured category displays recommended department.
T-US3-2 (T-008) | Integration | Permitted alternate destination is saved and used.
T-US3-3 (T-009) | Component | No routing match prompts manual destination or administrator configuration.
T-BR2-1 | Unit/integration | Routing recommendation is advisory and requester may correct destination before submit.
T-BR3-1 | Integration | Status, created time and status-change history persist with actor/time.
T-BR5-1 | Security/integration Communication and evidence visibility follows request permission and sensitivity.
T-SEC-2a/b | Security | Allow authorised request read; deny unrelated/out-of-scope read.
T-SEC-3a/b | Security | Allow permitted manager action; deny cross-department update/assignment.
T-SEC-4a/b | Security | Allow authorised event read/create; deny unauthorised history or response.
T-SEC-5a/b | Security | Allow permitted private evidence access; deny unauthorised evidence access.
T-EDGE-2 (EC2) | Integration | Missing manager uses only approved fallback or blocks/alerts per decision.
T-EDGE-7 (EC7) | Security | Disallowed evidence type/size is safely rejected; storage path is never exposed.
T-EDGE-9 (EC9) | Security | Access revoked during open page denies subsequent server actions.
T-EDGE-10 (EC10) | Integration | Reopen after resolution records actor, time and reason and returns to an allowed active status.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement OP2–OP8 and OP21 with scoped queries, request authorization, append-only events and assignment controls.
• Implement advisory routing and permitted destination correction using active configuration.
• Implement status transition service only after OQ8 resolves exact transitions, closure/reopen and on-hold reasons.
• Implement private attachment service only after OQ9; until then, reject uploads safely and do not expose storage paths.
• Enforce SEC2–SEC5 at the service and repository boundary.
Step 3: Frontend (Green)
• Build S3 request queue with search, filters, pagination and empty/loading/error/offline states.
• Build S4 request detail with status, responsible parties, estimate placeholder, timeline, response composer, evidence list and flag
placeholder.
• Update S5 to show recommendation and correction before submission.
• Use exact access-denied copy: “You don’t have permission to view this item.”
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.

• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Test requester, assigned manager, unrelated employee and leadership scopes.
• Verify chronology, actor/time, response visibility and direct API denial.
• Verify status/reopen only after OQ8; verify upload remains disabled until OQ9 is approved.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 4: tracking and routing
STOP. Wait for the human to say “Start Phase 5”.

Phase 5: F4 Reminders, estimates and escalation
Goal: Send deduplicated notifications, show only reliable estimates and create one escalation event at the third flag.
Covers: Feature F4 / US4; OP9–OP12; S4 updates and S8; BR4/BR6–BR9; SEC4/SEC5.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US4-1 (T-010) | Unit | Adequate category history produces a clearly qualified estimate.
T-US4-2 (T-011) | Unit/component Insufficient history shows unavailable message, not a fabricated estimate.
T-US4-3 (T-012) | Integration | Third flag creates one escalation event and notifies configured authority.
T-US4-4 (T-013) | Integration | Due reminder reaches correct recipients without duplicate scheduled sends.
T-BR4-1 | Integration | Receiving manager and requester’s manager are notified when valid assignments and permissions exist.
T-BR6-1 | Unit | Estimate is derived only from adequate institutional historical data; otherwise unavailable.
T-BR7-1 | Integration | Third same-request flag triggers one escalation notification/event.
T-BR8-1 | Unit/integration | Escalation is a review trigger and does not imply blame, misconduct or automatic closure.
T-BR9-1 | Integration | Reminder cadence and overdue thresholds use approved institution configuration.
T-SEC-4a/b | Security | Only authorised participants can read/create notification-linked request events.
T-SEC-5a/b | Security | Evidence access remains restricted in notification/detail paths.
T-EDGE-4 (EC4) | Integration | Email failure does not undo saved request; retry is safe.
T-EDGE-5 (EC5) | Integration | Concurrent third-flag requests create exactly one escalation.
T-EDGE-6 (EC6) | Unit | Sparse or skewed history suppresses estimate.
T-EDGE-11 (EC11) | Integration | Duplicate scheduled reminder run is deduplicated.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement notification records, in-app service, email adapter and safe delivery status after OQ4.
• Implement reminder worker and deduplication key after OQ5; do not guess cadence, retry or escalation fallback.
• Implement atomic flag increment and unique threshold-crossing escalation event.
• Implement estimate calculation only after OQ6; until then return the exact unavailable state.
• Never place sensitive request content in email subject/body.
Step 3: Frontend (Green)
• Build S8 notification history, unread count, mark-read action and related-item permission recheck.
• Add S4 flag confirmation and neutral escalation confirmation.
• Show estimate only when reliable; otherwise use “A reliable resolution estimate isn’t available for this category yet.”
• Show delivery-failure state without implying the request was not saved.

Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Simulate email-provider outage and verify request remains saved.
• Test three flags and concurrent tabs; verify one escalation only.
• Check recipient scope, notification deduplication and neutral escalation language.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 5: reminders, estimates and escalation
STOP. Wait for the human to say “Start Phase 6”.

Phase 6: F5 Dashboards and reporting
Goal: Provide role-scoped operational summaries and trends without exposing sensitive request details.
Covers: Feature F5 / US5; OP13; S2 dashboard data and S3 updates; BR10; SEC6.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US5-1 (T-014) | Integration/security Manager dashboard is limited to assigned department.
T-US5-2 (T-015) | Integration/security Leadership gets institution summaries; sensitive details remain restricted.
T-US5-3 (T-016) | Component | Empty filters show helpful message and clear-filter action.
T-BR10-1 | Security/integration Managers act only within assigned department; leadership sees permitted institution summaries.
T-SEC-6a/b | Security | Allow scoped manager/leadership summary; deny sensitive detail or out-of-scope dashboard access.
T-EDGE-8 (EC8) | Security | Sensitive records are suppressed or aggregated under approved privacy rules.
T-C-6 | Component | Empty-state panel presents helpful message and next action.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement OP13 dashboard aggregation for outstanding requests, workload, overdue items and resolution trends.
• Apply institution, department, date and status filters server-side.
• Use approved baseline and pilot metric definitions; do not invent target percentages or overdue thresholds.
Step 3: Frontend (Green)
• Build S2 role-specific summary cards, quick New Request action, recent requests and permitted content previews.
• Build S3 dashboard-linked queue states and responsive table/list treatment.
• Charts include text summaries or accessible tabular alternatives; apply exact PRD empty/error copy.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Compare manager and leadership dashboards using synthetic roles.
• Verify sensitive data is absent from aggregate cards, filters, exports and direct API responses.
• Check chart accessibility, mobile layouts and approved metric definitions.

Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 6: dashboards and reporting
STOP. Wait for the human to say “Start Phase 7”.

Phase 7: F6 Announcements and F7 Opportunities
Goal: Publish and display audience-appropriate announcements and opportunities with permission checks, expiry and safe
external links.
Covers: Features F6/F7; US6/US7; OP14–OP17; S6/S7; BR12; SEC7–SEC10.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US6-1 (T-017) | Integration | Permitted publisher publishes to audience; publisher and time are recorded.
T-US6-2 (T-018) | Security | Unauthorized UI/API publish attempt is denied and audited where appropriate.
T-US6-3 (T-019) | Integration | Unpublished/expired announcement is not shown as current.
T-US7-1 (T-020) | Component/integrati
on
Opportunity card shows required title/type/department/closing date/detail action.

T-US7-2 (T-021) | Integration | Unpublished or past-closing opportunity is not shown as open.
T-US7-3 (T-022) | Component | Helpful empty state is shown when no opportunities are available.
T-BR12-1 | Integration | Content has publisher, title, body, publication state and audience; expired/unpublished content is not current.
T-SEC-7a/b | Security | Allow audience member to read published/current announcement; deny other content.
T-SEC-8a/b | Security | Allow permitted announcement publisher; deny non-publisher create/edit/publish.
T-SEC-9a/b | Security | Allow audience member to read published/current opportunity; deny unpublished/closed/out-of-audience.
T-SEC-10a/b | Security | Allow permitted opportunity publisher; deny non-publisher mutation.
T-EDGE-12 (EC12) | Integration | Re-check opportunity closing state before action; show that it is no longer open.
T-C-7 | Component | Confirmation modal requires explicit confirm/cancel for high-impact actions.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement announcement/opportunity PostgreSQL tables, audience checks, publication states, expiry and audit events.
• Implement permission-controlled create/edit/publish operations and safe approved external links.
• Do not implement application processing inside Juune unless separately approved; discussion functionality remains subject to OQ7.
Step 3: Frontend (Green)
• Build S6 announcement feed, detail/discussion display and authorised create/edit/publish modal.
• Build S7 browse/search/filter list and opportunity detail with approved application/contact instructions.
• Use exact empty messages; unpublished/expired content is never shown as current.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Verify audience visibility with synthetic users from different departments.
• Verify publisher permission through UI and direct API.
• Verify expiry and closing-date boundary; verify external links are approved and safe.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.

• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 7: announcements and opportunities
STOP. Wait for the human to say “Start Phase 8”.

Phase 8: F8 Governance and configuration
Goal: Allow platform administrators to configure institutional governance and authorised reviewers to inspect audit events.
Covers: Feature F8 / US8; OP18–OP19; S9/S10; BR11/BR13/BR14; SEC11–SEC13; EC1.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-US8-1 (T-023) | Integration | Valid configuration change is saved and audit event records actor/time.
T-US8-2 (T-024) | Security | Non-admin direct API configuration change is denied.
T-US8-3 (T-025) | Unit/integration | Invalid routing/escalation configuration and removal of last active admin are blocked.
T-BR11-1 | Integration | Configuration, assignment, response, escalation and permission changes create audit events.
T-BR13-1 | Security/integration Only authorised administrators change roles, permissions, routing, categories and escalation paths.
T-BR14-1 | Integration | Pilot configuration contains IT, Facilities/Maintenance and Administration only unless approved expansion.
T-SEC-11a/b | Security | Allow platform administrator valid config; deny non-admin/invalid/final-admin removal.
T-SEC-12a/b | Security | Allow authorised audit reviewer; deny others and suppress secrets/unnecessary personal data.
T-SEC-13a/b | Security | Allow approved role/permission changes with audit; deny non-admin privilege changes.
T-EDGE-1 (EC1) | Integration | Department deactivation is blocked or requires reassignment of open requests before completion.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Implement OP18 configuration operations for departments, roles, permissions, categories, workflows, routing and escalation paths.
• Implement department deactivation guard and reassignment workflow for EC1; do not test it before OP18 exists.
• Validate references and active states; block invalid routing/escalation configuration and removal of final active administrator.
• Implement append-only audit records for configuration, assignment, response, escalation, permission changes and access events.
• Implement OP19 read-only audit search/filter/detail with permission-safe output.
Step 3: Frontend (Green)
• Build S9 configuration navigation, tables, create/edit forms, validation summaries and high-impact confirmation.
• Build S10 read-only audit search/filter/detail; export only if separately approved.
• Complete S12 safe denial/error experience and audit visibility rules.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Verify admin-only configuration and audit access with all four synthetic roles.
• Test department deactivation with open requests and required reassignment.
• Verify every configuration and permission change is auditable.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 8: governance and configuration

STOP. Wait for the human to say “Start Phase 9”.

Phase 9: Hardening and pilot readiness
Goal: Complete security, privacy, accessibility, reliability and end-to-end verification across the finished MVP; no new feature
scope.
Covers: Hardening only; all S1–S12; SEC1–SEC15 regression; NFRs; E2E; POPIA/privacy and pilot controls.
Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-NFR-1 | Accessibility | Keyboard access, focus, contrast, labels, touch targets, responsive behaviour and chart alternatives pass.
T-NFR-2 | Security | HTTPS configuration, safe errors, rate limits, secret handling and secure session settings pass.
T-NFR-3 | Privacy | Approved notice, retention, data-subject process and incident contacts are enforced.
T-NFR-4 | Reliability | Backup/restore, retry, deduplication, monitoring and failure recovery are verified.
T-E2E-1 | E2E | Critical pilot journey works end to end with synthetic accounts.
T-SEC-1a/b through
T-SEC-15a/b
Security regression All 15 allow/deny pairs pass against completed routes and direct API access.

T-EDGE-1 through
T-EDGE-12
Regression | All twelve individually defined edge-case tests pass after all required operations exist.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Complete institution boundary, private evidence, server-side authorization, approved rate limits, safe logging and retention controls.
• Resolve and implement POPIA/privacy notice, data retention, data-subject process, incident contacts, backup/restore and hosting
controls before real data.
• Run dependency/security review, secret scan, access-control review and backup/restore drill.
Step 3: Frontend (Green)
• Review every S1–S12 state, responsive breakpoint, keyboard path, contrast and accessible chart alternative.
• Complete safe denial/error experience; remove placeholder UI and unapproved actions.
• Perform visual comparison against supplied approved design assets; if exports remain unavailable, record the gap and do not claim
pixel-level sign-off.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Run complete permission allow/deny matrix and sensitive evidence route review.
• Run secret scan including repository history; confirm no secrets in client bundle, logs or code.
• Obtain privacy/security/governance approval before real employee data is loaded.
• Confirm pilot scope is IT, Facilities/Maintenance and Administration.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 9: hardening and pilot readiness
STOP. Wait for the human to say “Start Phase 10”.

Phase 10: Release
Goal: Deploy an approved build to the institution-approved environment and demonstrate readiness for the controlled pilot.
Covers: All approved MVP features F1–F8; all screens; T-REL and full suite.

Step 1: Write the failing tests first (Red)
Test ID | Level | Purpose / expected behaviour
T-REL-1 | Release | Fresh clone, clean install, configuration, seed/reset and full automated check succeed.
T-REL-2 | E2E | PRD five-minute demo journey runs from start to finish.
T-REL-3 | Security/manual Approved identity, HTTPS, privacy, backup, retention, secrets and hosting checks are complete.
T-REL-4 | Release | Rollback and restore runbooks are available and rehearsed.

All tests listed in Step 1 are written and run first. Tests that depend on an external decision remain explicitly gated; do not replace the decision with a guessed
default.
Step 2: Backend (Green)
• Configure production database, backups, monitoring, approved email and private evidence storage.
• Configure institution-approved identity provider and deployment secrets.
• Run final database setup and synthetic smoke tests; verify rollback and restore.
Step 3: Frontend (Green)
• Deploy approved frontend and API.
• Verify supported desktop/tablet/mobile browsers and public URLs/email links.
Step 4: Refactor and full check
• Refactor without changing approved behaviour; remove duplication and retain PRD terminology.
• Run lint, type check, unit/component, database, security and integration suites; all earlier tests must remain green.
Step 5: Manual checks (human)
• Run PRD demo with synthetic accounts: sign in; submit IT/Facilities request; manager acknowledges; inspect timeline and
dual-manager notifications; flag three times; inspect escalation/audit; view dashboard, announcement, opportunity, admin routing and
audit log.
• Obtain pilot owner, IT, privacy/security and stakeholder sign-off.
• Confirm support process and incident contacts.
Definition of Done
• Every Step 1 test passes or has a documented, approved external-dependency gate.
• All tests from earlier phases still pass.
• Applicable screens show normal, empty, loading, error, offline, success and access-denied states as defined in the PRD.
• Manual checks are completed by a human and Section 17 is updated.
Commit message: Phase 10: release
STOP. Wait for the human to say “Wait for the human’s next instruction”.

## 14. Traceability matrix

Feature / capability | Stories Acceptance tests | Rule tests (test IDs, not BR IDs) | Screens Operations | Phas
e
F1 Operational requests US1 | T-001–003 / T-US1-1–3 T-BR1-1; T-SEC-1a/b | S5 | OP1 | 3
F2 Tracking and
communication
US2 | T-004–006 / T-US2-1–3 T-BR3-1; T-BR5-1; T-SEC-2a/b;
T-SEC-3a/b; T-SEC-4a/b; T-SEC-5a/b
S3, S4 | OP2, OP3, OP6, OP7 4

F3 Recommended routing US3 | T-007–009 / T-US3-1–3 T-BR2-1; T-SEC-1a/b; T-SEC-3a/b | S5 | OP4, OP5 | 4
F4 Reminders, estimates,
escalation
US4 | T-010–013 / T-US4-1–4 T-BR4-1; T-BR6-1; T-BR7-1; T-BR8-1;
T-BR9-1; T-SEC-4a/b; T-SEC-5a/b
S4, S8 | OP9–OP12 | 5

F5 Dashboards | US5 | T-014–016 / T-US5-1–3 T-BR10-1; T-SEC-6a/b | S2, S3 | OP13 | 6
F6 Announcements/discu
ssions
US6 | T-017–019 / T-US6-1–3 T-BR12-1; T-SEC-7a/b; T-SEC-8a/b | S6 | OP14, OP15 | 7

F7 Opportunities | US7 | T-020–022 / T-US7-1–3 T-BR12-1; T-SEC-9a/b; T-SEC-10a/b | S7 | OP16, OP17 | 7
F8 Configurable
governance
US8 | T-023–025 / T-US8-1–3 T-BR11-1; T-BR13-1; T-BR14-1;
T-SEC-11a/b; T-SEC-12a/b; T-SEC-13a/b
S9, S10 OP18, OP19 | 8

Profile preferences | — | T-OP20-1 | T-SEC-14a/b | S11 | OP20 | 1
Tenant boundary / data
security
— | T-TENANT-1; T-DB-1–4 T-SEC-15a/b | All data
resources
All resource
repositories
2

Rule-test inventory
PRD rule | Rule test ID | Phase / assertion
BR1 | T-BR1-1 | Phase 3 — required request fields
BR2 | T-BR2-1 | Phase 4 — advisory routing and correction
BR3 | T-BR3-1 | Phase 4 — status/history actor and timestamp
BR4 | T-BR4-1 | Phase 5 — dual-manager notification recipients
BR5 | T-BR5-1 | Phase 4 — communication/evidence access scope
BR6 | T-BR6-1 | Phase 5 — reliable estimate only
BR7 | T-BR7-1 | Phase 5 — third flag escalation
BR8 | T-BR8-1 | Phase 5 — escalation is review, not blame
BR9 | T-BR9-1 | Phase 5 — approved reminder configuration
BR10 | T-BR10-1 | Phase 6 — manager/leadership scope
BR11 | T-BR11-1 | Phase 8 — append-only audit coverage
BR12 | T-BR12-1 | Phase 7 — publisher, audience and expiry
BR13 | T-BR13-1 | Phase 8 — administrator-only configuration
BR14 | T-BR14-1 | Phase 8 — pilot department boundary

Shared-component tests (all assigned to a phase Step 1 table)
Test ID | Component | Phase
T-C-1 | Responsive top bar | Phase 1
T-C-2 | Role-aware navigation | Phase 1
T-C-3 | Request status badge | Phase 4
T-C-4 | Timeline item | Phase 4
T-C-5 | Notification toast | Phase 1
T-C-6 | Empty-state panel | Phase 6
T-C-7 | Confirmation modal | Phase 7
T-C-8 | Offline banner | Phase 1
T-C-9 | Form field / validation | Phase 1 and Phase 3
T-C-10 | Loading skeleton | Phase 1

## 15. Acceptance test and edge-case checklist

Acceptance tests T-001–T-025
• T-001 / T-US1-1: Valid employee submission creates unique request ID/reference, timestamp, initial status and selected destination.
• T-002 / T-US1-2: Missing/invalid required fields create no request and show field-specific guidance.
• T-003 / T-US1-3: Successful submission shows confirmation and request detail action.
• T-004 / T-US2-1: Authorised user sees status, assigned department/owner and permitted chronological history.
• T-005 / T-US2-2: Unauthorised direct request URL/API access is denied without revealing record details.
• T-006 / T-US2-3: Status/response event records actor and timestamp.
• T-007 / T-US3-1: Configured category displays recommended department before submission.
• T-008 / T-US3-2: Requester can select permitted alternate destination and it is saved.
• T-009 / T-US3-3: No routing match prompts manual destination or administrator configuration.
• T-010 / T-US4-1: Adequate historical data displays category estimate with non-guarantee wording (after OQ6).
• T-011 / T-US4-2: Inadequate historical data displays unavailable state, not a fabricated estimate.
• T-012 / T-US4-3: Third flag creates one escalation event and notifies configured authority.
• T-013 / T-US4-4: Due reminder reaches correct recipients without duplicate scheduled sends (after OQ5).
• T-014 / T-US5-1: Manager dashboard counts/lists are limited to assigned department.
• T-015 / T-US5-2: Leadership receives institution summaries while sensitive details remain restricted.

• T-016 / T-US5-3: Empty dashboard filters explain no matches and offer clear filters.
• T-017 / T-US6-1: Permitted publisher publishes announcement to configured audience and publisher/time are recorded.
• T-018 / T-US6-2: Unauthorized publish through UI/API is denied and audited where appropriate.
• T-019 / T-US6-3: Unpublished/expired announcement is not shown as current.
• T-020 / T-US7-1: Opportunity card shows title, type, department/owner where configured, closing date where applicable and detail
action.
• T-021 / T-US7-2: Unpublished/past-closing opportunity is not shown as currently open.
• T-022 / T-US7-3: No opportunities displays helpful empty state.
• T-023 / T-US8-1: Valid admin configuration change is saved and audited with actor/time.
• T-024 / T-US8-2: Non-admin configuration change through API is denied.
• T-025 / T-US8-3: Invalid routing/escalation configuration and last-admin removal are blocked with correction guidance.

Edge cases EC1–EC12 — each listed and traceable individually
Test ID | Build phase | Expected behaviour
T-EDGE-1 (EC1) | Phase 8 | Department deactivation is blocked or requires reassignment of open requests.
T-EDGE-2 (EC2) | Phase 4 | Missing requester/receiving manager follows approved fallback or blocks/alerts; warning is logged.
T-EDGE-3 (EC3) | Phase 3 | Repeated submit during slow network does not create duplicate requests.
T-EDGE-4 (EC4) | Phase 5 | Email provider outage does not undo saved request; retry is safe.
T-EDGE-5 (EC5) | Phase 5 | Concurrent third flags create exactly one escalation event.
T-EDGE-6 (EC6) | Phase 5 | Sparse/skewed history suppresses unreliable estimate.
T-EDGE-7 (EC7) | Phase 2 / 4 | Disallowed evidence type/size is rejected safely; storage path is not exposed.
T-EDGE-8 (EC8) | Phase 6 | Sensitive records are suppressed/aggregated under approved privacy rules.
T-EDGE-9 (EC9) | Phase 4 | Access revoked during an open page denies subsequent server actions.
T-EDGE-10 (EC10) | Phase 4 | Reopening after resolution records actor, time and reason and returns to an allowed active status.
T-EDGE-11 (EC11) | Phase 5 | Duplicate scheduled reminder run is deduplicated by request, reminder type and scheduled time.
T-EDGE-12 (EC12) | Phase 7 | Opportunity closing state is rechecked before action; user is told it is no longer open.

NFR and final acceptance
• PRD Section 9.4: keyboard access, focus, contrast, labels, touch targets and chart alternatives are verified manually.
• PRD Section 12: security, privacy, performance and reliability requirements are verified by automated and manual checks.
• All 15 permission rules have an allow and deny test: T-SEC-1a/b through T-SEC-15a/b.
• All 14 business rules have a T-BR#-1 rule test; all 10 shared components have a T-C test in a phase Step 1 table.

## 16. Final release checklist

• All ten phases are complete; all applicable boxes in Sections 13 and 15 are ticked.
• Clean install from fresh clone succeeds; full check and E2E suite pass.
• Release build deploys only to institution-approved hosting/data region and supported browsers.
• PRD demo script runs end-to-end using synthetic accounts.
• README documents setup, commands, test accounts and test execution; .env.example lists all variables.
• Secret scan of working tree and repository history finds no credentials, tokens, signing keys or storage/email secrets.
• Approved identity provider, email service, hosting, data region, backups and evidence storage are configured.
• POPIA/privacy notice, retention schedule, data-subject process and incident contacts are approved.
• Final comparison against PRD acceptance criteria, screen specifications and supplied design assets is recorded.
• Pilot scope remains IT, Facilities/Maintenance and Administration unless expansion is approved.
• Stakeholder, IT, privacy/security and pilot-readiness sign-offs are recorded.

## 17. Progress log (the coding agent updates this)

Phase | Date | Status | Tests passed/total | Commit | Notes
1 | 08 Nov 2026 | Checks passed; owner manual review pending | Unit 16/16; database 1/1; integration 6/6 | f6e724e | `npm run check` passes (lint, typecheck, unit/database/integration tests, backend/frontend builds). Browser smoke checks: S1 renders at 375px, 768px and 1440px without horizontal overflow; keyboard focus is visible, controls meet 44px minimum, and sign-in shows the approved safe response through the Vite proxy/API. Tests cover read-only profile/sign-out and denied profile/role/department writes. `.env` is gitignored; no Supabase key identifier was found in the built frontend. Institutional sign-in remains intentionally unavailable pending OQ1/provider adapter; owner review remains pending.
2 | 08 Nov 2026 | Implemented and runtime-validated on an isolated synthetic test project; human manual review pending | Unit 16/16; database 11/11; integration 6/6; lint, typecheck, builds, remote Postgres lint, and rollback-only RLS SQL tests pass. Runtime check: 22 RLS tables, 48 indexes, 1 synthetic tenant, 5 users and 3 requests. | — | Applied migrations 001–004 and synthetic seed to the dedicated `juune-phase2-test` project in EU West. The SQL policy suite exposed an institution audit-tenant bug, fixed in migration 004, and then passed. Full `npm run check` passes. The actual institutional issuer/audience/JWKS validation and human manual review remain gates before real-user use; commit is pending those checks.
3 | 08 Nov 2026 | Implemented and runtime-validated on an isolated synthetic test project; human manual review pending | Unit 10/10 + 19/19; database 15/15; integration 11/11; full `npm run check`, remote PostgreSQL lint, and rollback-only hosted RLS/idempotency test pass. | 8a98870 | Applied migrations 005–006 only to the isolated `juune-phase2-test` project; no production project changed. Hosted validation exposed and fixed the required idempotency-column INSERT grant and the RLS-incompatible `INSERT ... RETURNING` path. Real institutional issuer/JWKS trust and human manual checks remain gates; authentication stays intentionally unavailable and evidence uploads remain disabled.
4 | 08 Nov 2026 | Implemented and validated on isolated synthetic test project; human manual review pending | Unit 18/18 backend + 29/29 frontend; database 19/19; integration 20/20; lint, typecheck, builds, remote schema lint and rollback-only hosted SQL test pass. | Phase 4: tracking and routing | Implemented S3/S4 request tracking, scoped history/responses and manager actions, plus advisory destination correction. Applied migration 007 only to isolated project `juune-phase2-test`; hosted authorization/history/routing/status/reopen tests passed and rollback left zero fixture rows. Remote schema lint found no errors. No production database was changed. OQ1 institutional sign-in and OQ9 evidence storage remain disabled; human UI checks are still required.
5 | — | Not started | — | — | Depends on Phase 4
6 | — | Not started | — | — | Depends on Phase 5
7 | — | Not started | — | — | Depends on Phase 6
8 | — | Not started | — | — | Depends on Phase 7
9 | — | Not started | — | — | Depends on Phase 8
10 | — | Not started | — | — | Depends on Phase 9
Update implementation claims, dates, test counts, commits and notes only after the work is actually completed and verified.

## 18. Clarifications needed

The product owner approved PRD v1.1, the S1–S12 designs, and the recommendations in this register on 08 Nov 2026. Q15 and Q16
are answered directly; Q1–Q14 and Q17–Q28 are resolved by the corresponding owner-approved proposals below. Under the owner's
direction to exercise engineering judgment, Phase 2 selected and implemented a signed-claim contract for Q29. The owner authorized
deployment to a dedicated isolated test project; its migrations, synthetic seed and rollback-only policy test have been exercised there.
The actual institutional issuer, audience, signature/JWKS trust configuration and provisioning process still require confirmation before
real-user use. Conditional operational gates remain: do not activate an external provider, use real data, enable deferred functionality,
or deploy beyond the isolated test project before the specific manual approval listed in the relevant proposal.
# Decision required | Source / phase | Decision owner | Status / answer
1 Which institutional identity protocol/provider and account
provisioning/test process are approved?
PRD OQ1; S1; Phase 1 | Institution IT/identity team | Owner-approved proposal #1: provider-neutral OIDC adapter for Phase 1; select the institutional provider before provider-specific integration.

2 Which Supabase project/region and database setup are approved?
PRD OQ2; data layer; Phase 2 Technical owner | Owner-approved proposal #2: Supabase PostgreSQL with separate development and production projects; use only an institution-approved region, confirmed before provisioning. The owner reports the Phase 1 hosted test project is provisioned in an approved region (region name not recorded); local configuration and health-check RPC are needed before T-SETUP-3/full check. See Q26 for access/security.

3 Which hosting provider, data region, backup policy and
deployment process are approved?
PRD OQ3; release; Phase 10 Institution/technical owner | Owner-approved proposal #3: use institution-approved hosting/region with TLS, managed backups and tested restore; confirm provider before deployment.

4 Which transactional email provider, sender domain and
delivery monitoring are approved?
PRD OQ4; notifications; Phase
5
Institution
IT/communications
Owner-approved proposal #4: email remains disabled until provider, sender and monitoring are approved; no external email in Phase 1.

5 What reminder cadence, overdue thresholds, retry policy
and escalation recipient/fallback rules apply?
PRD OQ5; BR4/BR9; Phase 5 Pilot department
managers and sponsor
Owner-approved proposal #5: configurable reminders remain disabled until thresholds/recipients are approved; preserve BR7's third-flag rule.

6 What minimum historical sample size and calculation
method make a category estimate reliable?
PRD OQ6; BR6; Phase 5 | Pilot owner/data lead | Owner-approved proposal #6: suppress estimates until sample threshold and method are approved.

7 Who may publish announcements/opportunities,
participate in discussions, and are applications handled in
Juune or externally?
PRD OQ7; F6/F7; Phase 7 HR/communications and
pilot owner
Owner-approved proposal #7: explicitly assigned publishers; external opportunity applications; discussions deferred until participation/moderation/retention rules are approved.

8 What are the exact request closure/reopen rules and does
the requester confirm resolution?
PRD OQ8; BR3; Phase 4 | Pilot department leads | Owner-approved proposal #8: authorised staff resolve; requester may submit a reasoned reopen request for manager confirmation; audit the transition.

9 What evidence file types, maximum size, retention and
malware scanning are required?
PRD OQ9; BR5/EC7; Phase
2/4
Security/privacy and
department owners
Owner-approved proposal #9: evidence upload stays disabled until file, scanning, private-storage and retention rules are approved.

10 What POPIA notice, retention schedule, data-subject
process and incident contacts apply?
PRD OQ10; Phase 9 | Institution
privacy/legal/security
contacts
Owner-approved proposal #10: synthetic data only until institutional privacy notice, retention, data-subject and incident requirements are approved.

11 How are platform administrators
appointed/reviewed/removed and who approves sensitive
access grants?
PRD OQ11; SEC11–SEC13;
Phase 8
Institution governance
owner
Owner-approved proposal #11: least privilege, audited admin changes, no self-elevation, and a second approver for administrator grants/removals.

12 What pilot user count, baseline period, pilot duration and
numeric success targets apply?
PRD OQ12; metrics; Phase 10 Product owner and pilot
sponsor
Owner-approved proposal #12: set baseline and numeric success targets before launch; track acknowledgement/resolution times, update compliance and adoption.

13 What institution name, logo, approved department names
and terminology appear in the UI?
PRD OQ13; S1–S12; Phase 7 Pilot sponsor | Owner-approved proposal #13: use Juune and the three confirmed pilot-department names only; omit unapproved institution branding and policy/contact content.

14 What browser support, accessibility commitments and
languages beyond English are required?
PRD OQ14; Section 9; Phase
9
Institution accessibility/IT
teams
Owner-approved proposal #14: target WCAG 2.2 AA, English initially, responsive desktop/tablet/mobile, latest two stable major-browser releases; confirm before release.

15 Where are the final Stitch screen designs/style guide and
approved links/export names?
PRD M2; S1–S12; Section 7.3 Student/design owner Answered:
S1–S12 exports and
DESIGN.md are in
docs/designs; product
owner confirmed design
sign-off on 08 Nov 2026.
16 What is the repository URL and confirmed repository
root/workspace setup?
Sections 4–5 | Technical owner | Answered: https://github.com/Owethudev/Juune-University-Operations-Accountability-Platform.git;
workspace root is the repository root.

# Decision required | Source / phase | Decision owner | Status / answer
17 What exact request reference format is approved?
JU-000123 is only a proposed example.
PRD request reference; OP1;
Phase 3
Product owner | Owner-approved proposal #17: immutable internal UUID plus a separate JU- prefix and eight random uppercase alphanumeric characters for display.

18 Are proposed summary/description limits (5–120 and
10–5,000 characters) approved?
PRD S5; Phase 3 | Product owner | Owner-approved proposal #18: summary 5–120 characters; description 10–5,000; other content uses these limits only with content-owner approval.

19 What rate-limit thresholds and session expiry/revocation
durations are approved?
PRD Sections 5/12; Phase 9 Security owner | Owner-approved proposal #19: IdP-managed sessions preferred; proposed 30-minute idle/12-hour absolute limits and endpoint-specific throttles; confirm values before enforcement.

20 What exact status-transition matrix and permitted on-hold
reasons apply?
PRD 4.3; BR3; Phase 4 | Pilot department leads | Owner-approved proposal #20: assigned staff change status; require reasons for on-hold/resolution; use the Q8 reopen flow and confirm transitions against PRD before coding.

21 What validation messages and field-length limits apply to
announcement/opportunity forms?
PRD S6/S7; BR12; Phase 7 Product/content owner | Owner-approved proposal #21: required title/body; proposed title 5–120 and body 10–5,000 with inline errors; confirm exact copy/limits before coding.

22 What discussion functionality, moderation and retention
rules are included in F6?
PRD F6/S6; OQ7; Phase 7 HR/communications and
pilot owner
Owner-approved proposal #22: staff-only departmental threads, manager moderation, no direct messaging, approved retention; defer if those rules are not in place.

23 What overdue definition, baseline date range and metric
definitions apply to dashboards?
PRD G1–G4; F5; Phase 6 Product owner/pilot
sponsor
Owner-approved proposal #23: role-scoped status/age counts, approved overdue thresholds, sensitive-detail suppression and comparison to a pre-pilot baseline.

24 What package workspace arrangement and backend
TypeScript/JavaScript choice are approved?
PRD 11.1; Sections 4–5 | Technical owner | Owner-approved proposal #24: TypeScript for frontend/backend; root npm workspaces with separate frontend/backend packages.
25 Which content in the supplied Stitch screens is approved
product content versus illustrative placeholder data or
unapproved institutional policy? For example, S11 includes
identity-directory fields, notification channels, session and
retention details; other screens include institution names,
staff identities, contacts and policy references not confirmed
in the PRD.
S1–S12; PRD OQ1/OQ7/OQ10/OQ13; Phase 1 and
design sign-off
Product owner and relevant institutional policy owners | Owner-approved proposal #25: all Stitch names, records, contacts, policies, metrics and preference controls are illustrative unless separately approved; use synthetic data and PRD-approved wording.
26 Which Supabase access and authorization approach is
approved for the Express API: Supabase client or PostgreSQL
driver, and server-side authorization, database row-level
security, or both? How will server credentials be provisioned
without exposing a service-role key?
Sections 4, 6, 8 and 9; PRD OQ2; Phase 1/2
Technical owner and security owner | Owner-approved proposal #26: Express-only Supabase access, server authorization plus PostgreSQL RLS; no service-role key in the browser; privileged use limited to approved server/migration operations.
27 How should T-SETUP-3 prove PostgreSQL connectivity before
Phase 2 creates application tables: a minimal health-check
RPC invoked by the approved Supabase client, or a PostgreSQL
driver used for health checks/tests?
Phase 1 T-SETUP-3; Sections 4.1, 4.3, 6 and 8
Technical owner and security owner | Owner-approved: use a minimal health-check RPC through the approved Supabase client; no separate PostgreSQL driver. Keep application access on the Supabase-client/RLS path.
28 Which profile preference fields, if any, are approved for
editing in Phase 1 S11/OP20? The PRD mentions preferences
if approved, while the supplied screen controls are illustrative.
PRD OP20/S11; Section 18 Q25; Phase 1
Product owner and relevant policy owner | Owner-approved: show own profile fields as read-only and sign-out only; do not expose preference editing or save actions in Phase 1. Enable updates only after specific fields are separately approved.
29 How will trusted user and institution claims reach PostgreSQL
RLS after the institution's OIDC identity has been validated?
The owner approved Supabase client access plus server authorization
and RLS, but did not approve Supabase Auth or a trusted-claim
translation/signing mechanism. Do not trust caller-supplied tenant
headers or use a service-role client that bypasses RLS for user
operations.
PRD Sections 8, 9 and 11.3; Q1/Q26; Phase 2 T-TENANT-1 and T-SEC-15
Technical owner, security owner, and institution identity team | Engineering contract selected at the owner's direction: a gateway-validated signed JWT has `sub` equal to `users.institutional_id` and a signed `institution_id` equal to `institutions.id`; `role=authenticated` is only the PostgREST database role, and application permissions are loaded from database grants. Migrations and synthetic seed are applied only to the owner-authorized isolated test project; the rollback-only SQL allow/deny suite passes there. Actual institutional issuer, audience, signature/JWKS validation and provisioning remain gates before real-user use or any production deployment.

Design-reference clarification (Q15)
• The S1–S12 screen exports and the global DESIGN.md are available under docs/designs/stitch_juune_university_operations_platform/.
• Per-screen functional and state specifications remain in PRD Section 8.3.
• The product owner confirmed S1–S12 design sign-off on 08 Nov 2026.
• Q25 is resolved by the owner-approved proposal #25: screen sign-off is visual only; unapproved example content remains illustrative.

Stack decision update (08 Nov 2026)
• Product owner approved React + Vite for the frontend, Node.js + Express for the backend, and Supabase (PostgreSQL) for the
database.
• This supersedes MongoDB-specific stack references in the original plan. The logical entity requirements remain; their PostgreSQL
schema and authorization policies must be decided before Phase 2.
• Use TypeScript, root npm workspaces, Express-only Supabase client access and PostgreSQL RLS as approved in Q24/Q26. Do not
assume Supabase Auth. OIDC provider selection, trusted identity-claim mapping, project provisioning and credentials remain manual
gates.

Owner-approved answers and conditional gates
The product owner approved all recommendations below on 08 Nov 2026. These answers close the corresponding clarifications.
Follow all conditional gates and request manual intervention before provider provisioning, real-data use, policy-dependent feature
activation, or deployment.

1. Q1 — Use the institution's existing OIDC-compatible identity provider through a replaceable server-side adapter; no local-password
fallback. Use a synthetic test tenant only. The institution must identify the provider and test process.
2. Q2 — Use Supabase PostgreSQL in an institution-approved region, with separate development and production projects. The region,
backup policy and project access must be confirmed before provisioning.
3. Q3 — Host the frontend and API only on institution-approved services in an approved region; require TLS, managed backups and a
tested restore process before any real data or deployment.
4. Q4 — Keep email delivery disabled until the institution approves a provider, sender domain and monitoring. Use in-app notifications
where approved; do not send external email during Phase 1.
5. Q5 — Make reminder cadence and overdue thresholds configurable and leave scheduled reminders disabled until approved. Preserve
the PRD's third-flag escalation rule; require approved recipients and fallback handling before enabling escalation notifications.
6. Q6 — Suppress resolution estimates until the owner approves a minimum sample size and method and the category data meets that
threshold.
7. Q7 — Limit publishing to explicitly assigned, audited HR/communications or departmental publisher roles; keep opportunity
applications external. Defer departmental discussions until participation, moderation and retention rules are approved.
8. Q8 — Require an authorised receiving-department staff member to resolve a request. Proposed reopen flow: requester submits a
reasoned reopen request; an authorised manager confirms the state transition. Record actor, reason and time.
9. Q9 — Disable evidence uploads until allowed file types, size, malware scanning, private storage and retention are approved.
10. Q10 — Use synthetic data only until the institution supplies and approves the privacy notice, retention schedule, data-subject
process and incident contacts. Do not invent a retention period.
11. Q11 — Use least privilege, audited administrator changes and no self-elevation. Require a second designated approver for
administrator grants/removals; the institution must name those approvers.
12. Q12 — Set a pre-pilot baseline and numeric success targets before launch. Track request acknowledgement/resolution times,
status-update compliance and staff adoption; do not invent targets or claim success without owner approval.
13. Q13 — Use only the approved Juune product name and the three confirmed pilot department names. Omit institution-specific
branding, contacts and policy names until supplied.
14. Q14 — Target WCAG 2.2 AA, English initially, responsive desktop/tablet/mobile, and the latest two stable releases of major
browsers. Obtain accessibility/IT approval before release.
17. Q17 — Keep an immutable internal UUID and display a separate non-sensitive reference such as JU- followed by eight random
uppercase alphanumeric characters; approve the visible format before launch.
18. Q18 — Retain the proposed summary length of 5–120 characters and description length of 10–5,000 characters; apply the same
limits to announcement/opportunity title and body only if the content owner approves.
19. Q19 — Prefer institutional-IdP-managed session policy; proposed application session is 30 minutes idle / 12 hours absolute. Use
endpoint-specific rate limits and a configurable sign-in throttle; security owner must approve exact values before enforcement.
20. Q20 — Permit status changes only by authorised assigned-department staff; require a reason for on-hold and resolution, and use
the Q8 reopen flow. Confirm the exact status names and transitions against the PRD before coding.
21. Q21 — Require title and body; propose title length 5–120 and body length 10–5,000 characters with inline, field-specific errors.
Content owner must approve exact limits and wording.
22. Q22 — If discussions remain in MVP, limit them to authenticated staff in the relevant department, make department managers
moderators, exclude direct messaging, and apply the institution's approved retention schedule. Otherwise defer discussions explicitly.
23. Q23 — Show role-scoped counts by status and request age; define overdue only from approved thresholds, exclude sensitive detail,
and compare to a pre-pilot baseline. Approve dashboard formulas and date windows before Phase 6.
24. Q24 — Use TypeScript for frontend and backend in a root npm-workspaces monorepo with separate frontend/backend packages.
Confirm this package layout and language choice before setup.
25. Q25 — Treat all names, staff records, contacts, policy references, metrics and preference controls shown only in the Stitch exports
as illustrative. Use PRD-approved wording and synthetic data; implement only institution-approved profile preference fields.
26. Q26 — Keep database access behind the Express API. Proposed approach: Supabase client with server-side authorization and
PostgreSQL row-level security for tenant boundaries; never expose a service-role key to the browser. Restrict any privileged key to
approved server/migration operations and confirm how trusted identity claims reach database policies.

## 19. Change log

Version | Date | What changed | Why
v1.0 | 03 Nov 2026 First implementation plan drafted from Juune PRD v1.0 Draft. | Initial transfer of scope, data, security,
tests and milestones.
v1.1 | 04 Nov 2026 Rebuilt Section 13 into Foundation, Data & Security, feature phases
capped at two features, separate F8 Governance, separate Hardening and
Release; assigned T-SEC allow/deny pairs, T-BR tests and T-C
component tests to phase Step 1 tables; moved T-EDGE-1 to Phase 8
with OP18; listed EC1–EC12 individually; added OP20/S11 to Phase 1;
corrected rule-test IDs in traceability matrix; documented root-level
IMPLEMENTATION_PLAN.md; updated clarification register and design
references.

Implements mentor feedback dated 03
Nov 2026 while preserving unresolved
institutional decisions as open rather than
inventing approvals.
v1.2 | 08 Nov 2026 Recorded product-owner PRD/design approval and the React/Vite, Node/Express and Supabase/PostgreSQL stack
direction; updated repository and design references; added open decisions for illustrative screen content and Supabase
access/security.
v1.3 | 08 Nov 2026 Recorded owner approval of the conditional recommendations for Q1–Q14 and Q17–Q26; updated the PRD
precedence and implementation gates to match the approved TypeScript, workspace, Supabase-client and RLS decisions.
v1.4 | 08 Nov 2026 Recorded the owner's initial selection of a local Supabase test stack for Phase 1.
v1.5 | 08 Nov 2026 Recorded the owner's later selection of a hosted Supabase test project; hosted region/access approval and
provisioning remain a prerequisite.
v1.6 | 08 Nov 2026 Added Q27 for the Phase 1 PostgreSQL connectivity test mechanism.
v1.7 | 08 Nov 2026 Recorded owner approval of the health-check RPC approach and the hosted test-project selection; updated the
environment-variable and migration guidance for Phase 1.
v1.8 | 08 Nov 2026 Recorded owner confirmation that the hosted test project is provisioned in an approved region; local
environment configuration and the health-check RPC remain pending.
v1.9 | 08 Nov 2026 Added Q28 for the S11/OP20 editable preference fields.
v1.10 | 08 Nov 2026 Recorded owner approval of read-only S11 profile fields and sign-out for Phase 1; preference writes remain disabled pending field approval.
v1.11 | 08 Nov 2026 Recorded Phase 1 implementation progress, local validation results, the health-check migration prerequisite and the remaining hosted database/manual-check gates.
v1.12 | 08 Nov 2026 Recorded passing hosted database check and full Phase 1 check; documented browser smoke results, development API proxy behavior and the remaining identity-provider/manual-review gate.
v1.13 | 08 Nov 2026 Added open Q29 for the trusted identity-claim flow required to implement and test tenant-scoped PostgreSQL RLS in Phase 2; no schema or UI changes made.
v1.14 | 08 Nov 2026 Recorded the owner's candidate preference for institution-issued JWTs validated by Supabase/PostgREST; exact issuer, audience, claims, tenant mapping and schema approval remain unresolved, so Phase 2 implementation is gated.
v1.15 | 08 Nov 2026 Recorded the owner's schema-and-tests-only direction; added a non-deployable relational schema and synthetic seed draft while leaving RLS, tenant policy tests and hosted migration paused.
v1.16 | 08 Nov 2026 Under the owner's later authorization to exercise engineering judgment, selected the signed-claim contract and drafted least-privilege Phase 2 RLS, auditable grants, synthetic authorization fixtures and isolated allow/deny SQL tests; hosted deployment and runtime validation remain pending.
v1.17 | 08 Nov 2026 Recorded deployment to the isolated synthetic test project, passing PostgreSQL migration/seed/RLS validation, the tenant-audit follow-up migration and full local check; human manual review and institutional issuer validation remain gates.

## Coding-agent handoff prompt

Act as a senior software engineer preparing and executing a build plan for an AI coding agent for the Juune University Operations &
Accountability Platform. Use the supplied IMPLEMENTATION_PLAN template, this revised implementation plan, the PRD and the
available Stitch style guide/design references. Copy the template’s Section 2 rules word for word. Preserve Sections 0–19 in order
and remove all template brackets and fill-in guidance. Store IMPLEMENTATION_PLAN.md at the repository root, not under docs/.
• Use stable PRD IDs everywhere: F#, US#, S#, M#, BR#, OP#, SEC#, T- and EC#. Map every requirement to a phase, test and
screen.
• Keep non-goals and future features in Deferred; do not add unapproved functionality.
• Follow TDD for every task: write and run the failing test first, implement the smallest passing change, refactor, run all earlier tests,
manually verify and stop for approval.
• Follow the phase order in Section 13: Foundation → Data and security (all PostgreSQL tables, schemas, indexes, seed data, no UI) → feature
phases with at most two features → F8 Governance → separate Hardening → Release.
• Include every T-SEC allow/deny pair, every T-BR rule test, every T-C component test in a phase Step 1 table, and every T-EDGE test
individually in Section 15.
• Implement OP20 profile read and the complete S11 screen with read-only fields/sign-out for Phase 1; do not expose preference editing until fields are approved.
• Keep secrets out of source code and frontend bundles. Treat VITE_ variables as public. Use backend environment
variables/approved secret manager.
• Enforce authorization server-side for UI and direct API calls. Include allow and deny tests for every permission and tenant boundary.

• Use only supplied design files/links. If a screen export is missing, name the PRD screen specification and mark pixel-level design
sign-off pending; never fabricate a file or URL.
• List unresolved questions in Section 18 with decision owner and phase gate. Do not replace missing decisions with “not specified” and
do not guess; stop when the plan’s approval gate requires it.
• Keep a progress log with actual test counts, commit hashes and manual-check status. Do not claim tests or implementation are
complete until verified.
