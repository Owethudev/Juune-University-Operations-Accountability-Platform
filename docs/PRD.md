# PRODUCT REQUIREMENTS DOCUMENT

## Juune University Operations & Accountability Platform

A centralized digital workplace for university staff and management

Document field | Value
Version | v1.0 — Initial completed draft
Status | Draft — ready for stakeholder review; not yet approved
Prepared | 28 October 2026
Product owner | Not supplied
Institution / course / reviewer | Not supplied
Source concept | OwethuJezileAppConceptDocument.pdf
Template basis | PRD Template — Student Copy.pdf

Purpose: define an implementation-ready first release while explicitly separating confirmed decisions
from assumptions and open questions.

Important: this PRD is grounded in the supplied concept document and the user’s confirmed decisions. Suggested
thresholds, design tokens, technical versions and implementation details are proposals for review, not facts stated by
the concept document.

# Document details and change log

Field | Details
Product | Juune University Operations & Accountability Platform
Version | v1.0
Status | Draft for review
Primary platform | Responsive web application
Initial pilot | IT, Facilities/Maintenance and Administration
Confirmed stack | React + Vite + Tailwind CSS; Node.js + Express; MongoDB
Authentication | Institutional accounts
Notifications | In-app, email, scheduled email summaries/reminders
Integration approach | Standalone pilot, designed for future integrations

Change log

Version Date | Change | Author / status
v0.1 | 28 Oct 2026 | Initial structure based on the correct university operations concept and PRD
template.
Draft

v1.0 | 28 Oct 2026 | Confirmed platform, all eight MVP feature areas, pilot scope, roles, stack,
authentication, notifications, sensitive access and integration approach.
Draft for review

How to read this document
• Confirmed: directly stated in the concept or explicitly selected by the user.
• Proposed: concrete implementation guidance added to make the PRD actionable; validate before production.
• Open question: decision not supplied and should be resolved before the affected implementation phase.
• IDs are stable cross-references: F# features, BR# business rules, US# stories, S# screens, G# goals, T- tests, M# milestones.

# Contents

1. Product overview
2. Users, personas, roles and permissions
3. Goals, metrics and non-goals
4. Features, business rules and notifications
5. Accounts and sign-in
6. User stories, acceptance criteria and edge cases
7. User flows and navigation
8. Screen inventory and screen specifications
9. Design direction and accessibility
10. Data model
11. Technical architecture and implementation
12. Quality, errors, security and privacy

13. Assumptions, risks, open questions and milestones
14. Using this PRD with AI
15. Submission checklist

16. Glossary

# 1. Product overview

1.1 Product pitch
Juune helps university staff route, track and escalate cross-department requests with shared accountability and
operational visibility.

1.2 Problem statement
Universities depend on faculties, academic departments, administration, IT, facilities, finance, HR, libraries and other teams to
keep operations running. Staff may need to coordinate requests across these boundaries, while managers and senior leaders
need reliable visibility into ownership, delays and outcomes. The concept document identifies existing digital
solutions—including ServiceNow for IT service requests at UCT and a service desk system for IT enquiries at Stellenbosch—but
raises the question of whether existing tools provide consistent institution-wide cross-department accountability. The proposed
pilot will measure performance across three departments: IT, Facilities/Maintenance and Administration.

1.3 Solution
Juune is a configurable operational layer for university employees and management. It lets staff submit categorized requests,
review a recommended destination, track status and communications, receive updates, and flag a request that is not receiving
assistance. Managers receive shared visibility; authorized leadership can investigate patterns and bottlenecks. The platform
complements rather than replaces an institution’s LMS, HR software, finance systems or specialist service-management tools.

1.4 Platform
Responsive web application first, designed for phone, tablet and desktop browsers. The initial pilot is standalone but the
architecture should avoid blocking future integrations.

1.5 Product vision
Improve operational coordination, accountability and institutional efficiency by making requests traceable from submission
through acknowledgement, action, escalation and closure.

1.6 Key terms

Term | Definition
Request | A traceable operational issue or service enquiry submitted by an employee.
Requester | The employee who submits or owns a request.
Receiving department | The department selected or recommended to handle a request.
Dual-manager visibility | Notification to both the receiving department’s manager and the requester’s manager.
Escalation | A review notification to an appropriate higher authority after a configured trigger; not an automatic
finding of fault.
Resolution estimate | A category-level estimate based on available institutional historical data, not a guarantee.
Sensitive request | A request whose category or evidence requires restricted access.
Audit trail | A time-stamped record of important actions, including assignments, responses, escalations and
permission changes.

1.7 Product principles
• Accountability without automatic blame: escalation prompts review and investigation.
• Configurable by institution: departments, categories, roles, permissions and workflows must be configurable.
• Complement existing systems: no replacement of specialist university platforms in the pilot.
• Least-privilege access: sensitive requests and evidence are visible only to specifically authorised people.
• Evidence-based evaluation: compare baseline and pilot metrics rather than assuming the product is effective.

# 2. Users, personas, roles and permissions

2.1 Primary personas

Persona | Needs and goals | Pain points / risks | Linked roles
Employee / requester | Submit requests quickly; know who owns
them; see status and responses; attach
permitted evidence; receive announcements
and discover opportunities.

Unclear destination, slow acknowledgement,
repeated follow-up, evidence accidentally
shared too widely.
Employee

Department manager | Assign responsibility, monitor workload, follow
up unresolved items and coordinate with
other departments.
Limited cross-department visibility; overdue
work can be difficult to spot; unclear
ownership.
Department manager

Senior leader | Review institution-wide activity, investigate
recurring bottlenecks and identify areas
needing intervention.
Fragmented reporting; trends may be hidden
across departments; sensitive information
must remain restricted.
Senior leadership

2.2 Roles

Role | Typical capabilities | Enforcement
Employee | Create and track own requests; respond to requests they are authorised
to view; flag lack of assistance; view permitted announcements and
opportunities.
Server checks authenticated identity,
ownership and resource permissions on every
request.
Department manager | View and manage requests assigned to their department; assign
permitted staff; review department dashboard; receive dual-manager
notifications.
Server verifies manager-to-department
assignment and action-specific permission.

Senior leadership | View institution-level operational summaries and inspect histories only
when authorised; receive escalation notifications.
Server checks institution scope and
sensitive-request authorisation; access is
audited.
Platform administrator Configure departments, roles, categories, workflows, escalation paths,
permissions and system settings; review audit events as authorised.
Administrative actions require elevated
server-side permission; permission changes
are audited.

2.3 Permission principles
• No role is trusted solely because a frontend control is hidden; backend authorization is mandatory.
• Users may see only requests within their ownership, assigned department, leadership scope or explicit authorisation.
• Sensitive request access is specifically granted, limited to the necessary scope and recorded in audit logs.
• Evidence access follows the request’s category and sensitivity rules; downloading or exporting evidence must be
permission-checked.
• Administrators cannot silently change access: role, permission and configuration changes create audit events.

2.4 Administration approach
A platform administrator configures each university instance. Department managers operate day-to-day requests within their
departments. Senior leadership has oversight, not unrestricted access to every sensitive record. The exact institutional approval
process for appointing administrators and authorising sensitive-request access remains an open question.

2.5 Persona and role coverage
The three personas map to the Employee, Department manager and Senior leadership roles. Platform administrator is a
required operational role for configuration and governance, although it is not a primary everyday requester persona.

# 3. Goals, metrics and non-goals

3.1 Goals

ID | Goal | Proposed success measure | How to check
G1 | Reduce avoidable delays in
acknowledgement and handling.
Compare median acknowledgement and resolution times
against a pre-pilot baseline; target improvement is set after
baseline measurement.
Pilot dashboard/report using
timestamps, category and status
history.
G2 | Strengthen accountability and visibility. Track percentage of requests with an assigned
department/owner, overdue requests, and escalation
outcomes.
Request records, assignment
history and escalation log.

G3 | Reduce time staff spend chasing
updates.
Staff satisfaction survey and self-reported follow-up effort
improve versus baseline.
Pre- and post-pilot staff survey;
qualitative interviews.
G4 | Validate operational usefulness before
broader adoption.
Pilot operates across IT, Facilities/Maintenance and
Administration with baseline and pilot results reviewed by
stakeholders.
Pilot review report covering metrics,
staff feedback, risks and
recommendation.

Targets for percentage improvements are intentionally not invented. Collect a baseline first, then agree numerical
targets with the pilot institution.

3.2 Non-goals for MVP

Non-goal | Reason
Replace the university LMS, HR, finance or specialist
service-management tools.
The concept explicitly positions Juune as a shared operational layer, not a
replacement.
Build a student-facing request platform. | The concept states students continue using existing LMS and student platforms.
Automatically determine fault or discipline staff when a request
escalates.
Escalation is intended to prompt investigation, not automatic blame.

Guarantee resolution time or automatically perform department
work.
Estimates are based on historical data; the department continues work through
established processes.
Implement deep integrations during the standalone pilot. | The selected approach is standalone first and designed for future integrations.
Roll out immediately to every university department or institution. The concept recommends a controlled pilot in three departments.

3.3 Evaluation baseline
Before launch, record the available baseline for acknowledgement time, resolution time, overdue requests, escalation outcomes
and staff satisfaction. Use consistent definitions, date ranges and request categories in baseline and pilot reports. If historical
data is incomplete, disclose that limitation and avoid claiming a causal improvement.

# 4. Features, business rules and notifications

4.1 Feature scope

ID | Feature | Priority MVP description
F1 | Operational requests | Must | Create categorized requests, choose a category and submit to a
selected/recommended department.
F2 | Request tracking and communication history Must | Show current status, responsible parties, responses, status changes and
permitted evidence.
F3 | Recommended department routing | Must | Recommend a destination based on configured category rules; requester
can correct it before submission.
F4 | Reminders, estimates and escalation | Must | Show estimates where historical data exists; issue reminders; escalate
after three requester flags for lack of assistance.
F5 | Department and leadership dashboards | Must | Show outstanding requests, workload, overdue items and resolution
trends with role-appropriate access.
F6 | Announcements and departmental
discussions
Must | Publish official announcements and departmental updates/discussions.

F7 | Employee opportunities | Must | List internal vacancies, promotions, temporary assignments, training and
professional-development opportunities.
F8 | Configurable governance | Must | Configure departments, roles, permissions, workflows, escalation paths
and categories; audit important actions.

4.2 Business rules

ID | Rule
BR1 | A request must have a requester, category, summary/description and selected destination before submission.
BR2 | The routing recommendation is advisory. The requester can correct the destination before submitting.
BR3 | Every request has a status, creation timestamp and status-change history; status changes record actor and timestamp.
BR4 | The receiving department’s manager and the requester’s manager are notified when a request is submitted or routed, subject to valid
manager assignments and permissions.
BR5 | A request communication or evidence item is visible only to users authorised for that request and its sensitivity category.
BR6 | If institutional historical data is available and adequate, calculate category-level typical resolution estimates from that data. If not, display
that no reliable estimate is available.
BR7 | A requester’s third flag of the same request as not receiving assistance triggers an escalation notification to the configured appropriate
higher authority. The system records the flag count and escalation event.
BR8 | Escalation triggers review; it does not automatically assign blame, mark misconduct or close a request.
BR9 | Reminder cadence and overdue thresholds are institution-configurable. Defaults must be approved before pilot launch.
BR10 Managers can act only within their assigned department and granted permissions; senior leadership views institution-wide summaries but
sensitive record access remains restricted.
BR11 Configuration, assignment, response, escalation and permission changes create audit events containing actor, time, action and relevant
record reference.
BR12 Announcements and opportunities must have a publisher, title, body, publication state and relevant audience; expired or unpublished
content is not presented as current.
BR13 Only authorised administrators can change role permissions, routing rules, categories and escalation paths.
BR14 The pilot includes IT, Facilities/Maintenance and Administration; additional departments are out of scope unless the pilot owner approves
expansion.

4.3 Request status lifecycle

Status | Meaning / permitted transition
Submitted | Created and routed; awaiting acknowledgement. Initial status.
Acknowledged | Receiving department confirms receipt.
In progress | Responsible department has begun work or is coordinating action.
Waiting for requester | More information or action is needed from the requester.
On hold | Work is paused with a recorded reason; allowed reasons to be configured.
Resolved | Department reports that the issue has been addressed; requester confirmation policy remains open.
Closed | Request is formally closed by an authorised action under the institution’s closure policy.
Reopened | A previously resolved/closed request is returned to active work if reopening is permitted by configured policy.
Escalated | Escalation event/flag, preferably recorded as a separate event rather than replacing operational status.

4.4 Notifications

Event | Recipients | Channel | Notes
Request submitted/routed | Requester, receiving department manager,
requester’s manager
In-app + email | Respect access rules; deduplicate
recipients.
Status or response update | Requester and authorised request participants In-app + email | Avoid sending sensitive request
content in email subject/body.
Reminder due / request overdue Responsible owner/department manager;
requester as configured
In-app + scheduled email Cadence is configurable; exact
default is an open question.
Third lack-of-assistance flag | Configured higher authority, requester,
relevant authorised managers
In-app + email | Explicit escalation event and audit
record.
New announcement | Target audience | In-app; email where
configured
Institution/department audience
settings apply.
Opportunity published or nearing
closing date
Eligible audience / opted-in recipients | In-app + scheduled email Eligibility and subscription
behaviour need confirmation.
Permission/configuration changed Affected administrator / security contact as
configured
In-app + email | Audit record mandatory.

4.5 MVP boundaries
All eight feature areas are included in the MVP by user decision. This is a broad MVP; implementation should be phased so that
request creation, access control, tracking and auditability are reliable before dashboards and content feeds are opened to pilot
users.

# 5. Accounts and sign-in

Decision | Requirement
Account model | Institutional accounts; the institution supplies or approves the identity source and
account-provisioning process.
Sign-in | Authenticated staff access only. The precise mechanism—SSO, institutional email/password, or
another approved method—is not specified and remains open.
User eligibility | Employees and management participating in the pilot; students are not intended users.
Roles | Employee, department manager, senior leadership and platform administrator.
Account provisioning | Proposed: administrators invite or activate users and assign institution, department and role.
Validate with the pilot institution.
Password reset / recovery | If the selected institutional identity method delegates credentials, recovery is handled by that
identity provider. If local credentials are selected, secure recovery must be designed.
Session management | Use secure session/token handling, expiration and revocation; exact session duration is an
implementation decision.
Account deactivation | Deactivated users must not authenticate; preserve audit history and records according to
institutional retention policy.
MFA | Recommended for administrators and privileged roles; confirm institutional policy.

Open implementation detail: “Institutional accounts” describes the identity source, but does not by itself confirm a
specific protocol such as SAML, OpenID Connect, or local credentials. Do not implement a guessed identity
integration.

# 6. User stories, acceptance criteria and edge cases

Acceptance criteria use test IDs T-###. They are intended to be independently testable. Each Must feature includes an unhappy
path.

US1 — F1 — Submit a request
As an employee, I want to submit a categorized operational request so the appropriate department can act on it.
• AC1: Given an authenticated employee with required fields completed, when they submit, then a request is created with a
unique ID, timestamp, initial status and selected destination. (T-001)
• AC2: Given a required field is missing or invalid, when the employee submits, then no request is created and field-specific
guidance is shown. (T-002)
• AC3: Given the request is successfully created, when the save completes, then the requester sees a confirmation and can
open the request detail. (T-003)

US2 — F2 — Track a request
As a requester or authorised participant, I want to see status and communication history so I know what has happened and who
is responsible.
• AC1: Given a user is authorised, when they open a request, then current status, assigned department/owner and chronological
permitted history are displayed. (T-004)
• AC2: Given an unauthorised user attempts to open the request URL directly, then the backend denies access without revealing
sensitive record details. (T-005)
• AC3: Given a status or response is added, then the actor and timestamp are recorded in history. (T-006)

US3 — F3 — Recommend routing
As an employee, I want a suggested destination based on category so I can route a request correctly.
• AC1: Given a category has a configured destination, when selected, then the recommended department is shown before
submission. (T-007)
• AC2: Given the recommendation is wrong, when the requester chooses another permitted department, then the corrected
destination is saved and used. (T-008)
• AC3: Given no rule matches the category, then the interface clearly requests a manual destination or reports that routing needs
administrator configuration. (T-009)

US4 — F4 — Reminders, estimates and escalation
As a requester or manager, I want reminders, realistic estimates and escalation so stalled requests can be reviewed.
• AC1: Given adequate historical data exists for a category, then the system displays a category-level estimate with clear
wording that it is not a guarantee. (T-010)
• AC2: Given historical data is absent or inadequate, then no fabricated estimate is shown; the interface states that an estimate
is unavailable. (T-011)
• AC3: Given the requester flags the same request three times as not receiving assistance, then one escalation event is created
and the configured higher authority is notified. (T-012)
• AC4: Given a reminder is due under configured policy, then the correct authorised recipients receive an in-app and/or email
notification without duplicate sends for the same scheduled event. (T-013)

US5 — F5 — View dashboards
As a department manager or authorised leader, I want to view operational summaries so I can identify workload and bottlenecks.
• AC1: Given a department manager, then dashboard counts and lists are limited to their permitted department scope. (T-014)
• AC2: Given senior leadership, then institution-level summaries are available while sensitive request details remain restricted
unless explicitly authorised. (T-015)
• AC3: Given no requests match the filters, then an empty state explains that there are no matching requests and offers a way to
clear filters. (T-016)

US6 — F6 — Publish announcements
As an authorised publisher, I want to post institutional or departmental announcements so staff receive official updates.
• AC1: Given a user has publish permission, when they publish an announcement with required fields, then it appears to its
configured audience and records the publisher/time. (T-017)
• AC2: Given a user lacks publish permission, when they attempt to publish through UI or direct API call, then the action is
denied and audited where appropriate. (T-018)
• AC3: Given an announcement is unpublished or expired, then it is not shown as current to the audience. (T-019)

US7 — F7 — Discover opportunities
As an employee, I want to browse internal opportunities so I can find vacancies, training and professional development.
• AC1: Given published opportunities exist, then each card shows title, type, department/owner where configured, closing date
where applicable and a detail action. (T-020)
• AC2: Given an opportunity is unpublished or past its configured closing date, then it is not shown as currently open. (T-021)
• AC3: Given no opportunities are available, then a helpful empty state is displayed. (T-022)

US8 — F8 — Configure governance
As a platform administrator, I want to configure departments, roles, categories and workflows so Juune matches institutional
operations.
• AC1: Given an authorised administrator changes a configuration, then the change is validated, saved and written to the audit
trail with actor and timestamp. (T-023)
• AC2: Given a non-admin attempts the same change through the API, then the server denies the action regardless of frontend
state. (T-024)
• AC3: Given an administrator tries to remove the last active administrator or create an invalid routing/escalation configuration,
then the system blocks the change and explains the correction needed. (T-025)

6.9 Additional edge cases

ID | Edge case | Expected behaviour
EC1 | A department is deactivated while it has open
requests.
Block deactivation or require reassignment of open requests before completion.

EC2 | Requester’s manager or receiving manager is not
configured.
Create/route only according to approved fallback policy; show an
administrator-facing configuration warning and log the issue.
EC3 | User clicks Submit repeatedly due to slow network. Prevent duplicate requests using client state and a server-side idempotency
strategy where practical.
EC4 | Email provider is unavailable. | Keep the request saved; retry notification safely and show in-app notification
where possible; log delivery failure.
EC5 | Third flag arrives concurrently from multiple browser
tabs.
Use an atomic server-side count so exactly one threshold-crossing escalation
event is created.
EC6 | Historical resolution data is sparse or skewed. | Do not display an unreliable estimate; document the minimum sample rule before
pilot.
EC7 | Evidence file type, size or content is not permitted. Reject upload with a specific safe message; do not expose storage paths.
EC8 | Sensitive request is included in a dashboard
aggregate.
Apply approved privacy rules; suppress or aggregate sensitive details where
needed.
EC9 | User loses access while a page is open. | Re-check authorization on each server action and refresh; deny further access.
EC10 | Request is reopened after resolution. | Record reopening actor, time and reason; return it to an allowed active status.
EC11 | A scheduled reminder job runs twice. | Deduplicate by request, reminder type and scheduled time.
EC12 | Opportunity closes while a user is viewing it. | Re-check current state before any action and show that it is no longer open.

# 7. User flows and navigation

7.1 Flows for every Must feature
F1 — Submit request
Sign in → Home → New Request → Choose category → Review recommended department → Correct destination if needed →
Enter summary/details → Add permitted evidence if needed → Submit → Confirmation → Request Detail.

F2 — Track and communicate
Sign in → My Requests or notification → Request Detail → Read current status/history → Add permitted response or evidence
→ Save → Timeline updates and participants are notified.

F3 — Routing
New Request → Select category → System reads active routing configuration → Show recommended department → Requester
confirms or selects permitted alternative → Save destination with request.

F4 — Reminder / escalation
Scheduled job checks due rules → Create reminder notification → If requester flags lack of assistance, increment count → At
third flag, create escalation event → Notify configured higher authority → Authorized reviewer opens case history and records
follow-up.

F5 — Dashboards
Sign in → Role-based Home/Dashboard → Apply department/date/status filters → Review counts and trend views → Open
permitted request detail → Record follow-up if authorised.

F6 — Announcements
Authorised publisher → Announcements → Create/Edit draft → Choose audience → Preview → Publish → Audience feed and
notification; staff open announcement and view discussion if permitted.

F7 — Opportunities
Employee → Opportunities → Browse/filter list → Open detail → Review type, description and dates → Follow configured
application/contact link or instructions. Application processing itself is out of scope unless approved.

F8 — Governance
Platform administrator → Admin Console → Choose configuration area → Edit
departments/roles/categories/routing/escalation/access → Validate → Confirm → Save → Audit event and updated
configuration.

7.2 Navigation map

Screen ID | Screen | Entry points / destinations
S1 | Sign in | Entry → S2 Home after successful authentication
S2 | Home / role dashboard | Navigation to S3, S4, S6, S7, S8, S9 based on role
S3 | My Requests / Request Queue | S4 Request Detail; S5 New Request
S4 | Request Detail | S3; status/response/evidence actions; escalation flag action
S5 | New Request | S3 after success; S2 on cancel
S6 | Announcements | S6A Announcement Detail / discussion; publisher create/edit modal
S7 | Opportunities | S7A Opportunity Detail
S8 | Notifications | Open related request, announcement or opportunity
S9 | Admin Console / Configuration | S9A configuration detail; S10 Audit Log
S10 | Audit Log | S9; access restricted to authorised administrators/security reviewers
S11 | Profile & Settings | S2; sign out; notification preferences where approved
S12 | Access Denied / Error | Return to prior safe page or S2; no sensitive data revealed

Screen inventory intentionally includes 12 full screens/pages. Modals for publishing/editing content, adding responses
and confirming configuration changes are described as shared modal patterns below; exact modal inventory can be
refined during design.

# 8. Screen inventory and screen specifications

8.1 Inventory

ID | Screen | Who can open it | Purpose
S1 | Sign in | Logged out / institutional identity flow Authenticate staff.
S2 | Home / role dashboard | All authenticated roles | Show role-relevant summary and navigation.
S3 | My Requests / Request Queue | Employee; manager; leadership as
permitted
Find and filter requests within access scope.

S4 | Request Detail | Authorised request participants | Review status, history, communication, evidence and
allowed actions.
S5 | New Request | Employee; authorised manager acting
for a requester if allowed
Create a request and confirm routing.

S6 | Announcements | Authenticated staff; publish actions
role-gated
Read announcements and permitted discussions.

S7 | Opportunities | Authenticated staff | Browse internal opportunities.
S8 | Notifications | Authenticated staff | Review notification history and open related content.
S9 | Admin Console / Configuration | Platform administrator | Manage institutional configuration.
S10 | Audit Log | Authorised administrator / security
reviewer
Inspect important actions and access events.

S11 | Profile & Settings | Authenticated staff | Review profile, notification preferences if enabled,
and sign out.
S12 | Access Denied / Error | Any user when needed | Explain denied or failed actions safely.

8.2 Shared screen-state requirements
Every screen must implement applicable states. Do not use fake data in production.

State | Required behaviour and copy
Normal | Render only data the current user is authorised to see; show clear headings and next actions.
Empty | Explain what is absent and give the next useful action. Example: “No requests yet. Create a request to get started.”
Loading | Show labelled skeletons or progress indicators; disable duplicate submissions while saving.
Error | Show a human-readable message and a Retry action when retry is safe. Do not show raw stack traces or database errors.
Offline | Banner: “You’re offline. Reconnect to load the latest information.” Disable actions that cannot be safely queued; do not claim
a request was saved.
Success | Show a concise confirmation and the next location. Example: “Request submitted. Your reference is JU-000123.” Reference
format is proposed.
Access denied | Show “You don’t have permission to view this item.” Do not reveal whether a restricted record exists.

8.3 Screen specifications
S1 — Sign in
Purpose: Authenticate via approved institutional identity mechanism.
Access: Logged-out users.
Navigation: Direct entry → S2 on success; failures remain on S1.
Layout: Header/logo and product name; short explanation; institutional sign-in action; support link; privacy notice.
Forms / validation: Fields depend on identity provider. If redirected SSO is used, do not collect local password. Error: “We
couldn’t sign you in. Check your institutional account or contact your university support team.”
States and sample content: Normal: sign-in action visible. Loading: “Connecting to your institution…” Error: generic safe
message. Offline: explain connection required. Success: redirect to S2. Sample institution and account labels must be supplied
by pilot owner.

S2 — Home / role dashboard
Purpose: Provide the next actions and summary relevant to the signed-in role.

Access: All authenticated roles.
Navigation: S1 → S2 → S3/S5/S6/S7/S8/S9/S11.
Layout: Top bar with Juune name, notification indicator and profile; role-specific summary cards; quick action “New Request”;
recent requests; announcements and opportunities preview; role-aware navigation.
Forms / validation: No form fields by default. Cards show title, status, department and last updated time. Buttons route only to
permitted screens.
States and sample content: Normal: role-specific data. Empty: “Nothing needs your attention right now.” Loading: skeleton
cards. Error: “We couldn’t load your dashboard. Try again.” Offline banner. Success: after request submission, confirmation
summary. Example content: “Classroom projector not working”, “Access card issue”, “Shared printer offline” are illustrative only.

S3 — My Requests / Request Queue
Purpose: Search and filter accessible requests.
Access: Employee; managers; leadership within permitted scope.
Navigation: S2 → S3 → S4 or S5.
Layout: Heading; search; filters for status/category/department/date; request list/table responsive to viewport; pagination; “New
Request” for permitted users.
Forms / validation: Search text; dropdown filters. Validation: invalid date range cannot be applied; clear filters resets the list.
States and sample content: Normal: reference, summary, category, department, status, updated time. Empty: “No requests
match these filters.” Loading: row skeletons. Error: “We couldn’t load requests. Try again.” Offline banner. Success: new request
appears at top if within filters. Sample statuses: Submitted, Acknowledged, In progress.

S4 — Request Detail
Purpose: Show a request’s current state and permitted history, and allow authorised interactions.
Access: Only authorised participants/roles.
Navigation: S3/S8 → S4 → S3.
Layout: Reference and status; summary/category; requester and department; assigned owner; estimate if reliable; timeline;
response composer; permitted evidence list; flag-not-receiving-assistance action; available status actions based on role.
Forms / validation: Response text area; optional evidence upload under category policy; flag confirmation. Reject empty
response if submitting a response. Upload type/size rules remain to be configured.
States and sample content: Normal: chronology and action controls. Empty history: creation event still shown. Loading:
skeleton timeline. Error: retry. Offline: actions disabled. Success: response/flag confirmation. Access denied: generic denial.
Sample content uses synthetic records only.

S5 — New Request
Purpose: Capture request details and confirm destination.
Access: Employee; other roles only if institution allows acting on behalf of staff.
Navigation: S2/S3 → S5 → S4 after success.
Layout: Step/section for category; routing recommendation; destination selector; summary; description; evidence upload if
allowed; cancel and submit actions.
Forms / validation: Category dropdown required; summary required (proposed 5–120 characters); description required
(proposed 10–5,000 characters); destination required; evidence type/size limits to be configured. Inline exact errors: “Choose a
category.” “Enter a short summary.” “Enter a description.” “Choose a destination department.”
States and sample content: Normal: category and destination. Loading: submit disabled and progress shown. Error: retain
safe form values and show retry. Offline: disable submission. Success: “Request submitted.” Show reference and link to S4.
Example categories: IT support, Facilities/Maintenance, Administration, Procurement enquiry.

S6 — Announcements
Purpose: Read official announcements and permitted departmental updates/discussions.
Access: All authenticated staff; publishing controls only for authorised publishers.

Navigation: S2 → S6 → announcement detail/discussion.
Layout: Feed filters for institution/department; cards with title, publisher, publish date, audience; detail view; discussion list if
enabled; authorised create/edit/publish action.
Forms / validation: Create/edit modal fields: title, body, audience, publish state, optional expiry. Exact maximum lengths to be
set in implementation config.
States and sample content: Normal: current published items. Empty: “There are no announcements for this audience yet.”
Loading skeleton cards. Error with retry. Offline banner. Success: “Announcement published.” Unpublished/expired content not
shown as current.

S7 — Opportunities
Purpose: Browse vacancies, promotions, temporary assignments, training and development opportunities.
Access: All authenticated staff, subject to audience restrictions.
Navigation: S2 → S7 → opportunity detail.
Layout: List/search/filter by type, department and closing date; card with title, type, department/owner where configured, closing
date; detail with description and approved application/contact instructions.
Forms / validation: Opportunity creation/edit is available only if included in admin/publisher permissions; fields: title, type,
description, audience, open/close dates, application instructions/link. External links must be approved and safe.
States and sample content: Normal: current published opportunities. Empty: “No opportunities are available right now.”
Loading skeleton. Error with retry. Offline banner. Success after publishing where authorised. Expired opportunities are clearly
marked or hidden per approved policy.

S8 — Notifications
Purpose: View and act on notification history.
Access: Authenticated staff.
Navigation: Top bar → S8 → related authorised record.
Layout: Unread count; list with event label, date/time, short non-sensitive preview; mark read; open related item.
Forms / validation: No user form by default. Mark-read action must be idempotent.
States and sample content: Normal: newest first. Empty: “You’re all caught up.” Loading skeleton. Error with retry. Offline
banner. Success: unread count updates. If related item access has been revoked, show generic access denied.

S9 — Admin Console / Configuration
Purpose: Configure institution-specific departments, roles, categories, routing, workflows and escalation paths.
Access: Platform administrator only.
Navigation: S2 → S9 → configuration subsection.
Layout: Configuration navigation; tables with current values; create/edit forms; validation summaries; confirm modal for
high-impact changes; save/cancel.
Forms / validation: Fields vary by configuration entity. Require names, active state and valid references; do not permit
impossible routing targets or removal of the final active administrator.
States and sample content: Normal: current configuration. Empty: guided initial setup. Loading skeleton. Error: retain form and
show retry. Success: “Settings saved.” High-impact changes require confirmation and audit logging.

S10 — Audit Log
Purpose: Inspect security-relevant changes and operational events.
Access: Explicitly authorised administrator/security reviewer.
Navigation: S9 → S10.
Layout: Search/filter by date, actor, action type and record reference; read-only event list/detail; export only if explicitly
approved.
Forms / validation: Filters only; never expose secrets, full sensitive evidence or unnecessary personal data.

States and sample content: Normal: newest first. Empty: “No audit events match these filters.” Loading skeleton. Error with
retry. Access denied for unauthorised roles. Audit records are append-only from the application perspective.

S11 — Profile & Settings
Purpose: Review profile, notification settings if enabled, and sign out.
Access: Authenticated staff.
Navigation: Profile menu → S11 → S2 after sign out.
Layout: Show the authenticated user's name, institutional email, department and role as read-only; provide sign-out. Do not
include illustrative preference controls or unapproved institution-specific privacy content.
Forms / validation: No editable fields in Phase 1. Do not allow users to self-assign role, department or institution scope. Any
future preference fields require separate approval.
States and sample content: Normal: current profile. Loading skeleton. Error with retry. Sign-out clears local session state and
redirects to S1. The “Preferences saved.” success state applies only after editable fields are approved and enabled.

S12 — Access Denied / Error
Purpose: Provide safe recovery when an action fails or access is refused.
Access: Any role.
Navigation: Any route/action error → S12 or inline error → safe return.
Layout: Plain explanation; reference ID if available; retry or return-to-home action; support guidance.
Forms / validation: No data-entry form unless a future support-ticket feature is approved.
States and sample content: Normal: context-safe message. Loading only for retry. Error: no stack traces. Offline: connectivity
message. Success: safe route restored. Never confirm existence of a restricted record.

8.4 Shared components

Component | Used on | Behaviour
Responsive top bar | S2–S11 | Product name, page title, notifications and profile; collapses appropriately on
mobile.
Role-aware navigation | S2–S11 | Only show links the role may use; backend still enforces all access.
Request status badge | S2–S5, S8 | Text label plus icon/shape; never colour alone.
Timeline item | S4 | Event type, actor if permitted, timestamp, message and evidence reference.
Notification toast | All screens | Short confirmation/error; persistent errors also appear inline.
Empty-state panel | Lists/dashboards | Explain the empty state and provide a useful next action.
Confirmation modal | S4, S6, S7, S9 | Summarise irreversible/high-impact action; explicit cancel and confirm.
Offline banner | All data screens | Fixed message and no false claims of saved data.

8.5 Sample data policy
Use synthetic South African names and non-real institutional data in demos and tests. Do not seed real employee personal
information or sensitive requests. Institution-specific names, departments, categories, logo and example records must be
supplied or approved by the pilot institution.

# 9. Design direction and accessibility

9.1 Visual direction

Token | Proposed value | Usage
Primary navy | #18324B | Header, primary navigation, strong headings.
Primary blue | #2F6690 | Links, selected controls and secondary emphasis.
Accent teal | #3A7D7A | Success-adjacent emphasis, focus accents and charts; not sole status
signal.
Page background | #F7F9FB | Main application canvas.
Surface | #FFFFFF | Cards, forms and dialogs.
Border | #D8E0E7 | Dividers, outlines and table boundaries.
Body text | #17212B | Main text.
Muted text | #5B6570 | Secondary text only after contrast verification.
Danger | #9B2C2C | Errors/destructive actions with text/icon.

Typography / spacing | Proposed value
Font family | System UI sans-serif; do not load an external font unless approved.
H1 / page title | 28 px desktop; 24 px mobile; 1.25 line-height.
H2 / section title | 20 px; 1.3 line-height.
Body text | 16 px minimum; 1.5 line-height.
Small text | 12 px minimum; use sparingly.
Spacing scale | 4, 8, 12, 16, 24, 32, 40, 48 px.
Control height | Minimum 44 px for interactive targets.
Card radius | 8 px; modal radius 12 px.
Content width | Maximum 1200 px; long-form reading width approximately 760 px.

9.2 Tone of voice
Professional, calm, clear and non-accusatory. Example: “This request has been escalated for review. The escalation asks the
appropriate authority to investigate the delay; it does not determine fault.”

9.3 Responsive platform rules
• Design web-first. At widths below 640 px, use a compact header, stacked cards and filters in a collapsible panel.
• At 640–1024 px, use compact two-column layouts where space permits; avoid dense dashboard tables without a mobile
alternative.
• Above 1024 px, use a left side navigation and content area with maximum width 1200 px.
• Every clickable element must have hover and visible keyboard-focus states. All actions must be keyboard accessible.
• Tables must reflow or provide a clear horizontal-scroll treatment on narrow screens; primary actions remain discoverable.

9.4 Accessibility
• Body text at least 16 px and small text at least 12 px.
• Text contrast ratio at least 4.5:1 for normal text; verify every foreground/background pair before design approval.
• Interactive targets at least 44 × 44 px where practical.
• Never use colour alone for status, errors or priority; combine colour with text and/or icons.
• Provide accessible labels for icon-only controls, meaningful alt text for informative images, logical heading order and visible
focus indicators.
• Forms announce validation errors to assistive technology and associate errors with the relevant fields.

• Charts include text summaries or accessible tabular alternatives.
The palette is a proposed starting point, not a claim that every pair already passes contrast. Validate exact
combinations before approval.

# 10. Data model

Proposed MongoDB document model. Use ObjectId references or stable IDs, schema validation, timestamps and indexes.
Apply access checks in server services/controllers for every read and write. Field-level privacy and retention rules require
institutional approval.

10.x Entity: User
Institutional staff account

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | Immutable primary ID | —
institution_id | Link to Institution | Yes Assigned | No | Must match active tenant | Block delete if
referenced
institutional_id | Text (max 120) | Yes None | Yes within
institution
External identity identifier; do not
assume national ID
—

name | Text (max 120) | Yes None | No | Display name | —
email | Email | Yes Identity source Yes within
institution
Verified/managed by institutional
identity source
—

department_id | Link to Department No None | No | Must be active if assigned | Clear only after
reassignment
role_ids | Choice / role
references
Yes Employee | No | Only admin-authorised
assignment
Block unsafe
removal
status | Choice | Yes Invited/active No | invited, active, suspended,
deactivated
Retain audit history

created_at / updated_at Date-time | Yes Now | No | Stored UTC; display SAST | —

10.x Entity: Department
Department within an institution

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
institution_id | Link to Institution | Yes Assigned | No | Tenant scope | Block delete if
referenced
name | Text (max 120) | Yes None | No | Unique active name per institution
(proposed)
—

type | Choice | Yes Configured | No | IT, Facilities/Maintenance,
Administration, Other
—

manager_user_ids | Link to User | No None | No | Active users with manager
permission
Reassign before
delete
status | Choice | Yes active | No | active, inactive | Block deactivation
with open requests
unless reassigned
created_at / updated_at Date-time | Yes Now | No | UTC timestamps | —

10.x Entity: Request
Operational request

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
reference | Text (max 30) | Yes Generated | Yes | Human-friendly reference; format
to confirm
—

institution_id | Link to Institution | Yes Assigned | No | Tenant scope | Block delete if
referenced
requester_id | Link to User | Yes Current user No | Must be active at submission Retain
reference/audit
category_id | Link to
RequestCategory
Yes Selected | No | Active category required | Block category
deletion if referenced

Field | Type | Req. Default | Unique? Rules | Delete behaviour
department_id | Link to Department Yes Confirmed
destination
No | Active destination required | Reassign before
deactivation
assigned_to_user_id Link to User | No None | No | Must be permitted in receiving
department
Clear or reassign

summary | Text (max 120) | Yes None | No | Proposed 5–120 characters | —
description | Long text (max 5000) Yes None | No | Proposed 10–5000 characters;
sensitive data warning
—

status | Choice | Yes submitted | No | Submitted, Acknowledged, In
progress, Waiting for requester,
On hold, Resolved, Closed,
Reopened

Status transitions
audited

sensitivity | Choice | Yes category default No | standard, restricted | —
estimate_days | Decimal | No None | No | Only if historical estimate passes
approved quality threshold
—

lack_of_assistance_flags Whole number | Yes 0 | No | Atomic increment; third flag
triggers escalation
—

created_at / updated_at Date-time | Yes Now | No | UTC; display SAST | —
resolved_at / closed_at Date-time | No None | No | Set on valid transitions | —

10.x Entity: RequestCategory
Configured request category

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
institution_id | Link to Institution | Yes Assigned | No | Tenant scope | Block delete if
referenced
name | Text (max 120) | Yes None | No | Unique active name per institution —
description | Long text (max 1000) No None | No | Plain text | —
default_department_id Link to Department Yes Configured | No | Active department | Block invalid
destination
sensitivity_default | Choice | Yes standard | No | standard or restricted | —
evidence_policy | Long text (max 1000) No None | No | Approved file types/size/visibility
policy
—

active | Yes/No | Yes Yes | No | Inactive categories unavailable for
new requests
Retain historic
requests

10.x Entity: RequestEvent
Immutable request history event

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
request_id | Link to Request | Yes Assigned | No | — | Retain according to
policy
actor_user_id | Link to User | No System or user No | Null only for system event; system
actor type recorded
Retain audit history

event_type | Choice | Yes None | No | created, status_changed,
assigned, response, flag,
escalation, evidence_added,
reopened, closed

—

message | Long text (max 5000) No None | No | Must not expose hidden content to
unauthorised readers
—

metadata | Long text / structured
object
No None | No | Whitelist safe fields; never secrets —

created_at | Date-time | Yes Now | No | UTC, append-only | —

10.x Entity: Notification
User notification delivery record

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
recipient_user_id | Link to User | Yes Assigned | No | — | Delete/archive per
retention policy
event_type | Choice | Yes None | No | Configured notification types | —
related_entity_type/id Choice + ID | No None | No | Must pass permission check when
opened
—

channel | Choice | Yes in_app | No | in_app, email | —
status | Choice | Yes pending | No | pending, sent, failed, read | —
dedupe_key | Text (max 200) | No Generated | Yes | Unique per scheduled
event/recipient/channel
—

created_at / sent_at /
read_at
Date-time | Yes/N
o
Now/None | No | UTC timestamps | —

10.x Entity: Announcement
Published institutional or departmental update

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
institution_id | Link to Institution | Yes Assigned | No | Tenant scope | Block delete if
referenced
title | Text (max 160) | Yes None | No | Plain text | —
body | Long text (max 10000) Yes None | No | Sanitize rich text if supported —
audience_department_id
s
Links to Department No Institution-wide if
approved
No | Audience permission validated —

publisher_user_id | Link to User | Yes Current user No | Must have publish permission Retain audit
state | Choice | Yes draft | No | draft, published, unpublished,
expired
—

published_at / expires_at Date-time | No None | No | UTC timestamps | —

10.x Entity: Opportunity
Internal vacancy/training/development listing

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
institution_id | Link to Institution | Yes Assigned | No | Tenant scope | Block delete if
referenced
title | Text (max 160) | Yes None | No | Plain text | —
type | Choice | Yes None | No | vacancy, promotion, temporary
assignment, training, professional
development
—

description | Long text (max 10000) Yes None | No | Plain text or sanitised rich text —
audience_department_id
s
Links to Department No Configured | No | Audience policy | —

publisher_user_id | Link to User | Yes Current user No | Must have publish permission —
state | Choice | Yes draft | No | draft, published, unpublished,
expired
—

opens_at / closes_at Date-time | No None | No | Validate date ordering | —
application_url /
instructions
Link / Long text | No None | No | Approved safe URL or instructions —

10.x Entity: AuditEvent
Security and configuration audit record

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
institution_id | Link to Institution | Yes Assigned | No | Tenant scope | —
actor_user_id | Link to User | No System actor
possible
No | Actor type recorded | Retain per policy

action | Text (max 120) | Yes None | No | Assignment, response, escalation,
permission change, config
change, access event
—

target_type / target_id Text + ID | Yes None | No | No sensitive body content by
default
—

timestamp | Date-time | Yes Now | No | UTC, append-only | —
outcome | Choice | Yes success | No | success, denied, failed | —
correlation_id | Text (max 120) | No Generated | No | Trace related server events | —

10.x Entity: Institution
Tenant / university configuration boundary

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
name | Text (max 160) | Yes None | No | Official display name supplied by
institution
—

timezone | Text (max 80) | Yes Africa/Johannesb
urg proposed
No | Confirm institution timezone | —

configuration | Long text / structured
object
No None | No | Validated configuration only;
secrets stored elsewhere
—

status | Choice | Yes pilot | No | setup, pilot, active, suspended —
created_at / updated_at Date-time | Yes Now | No | UTC timestamps | —

10.x Entity: EscalationEvent
Threshold-triggered review event

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
request_id | Link to Request | Yes Assigned | No | — | Retain history
trigger | Choice | Yes third_flag | No | third_flag or approved future
trigger
—

flag_count_at_trigger Whole number | Yes 3 | No | Must be >= configured threshold —
authority_user_ids | Links to User | Yes Configured | No | Explicitly authorised recipients —
status | Choice | Yes open | No | open, under_review,
action_recorded, closed
—

created_at / reviewed_at Date-time | Yes/N
o
Now/None | No | UTC timestamps | —

10.x Entity: Attachment
Evidence attached to a request

Field | Type | Req. Default | Unique? Rules | Delete behaviour
id | ID | Yes Auto | Yes | — | —
request_id | Link to Request | Yes Assigned | No | — | Retain/delete per
policy
uploaded_by_user_id Link to User | Yes Current user No | Must have request access | —

Field | Type | Req. Default | Unique? Rules | Delete behaviour
storage_key | Text (max 500) | Yes Generated | No | Private storage reference; never
expose publicly
—

file_name | Text (max 255) | Yes Original sanitised
name
No | Sanitise; do not trust extension —

mime_type | Text (max 120) | Yes Detected | No | Allowlist and content validation —
size_bytes | Whole number | Yes Detected | No | Maximum to be configured | —
sensitivity | Choice | Yes Inherited | No | At least as restrictive as request —
created_at | Date-time | Yes Now | No | UTC timestamp | —

10.2 Relationships
• Institution 1—many Users, Departments, RequestCategories, Requests, Announcements, Opportunities and AuditEvents.
• User 1—many Requests as requester; Users may manage departments and receive Notifications.
• Department 1—many Requests and categories; department managers are Users.
• Request 1—many RequestEvents, Attachments and EscalationEvents.
• RequestCategory 1—many Requests and one configured default department.
• Notification points to a recipient and optionally a related entity; opening a link always re-checks authorization.

10.3 Status changes and indexes
Request status transitions should be enforced by a service-layer transition map, with actor, time and reason recorded.
Recommended indexes: institution_id + status + updated_at; requester_id + created_at; department_id + status + updated_at;
request_id + created_at on RequestEvent; recipient_user_id + status + created_at on Notification; institution_id + timestamp on
AuditEvent. Add unique indexes for institution-scoped email/institutional ID and notification dedupe key where applicable.

10.4 Seed data and test accounts
Seed only synthetic data: the three pilot departments; sample categories for IT support, Facilities/Maintenance and
Administration; example users for each role; several requests across status values; a sample announcement; a sample
opportunity; and test audit events. Create test accounts through a controlled seed script or test identity provider. Never commit
real credentials or production secrets. Test account names and institution branding are pending pilot-owner approval.

# 11. Technical architecture and implementation

11.1 Proposed stack

Layer | Proposed technology | Notes
Frontend | React 19.x + TypeScript; Vite 7.x; Tailwind CSS 4.x Version ranges are a proposed baseline; pin compatible stable patch
versions during implementation.
Routing / UI | React Router 7.x; accessible component primitives
as needed
Keep navigation role-aware, not security-dependent.

Backend | Node.js 22 LTS + Express 5.x | Confirm supported versions and dependency compatibility before
lockfile creation.
Database | Supabase (PostgreSQL)
Selected by product owner on 08 Nov 2026; use Express-only Supabase client access,
server authorization and PostgreSQL RLS. Project region/credentials and trusted identity-claim
mapping remain gated.

Validation | Zod or Joi (choose one during implementation) | Validate body, params, query and configuration at the API boundary.
Authentication | Institutional identity integration; protocol/provider
open
Do not implement a guessed provider. Institutional accounts are
confirmed; SSO mechanism is not.
Email | Institution-approved transactional email service Provider, sender domain, bounce handling and credentials are open.
Testing | Vitest + React Testing Library; Supertest; Playwright
(proposed)
Use unit, API integration and end-to-end tests.

Deployment | Institution-approved hosting; separate frontend, API
and database configuration
Hosting provider and production environment are open questions.

The versions above are planning baselines rather than versions confirmed by the concept document. Before
implementation, verify compatibility and current supported releases, then pin exact versions in package manifests and
lockfiles.

11.2 Architecture
Browser → React application → HTTPS API client → Express routes → authentication middleware → request validation →
authorization middleware/service checks → controllers → services/business rules → repository/data-access layer → Supabase
(PostgreSQL).
Background workers or scheduled jobs handle reminders and email delivery. A notification service records in-app notifications
and queues email attempts. Audit events are written for required operations.

11.3 How the parts connect
The frontend submits requests to a versioned REST API. The API authenticates the institutional user, validates input and applies
role, ownership, department, institution and sensitivity checks before reading or changing data. Services apply business rules
and write request changes plus history/audit events. Notification delivery failures must not undo a successfully saved request;
failed deliveries are recorded and retried safely.

11.4 Permissions matrix

Entity/action | Employee | Dept manager | Senior leadership Platform admin
Request: create | Own / permitted | If policy allows | If policy allows | Only if explicitly
allowed
Request: read | Own/explicitly
authorised
Assigned department +
explicit grants
Summary; detail only if
authorised
Only as needed and
authorised
Request: update status/assign | Own response/flag only Within assigned
department
No by default; approved
intervention only
Configuration/override
only if policy permits
Request: sensitive evidence | Explicit grant only Explicit grant only | Explicit grant only | Explicit grant only;
audited
Announcement: read | Audience | Audience | Audience | Audience
Announcement: publish/edit | No by default | If granted | If granted | Configure/grant
publisher permission
Opportunity: read | Audience | Audience | Audience | Audience
Opportunity: publish/edit | No by default | If granted | If granted | Configure/grant
publisher permission
Configuration: roles/routing/categories | No | No | No by default | Yes; audited
Audit log: read | No | No by default | If explicitly granted Yes if authorised
User: change role | No | No | No by default | Yes; audited

11.5 Environment variables

Name | Purpose | Source | Visibility
VITE_API_BASE_URL | Frontend API base URL | Deployment configuration | Public
SUPABASE_URL | Supabase project URL | Supabase project settings | Non-secret; server configuration
SUPABASE_ANON_KEY | Supabase public/anonymous API key used only by the backend health check | Supabase project settings | Public; server-side configuration only
SUPABASE_SERVICE_ROLE_KEY | Supabase service-role credential, only if required by the approved access approach | Supabase project
settings | Secret; backend only, never frontend
AUTH_ISSUER_URL | Institutional identity issuer, if applicable Institution/identity provider | Server-side config; not a
secret by itself
AUTH_CLIENT_ID | Identity client ID, if required | Identity provider | Depends on provider;
usually public client
identifier, confirm
AUTH_CLIENT_SECRET | Identity client secret, if required | Identity provider | Secret
SESSION_SECRET /
TOKEN_SIGNING_KEY
Session/token signing if local backend
manages it
Secret manager | Secret

EMAIL_PROVIDER_API_KEY | Transactional email credential | Email provider | Secret
EMAIL_FROM_ADDRESS | Approved sender address | Institution/email provider | Server config; not secret
APP_BASE_URL | Public app URL used in links | Deployment config | Public
NODE_ENV | Runtime mode | Deployment config | Non-secret
LOG_LEVEL | Server logging verbosity | Deployment config | Non-secret
UPLOAD_STORAGE_BUCKET / URL Private evidence storage location | Storage provider | Server config; credentials
secret
UPLOAD_STORAGE_KEY | Storage access credential if applicable Storage provider | Secret
RATE_LIMIT_WINDOW_MS | API rate-limit window | Implementation config | Non-secret
RATE_LIMIT_MAX | Request limit per window | Implementation config | Non-secret

Create a committed .env.example with these names and placeholder values only. Never commit real credentials, access tokens,
personal data or production connection strings.

11.6 Suggested folder structure
frontend/
src/
app/ routes, app shell and providers
components/ shared accessible UI components
features/ requests, dashboards, announcements, opportunities, admin
services/ API client and typed endpoint functions
hooks/ reusable React hooks
types/ shared frontend types
styles/ Tailwind entry and design tokens
backend/
src/
config/ environment parsing and application config
middleware/ auth, validation, authorization, rate limits, error handling
routes/ versioned route definitions
controllers/ thin HTTP adapters
services/ business rules and orchestration
repositories/ Supabase/PostgreSQL access
models/ schemas and indexes
jobs/ reminders and notification retry jobs
notifications/ in-app/email delivery
audit/ audit event helpers
utils/ shared safe utilities
tests/
docs/
PRD.md
MASTER.md
security-and-privacy.md
runbooks/

11.7 Testing plan

Test type | Scope | Required checks
Unit | Services, validators, routing and status-transition
logic
BR2, BR6–BR9, BR13; estimates unavailable when data inadequate;
third flag threshold.
API integration | Express routes, authorization and database
persistence
T-001–T-025; denied access; role/department/tenant scoping; audit event
creation.
Frontend component Forms, empty/loading/error/offline states and
keyboard navigation
Validation messages; no duplicate submit; responsive states.

End-to-end | Critical pilot journeys in browser | Employee submits and tracks; managers update; escalation reaches
configured authority; announcement/opportunity publishing.
Security | Authentication, direct URL/API access, upload
restrictions, rate limiting, secrets scan
Server-side authorization; no sensitive data leak; safe errors; private
evidence.
Performance | Representative list/dashboard data and pilot
concurrency
Pagination, indexes, response timing and slow-network behaviour.

Accessibility | Keyboard-only, screen reader labels, contrast
and zoom
Section 9.4 requirements.

11.8 Five-minute demo script
• Sign in as a synthetic employee.
• Create an IT or Facilities request and confirm the suggested destination.
• Sign in as a receiving department manager and acknowledge/update the request.
• Show the request timeline and dual-manager notifications.
• Flag lack of assistance until the third flag and show the escalation event and audit trail.
• Open a role-appropriate dashboard and inspect a published announcement and opportunity.
• Sign in as administrator and show category/routing configuration and audit log.

# 12. Quality, errors, security and privacy

12.1 Quality requirements

Area | Requirement
Speed | Proposed target: core screens show useful content or loading feedback within 3 seconds on a typical broadband/mobile
connection for pilot-sized data; validate with measured tests.
Data usage | Paginate request lists (proposed 20 items/page); avoid loading attachments until requested; compress/resize any
uploaded previews.
Offline | MVP is online-first. Show the exact offline banner in Section 8.2; do not claim unsent requests are saved offline.
Devices | Responsive from 360 px wide; test current supported Chrome, Edge, Firefox and Safari versions agreed before pilot.
Language and region | English initially. Display dates such as 12 Mar 2026, use 24-hour time and SAST where appropriate; store timestamps in
UTC. Confirm each institution’s timezone.
Accessibility | Meet Section 9.4; include keyboard, screen reader, contrast and zoom checks.
Scale | Initial pilot scale is not specified. Design for a configurable pilot cohort and run load tests once expected active users and
data volume are known.
Abuse limits | Apply rate limits to sign-in, request creation, flagging, upload and other abuse-sensitive endpoints. Exact thresholds are
configurable and must be set before production.
Reliability | A database or email failure must not produce false success. Record operation outcomes and use safe retry/idempotency
behaviour.

12.2 Standard error messages

Situation | Exact message | Next action
No internet | You’re offline. Reconnect to load the latest information. | Disable unsafe submissions; allow retry when
reconnected.
Server/unknown error | Something went wrong. Please try again. If the problem
continues, contact your university support team.
Retry safe action; show a reference ID if available.

Session expired | Your session has expired. Sign in again to continue. | Redirect to institutional sign-in after preserving no
sensitive form data in an unsafe location.
Permission denied | You don’t have permission to view or change this item. | Return to a safe screen; do not disclose record
existence.
Validation error | Please check the highlighted fields and try again. | Focus first invalid field and announce errors
accessibly.
Upload rejected | This file can’t be uploaded. Check the permitted file type and
size.
Keep request form state; do not reveal storage
paths.
Notification delivery failed Your request was saved, but one or more notifications could not
be sent yet.
Retry delivery in background; show in-app state
where possible.
No estimate available | A reliable resolution estimate isn’t available for this category yet. Continue without a numeric estimate.

12.3 Security requirements
• Use HTTPS in deployed environments and secure cookies/session handling where applicable.
• Validate all input on the server; use allowlists for enumerated values, file types and configuration options.
• Enforce authentication, authorization, institution scope, request ownership and sensitivity permissions on every API request.
• Use least privilege for database credentials, storage access, background workers and administrators.
• Store evidence privately; use short-lived authorised access links if object storage is used; scan uploads where feasible.
• Protect against common web risks including injection, cross-site scripting, cross-site request forgery where applicable, broken
access control and brute-force attempts.
• Rate-limit authentication and abuse-sensitive operations; log security-relevant denials without logging passwords, tokens or full
sensitive content.
• Keep secrets in environment/secret-management configuration; rotate exposed credentials and scan repository history.
• Audit assignment, response, escalation, permission/configuration changes and sensitive access according to the institution’s
policy.

• Back up data and test restoration before production pilot; define incident response contacts and procedures.

12.4 Privacy and governance
The platform will handle employee identity, operational request content, communications and potentially sensitive evidence. The
institution must determine the lawful basis, purposes, data minimisation, access policy, retention periods, deletion/archiving
rules, incident process and responsible privacy/security contacts before real staff data is loaded.
• Treat South African POPIA as a relevant legal consideration if the pilot operates in South Africa; institutional legal/privacy
review is required and this PRD is not legal advice.
• Collect only fields needed for operational coordination; warn users not to include unnecessary sensitive personal information.
• Define category-specific evidence rules and access permissions before enabling uploads for sensitive request categories.
• Avoid putting sensitive request descriptions or attachments in email notifications; link to the authenticated platform instead.
• Define retention and deletion policy for requests, attachments, audit logs and deactivated users before pilot launch.
• Use synthetic data in development and demos; production data must not be copied to local development without explicit
approval and safeguards.

# 13. Assumptions, risks, open questions and milestones

13.1 Assumptions to validate

ID | Assumption | How to check
A1 | Pilot departments can provide a named manager and routing
owner.
Confirm with IT, Facilities/Maintenance and Administration leads
before configuration.
A2 | The institution can supply an approved institutional identity
method.
Meet IT/identity team and confirm protocol, test tenant and
provisioning process.
A3 | Historical request data may be available to support category
estimates.
Assess data availability, quality, categories, timestamps and sample
sizes; suppress estimates if insufficient.
A4 | Staff will use Juune as an operational tracking layer while
continuing existing department work processes.
Pilot interviews and workflow mapping.

A5 | Email and in-app notifications are acceptable for pilot
communications.
Confirm email provider, sender approval, delivery expectations and
privacy rules.
A6 | The selected stack can be hosted in an institution-approved
environment.
Review infrastructure, procurement, security and data residency
constraints.

13.2 Risks

Risk | Likelihood Impact | Mitigation
Existing tools already cover the same gap. Medium | High | Conduct competitor analysis and interviews before committing to
broad rollout.
Unclear ownership or incomplete department
configuration causes misrouting.
Medium | High | Name routing owners, validate category maps and provide manual
correction.
Sensitive evidence is exposed to
unauthorised users.
Medium | High | Least privilege, category-specific policies, backend tests, audit
logs and security review.
Poor historical data makes resolution
estimates misleading.
High | Medium | Use quality thresholds; show no estimate when data is insufficient.

Notification delivery failures reduce trust. Medium | Medium | Delivery logging, retries, in-app notifications and operational
monitoring.
Too many features delay MVP validation. High | High | Phase delivery; establish acceptance gates and prioritise reliable
request lifecycle first.
Staff interpret escalation as blame or
disciplinary action.
Medium | High | Use neutral copy, communicate process and record escalation as
a review trigger only.
Identity provider, hosting or privacy
approvals delay launch.
Medium | High | Resolve dependencies early and do not load real staff data before
approval.

13.3 Open questions

ID | Question requiring decision | Owner / timing
OQ1 Which identity protocol/provider implements “institutional accounts” (e.g. SSO provider, institutional
login portal, or approved local account process)?
Institution IT/identity team; before
authentication build.
OQ2 Which MongoDB hosting option is approved, and should the backend use Mongoose or the native
driver?
Technical owner; before data-layer
build.
OQ3 Which hosting provider, data region, backup policy and deployment process are approved? | Institution/technical owner; before
deployment.
OQ4 Which transactional email provider, sender domain and delivery monitoring approach will be used? Institution IT/communications;
before notification build.
OQ5 What are the exact reminder cadence, overdue thresholds, retry policy and escalation
recipient/fallback rules?
Pilot department managers and
sponsor; before F4 acceptance.
OQ6 What minimum historical sample size and calculation method make a category resolution estimate
reliable?
Pilot owner/data lead; before
estimates are enabled.
OQ7 Who may publish announcements and opportunities, who can participate in discussions, and are
opportunity applications handled in Juune or externally?
HR/communications and pilot
owner; before F6/F7 release.
OQ8 What are the exact request closure/reopen rules and does the requester confirm resolution? | Pilot department leads; before
request lifecycle is finalised.
OQ9 What file types, maximum file size, retention period and malware scanning are required for evidence? Security/privacy and department
owners; before uploads.
OQ10 What POPIA/privacy notice, retention schedule, data subject process and incident contacts apply? Institution privacy/legal/security
contacts; before real data.
OQ11 How are platform administrators appointed, reviewed and removed, and who approves sensitive
access grants?
Institution governance owner;
before pilot.
OQ12 What are the expected pilot user count, baseline period, pilot duration and numeric success targets? Product owner and pilot sponsor;
before measurement.
OQ13 What institution name, logo, approved department names and terminology should appear in the
interface?
Pilot sponsor; before design
sign-off.
OQ14 What are the final accessibility/browser support commitments and any required languages beyond
English?
Institution accessibility/IT teams;
before release.

The PRD is intentionally marked Draft because these open questions affect implementation and pilot readiness. They
are not silently resolved by assumptions.

13.4 Milestones

Milestone | Deliverable / definition of done | Evidence | Target
M0 — Idea submitted Correct concept document reviewed; product scope and purpose
recorded.
Source concept document | Complete

M1 — PRD approved Stakeholders resolve blocking questions, review metrics and approve
PRD.
Approved PRD and change log TBD

M2 — Design ready | Style guide and all S1–S12 screen states reviewed for consistency,
responsive behaviour and accessibility.
Design file and review checklist TBD

M3 — Build plan ready MASTER.md maps every F#, BR#, US#, S#, T- and environment variable
to implementation steps.
MASTER.md and .env.example
review
TBD

M4 — MVP built | All eight features implemented in agreed phases; Must acceptance
criteria pass in test environment.
Repository, deployed test app
and test results
TBD

M5 — Pilot ready | Identity, privacy, security, backups, notification delivery, support process
and synthetic-data tests approved.
Pilot readiness checklist | TBD

M6 — Pilot evaluated Baseline and pilot metrics plus staff feedback reviewed; go/no-go
decision documented.
Pilot evaluation report | TBD

# 14. Using this PRD with AI

Use this section only after the PRD is reviewed and approved. The PRD is the source of truth; if an AI implementation tool finds
ambiguity, update this document and its change log first.

Step 0 — Generate a style guide
Provide Sections 8.3 and 9 to the design tool. Ask it to create a one-page style guide using only the specified colours,
typography, spacing, shared components, states and accessibility rules. Require it to identify any contrast pair that fails instead
of silently changing the palette.

Step 1 — Generate screens one at a time
For each S# screen, provide the persona/role, screen inventory, full specification, sample data and Section 9 design direction.
Require Normal, Empty, Loading, Error, Offline and Success states where applicable. Do not allow unapproved features or new
screen elements.

Step 2 — Generate MASTER.md
Ask the coding assistant to build a phased plan using every feature, rule, story, screen, test and environment variable in this
PRD. Include the data model, permissions, routing rules, status transitions, audit trail, error messages, seed data and Definition
of Done for each phase.

Step 3 — Build phase by phase
• Read MASTER.md and docs/PRD.md before coding.
• Build only the requested phase; do not add features or remove agreed behaviour.
• Use thin controllers and service/repository separation; enforce authorization on the server.
• Run tests and the application after each phase; list anything not completed and stop.
• Review the result on a real browser/device, commit the completed phase, then continue.

Step 4 — Final comparison
Compare the built app against Sections 6, 8 and 9. List every mismatch, fix the PRD first if the specification is unclear,
regenerate affected screens if necessary, and re-test.

Recommended phased build sequence

Phase | Scope | Definition of done
Phase 1 | Project foundation, configuration, institutional auth
integration boundary, role checks and audit foundation.
App runs; environment validation works; unauthorized API tests
pass; no secrets committed.
Phase 2 | F1 requests, F2 tracking/history and F3 routing. | Employee submits request; routing is correctable; timeline and
access checks pass.
Phase 3 | F4 reminders, estimates, notifications and escalation. | In-app/email events work; third flag creates one escalation;
estimates are suppressed without adequate data.
Phase 4 | F5 dashboards and reporting. | Role scopes enforced; filters, empty states and baseline metrics
validated.
Phase 5 | F6 announcements and F7 opportunities. | Publishing permissions, audience visibility, expiry and responsive
screens pass.
Phase 6 | F8 configuration/governance, security hardening and pilot
readiness.
Configuration and audit events pass; privacy, backup, restore,
accessibility and end-to-end checks approved.

# 15. Submission checklist

Area | Checklist item
Document | Correct concept used; no AVBOB cemetery concept details included.
Document | Product name, version, status and source documents recorded.
Overview | Pitch is 20 words or fewer; problem statement includes a measurable evaluation context.
Users | Personas map to roles; role enforcement and admin approach are stated.
Goals | Four goals have measures and a way to check them; non-goals include reasons.
Features | All eight user-selected MVP feature areas are included.
Rules | Business rules have BR IDs; status lifecycle and notification events are documented.
Accounts | Institutional accounts decision recorded; identity protocol remains an explicit open question.
Stories | Every feature has a story and 2–4 acceptance criteria with test IDs, including unhappy paths.
Edge cases | At least five edge cases included.
Flows | Each feature has a user flow; navigation map covers all screens.
Screens | 12 screens have specifications, forms, validation, states and sample content guidance.
Design | Exact proposed hex colours, typography, spacing, responsive rules and accessibility requirements recorded.
Data | Entities, fields, relationships, status transitions, indexes and seed-data approach documented.
Technical | Stack, architecture, permissions matrix, environment variables, folder structure and testing plan included.
Security/privacy | Authorization, sensitive access, audit, evidence and privacy requirements documented.
Open questions | Unresolved decisions are visible and assigned a suggested owner/timing.
Milestones | Definitions of done included; target dates remain TBD rather than invented.
Approval | Stakeholder review and approval still required before implementation begins.

Current completion state: the PRD is fully drafted for review, but not Approved. Resolve the blocking open questions
and complete stakeholder sign-off before treating it as a build-ready final specification.

# 16. Glossary

Term | Meaning in this PRD
API | Application Programming Interface; the contract used by the frontend to communicate with the
backend.
Audit event | A time-stamped record of a security-relevant or operationally important action.
Baseline | Measurements taken before the pilot, used for comparison.
Department scope | The set of requests and information a user may access because of their assigned department and
permissions.
Institution scope / tenant | The university boundary used to separate one institution’s users, requests and configuration from
another’s.
MVP | Minimum Viable Product; the first release intended to test the core value with pilot users.
POPIA | South Africa’s Protection of Personal Information Act; relevant privacy obligations require institutional
review.
RBAC | Role-Based Access Control; permissions assigned according to user roles, supplemented here by
ownership, department and sensitivity checks.
REST API | An HTTP API organised around resources and standard request methods.
SSO | Single Sign-On; authentication through an institutional identity provider.
SAST | South African Standard Time (UTC+2); display timezone to confirm for each institution.
Status transition | A permitted change from one request state to another, recorded with actor and timestamp.
Unhappy path | An error, denial, invalid input or other non-success scenario that the product must handle safely.
Resolution estimate | A historical-data-based typical time estimate, not a guarantee.

Approval record

Role | Name | Decision | Date
Product owner | Not supplied | Pending | —
Pilot sponsor / university representative | Not supplied | Pending | —
Technical reviewer | Not supplied | Pending | —
Privacy / security reviewer | Not supplied | Pending | —

End of PRD — Juune University Operations & Accountability Platform — v1.0 Draft.

# Juune University Operations & Accountability Platform

PRODUCT REQUIREMENTS DOCUMENT — REVISION 1.1 ADDENDUM

Prepared for: Owethu Jezile | Revision date: 04 November 2026 | Status: Draft — owner approval still required

## Purpose and precedence

This addendum updates PRD v1.0 in response to the implementation-plan feedback dated 03 November 2026. It does not replace
the product vision, feature scope, roles, business rules, screen specifications, data model or security principles already recorded in
PRD v1.0. Where this addendum adds implementation traceability or clarifies an existing requirement, it is to be read together with
the original PRD. Unresolved institutional decisions remain open; no provider, policy threshold or governance decision is invented.

## 1. Revision summary

• Preserves the eight MVP feature areas F1–F8 and the three-department pilot scope (IT, Facilities/Maintenance and Administration).
• Clarifies that OP20 (read/update profile preferences) and the complete S11 Profile & Settings screen are in the Foundation phase;
S11 is not a shell-only placeholder.
• Adds explicit, traceable test IDs for all 14 business rules (T-BR1-1 through T-BR14-1), all 15 permission allow/deny pairs (T-SEC-1a/b
through T-SEC-15a/b) and all 10 shared components (T-C-1 through T-C-10).
• Confirms EC10 as a required reopen-after-resolution case and requires its own test T-EDGE-10.
• Aligns implementation phases to Foundation → Data and security → feature phases of at most two features → F8 Governance →
separate Hardening → Release.
• Records the design references that are actually available and distinguishes the global style guide/PRD screen specifications from
individual Stitch screen exports, which were not supplied with this revision.

## 2. Screen design reference register (S1–S12)

The supplied source set for this revision contained the feedback PDF, the submitted implementation-plan PDF and PRD v1.0 PDF.
It did not contain individual Stitch screen export images or share links. The available global design reference is the Library file
Juune_Stitch_Style_Guide_and_Prompts.pdf; the authoritative per-screen functional layouts and required states are the screen
specifications in PRD Section 8.3. The table below is a traceable register, not a claim that image exports exist.
Screen ID Screen | Available design reference | Export status
S1 | Sign in | PRD 8.3 S1; global style guide/prompt PDF | Individual export not supplied
S2 | Home / role dashboard | PRD 8.3 S2; global style guide/prompt PDF | Individual export not supplied
S3 | My Requests / Request Queue | PRD 8.3 S3; global style guide/prompt PDF | Individual export not supplied
S4 | Request Detail | PRD 8.3 S4; global style guide/prompt PDF | Individual export not supplied
S5 | New Request | PRD 8.3 S5; global style guide/prompt PDF | Individual export not supplied
S6 | Announcements | PRD 8.3 S6; global style guide/prompt PDF | Individual export not supplied
S7 | Opportunities | PRD 8.3 S7; global style guide/prompt PDF | Individual export not supplied
S8 | Notifications | PRD 8.3 S8; global style guide/prompt PDF | Individual export not supplied
S9 | Admin Console / Configuration | PRD 8.3 S9; global style guide/prompt PDF | Individual export not supplied
S10 | Audit Log | PRD 8.3 S10; global style guide/prompt PDF | Individual export not supplied
S11 | Profile & Settings | PRD 8.3 S11; global style guide/prompt PDF | Individual export not supplied
S12 | Access Denied / Error | PRD 8.3 S12; global style guide/prompt PDF | Individual export not supplied

Design implementation rule
• Use the PRD Section 8.3 screen specification and global style guide as the current functional/design-direction source.
• Do not invent a Stitch share URL, exported filename or visual element. Do not describe any individual screen export as supplied
unless the actual file/link is added to the project.
• Pixel-level visual sign-off remains part of milestone M2 — Design ready. The project owner/design owner must attach the S1–S12
exports or approved links and review responsive states, accessibility and consistency before design sign-off.

Subsequent owner update (08 November 2026): S1–S12 exports and the global DESIGN.md are now present under
docs/designs/stitch_juune_university_operations_platform/. The product owner approved the screen designs. This does not by itself
approve illustrative names, contact details, institutional policies, sample data or preference controls shown in the exports; see the
implementation plan's Section 18 Q25.

## 3. Profile preferences and OP20 clarification

OP20 — Read/update profile preferences is a required MVP backend operation, not a blanket reference to navigation. The full S11
Profile & Settings screen is included in Phase 1 Foundation. The product owner resolved Q28 by approving read-only own-profile fields
and sign-out only for Phase 1; no editable preference fields or save action are exposed until separately approved. A user must never be
able to self-assign or change their role, department or institution scope. Sign-out clears local session state and returns the user to S1.
• Operation: OP20 — Read/update profile preferences.
• Screen: S11 — Profile & Settings.
• Permission: SEC14; T-SEC-14a allows reading the user's own profile; T-SEC-14b denies unsupported profile/preference writes,
including role/department changes.
• Acceptance test: T-OP20-1 — authenticated user reads only their own profile; no profile/preference edits are exposed in Phase 1;
sign-out clears the session.
• The exact success message “Preferences saved.” applies only after editable fields are separately approved and implemented.
• Controls shown in the Stitch exports are illustrative unless separately approved; do not infer notification settings from mockups.

## 4. Test traceability additions

4.1 Business-rule tests
Business rule Test ID | Test assertion
BR1 | T-BR1-1 | Request requires requester, category, summary/description and destination before submission.
BR2 | T-BR2-1 | Routing is advisory; requester can correct destination before submit.
BR3 | T-BR3-1 | Request status, creation time and status-change history persist with actor/time.
BR4 | T-BR4-1 | Receiving manager and requester’s manager are notified when valid assignments/permissions exist.
BR5 | T-BR5-1 | Communication and evidence visibility follows request permission and sensitivity.
BR6 | T-BR6-1 | Category estimate is shown only when institutional historical data is adequate.
BR7 | T-BR7-1 | Third same-request flag creates an escalation event and notification.
BR8 | T-BR8-1 | Escalation triggers review; it does not imply blame, misconduct or automatic closure.
BR9 | T-BR9-1 | Reminder cadence and overdue thresholds use approved institution configuration.
BR10 | T-BR10-1 | Managers act within assigned departments; leadership sees permitted institution summaries.
BR11 | T-BR11-1 | Configuration, assignment, response, escalation and permission changes create audit events.
BR12 | T-BR12-1 | Announcements/opportunities have publisher, title, body, state and audience; expired/unpublished content is not
current.
BR13 | T-BR13-1 | Only authorised administrators change roles, permissions, routing, categories and escalation paths.
BR14 | T-BR14-1 | Pilot is limited to IT, Facilities/Maintenance and Administration unless approved expansion.

4.2 Permission allow/deny test pairs
Permission Allow / deny tests | Test assertion
SEC1 | T-SEC-1a / T-SEC-1b | Request create: permitted active scoped user allowed; invalid/inactive/unauthorised create denied.
SEC2 | T-SEC-2a / T-SEC-2b | Request read: authorised requester/participant allowed; unrelated/out-of-scope read denied.
SEC3 | T-SEC-3a / T-SEC-3b | Request update/assignment: permitted assigned manager allowed; cross-department action denied.
SEC4 | T-SEC-4a / T-SEC-4b | Request events/responses: authorised participants allowed; unauthorised history/response denied.
SEC5 | T-SEC-5a / T-SEC-5b | Evidence: authorised private access allowed; unauthorised upload/read/download denied.
SEC6 | T-SEC-6a / T-SEC-6b | Dashboard: scoped manager/leadership summary allowed; sensitive/out-of-scope detail denied.
SEC7 | T-SEC-7a / T-SEC-7b | Announcement read: published/unexpired/audience allowed; other content denied.
SEC8 | T-SEC-8a / T-SEC-8b | Announcement publish/edit: authorised publisher allowed; non-publisher mutation denied.
SEC9 | T-SEC-9a / T-SEC-9b | Opportunity read: published/current/audience allowed; other content denied.
SEC10 | T-SEC-10a / T-SEC-10b | Opportunity publish/edit: authorised publisher allowed; non-publisher mutation denied.
SEC11 | T-SEC-11a / T-SEC-11b | Configuration: platform administrator valid change allowed; non-admin/invalid/final-admin removal denied.
SEC12 | T-SEC-12a / T-SEC-12b | Audit read: authorised reviewer allowed; unauthorised access and unnecessary data exposure denied.
SEC13 | T-SEC-13a / T-SEC-13b | Role/permission change: approved administrator allowed with audit; non-admin privilege change denied.
SEC14 | T-SEC-14a / T-SEC-14b | Profile: own-profile read allowed; unsupported preference, role and department updates denied in Phase 1.
SEC15 | T-SEC-15a / T-SEC-15b | Tenant boundary: matching institution access allowed; cross-institution read/write denied.

4.3 Shared-component tests
Test ID | Component | Test assertion
T-C-1 | Responsive top bar | Desktop/mobile layout, title, notification indicator and profile.
T-C-2 | Role-aware navigation | Links filtered by role; backend authorization remains authoritative.
T-C-3 | Request status badge | Text and icon/shape convey status; colour is never the only cue.
T-C-4 | Timeline item | Permitted actor, event type, timestamp and safe message/evidence reference.
T-C-5 | Notification toast | Success/error state; persistent errors also appear inline.
T-C-6 | Empty-state panel | Helpful empty message and useful next action.
T-C-7 | Confirmation modal | Cancel/confirm behaviour for high-impact actions.
T-C-8 | Offline banner | Exact offline message; no false save claim.
T-C-9 | Form field / validation | Accessible label, hint, error association and announcement.
T-C-10 | Loading skeleton | Labelled loading/progress state.

## 5. Edge-case traceability

The existing PRD Section 6.9 already defines EC1–EC12. The implementation plan must retain each case as its own test row; this
addendum explicitly maps all twelve to test IDs. EC10 is not optional and must be implemented with the request reopen operation
(OP7) in the tracking phase.
Test ID | PRD edge case | Expected behaviour
T-EDGE-1 | EC1 — Department deactivation with open
requests
Block deactivation or require reassignment before completion; build with OP18.

T-EDGE-2 | EC2 — Missing requester/receiving manager Use only approved fallback; otherwise block/alert and log configuration warning.
T-EDGE-3 | EC3 — Repeated submit | Idempotency prevents duplicate requests.
T-EDGE-4 | EC4 — Email provider unavailable | Request remains saved; retry is safe; in-app notice where possible.
T-EDGE-5 | EC5 — Concurrent third flag | Atomic count creates exactly one escalation event.
T-EDGE-6 | EC6 — Sparse/skewed history | Suppress unreliable estimate.
T-EDGE-7 | EC7 — Evidence not permitted | Reject safely; do not expose storage path.
T-EDGE-8 | EC8 — Sensitive record in dashboard | Suppress/aggregate sensitive details under approved privacy rules.
T-EDGE-9 | EC9 — Access revoked while page open | Re-check every server action and deny subsequent access.
T-EDGE-10 | EC10 — Request reopened after resolution Record actor, time and reason; return to an allowed active status.
T-EDGE-11 | EC11 — Scheduled reminder runs twice | Deduplicate by request, reminder type and scheduled time.
T-EDGE-12 | EC12 — Opportunity closes while viewed | Re-check current state before action; show no longer open.

## 6. Implementation phase alignment

The implementation plan uses the following phase structure. This sequence is a delivery recommendation and does not silently
change product scope or resolve institution approvals.
Phase Name | Scope
1 | Foundation and application shell | Complete S11 / OP20; authentication boundary; role-aware shell.
2 | Data and security | All PostgreSQL tables mapped from the logical entities, schema validation, indexes, SEC1–SEC15 policy tests and synthetic seed
data; no UI.
3 | F1 Operational requests | At most one feature.
4 | F2 Tracking and F3 routing | Two features.
5 | F4 Reminders, estimates and escalation | One feature.
6 | F5 Dashboards and reporting | One feature.
7 | F6 Announcements and F7 Opportunities | Two features.
8 | F8 Governance and configuration | One feature; includes OP18/OP19 and T-EDGE-1.
9 | Hardening and pilot readiness | Separate from F8; no new feature scope.
10 | Release | Approved deployment and pilot-readiness sign-off.

## 7. Owner-approved clarifications and remaining gates

The product owner approved the conditional answers in IMPLEMENTATION_PLAN.md Section 18 on 08 November 2026. Those answers
supersede the open-question status recorded in the earlier PRD text. Implement only the approved interim behavior; obtain each
listed institutional or technical approval before its dependent provider, policy, data, feature or deployment is activated.
• The owner-approved technology and data-access choices are React/Vite, Node.js/Express, TypeScript, root npm workspaces,
Express-only Supabase client access and PostgreSQL RLS. Do not infer Supabase Auth.
• Identity-provider selection, Supabase project/region and credentials, hosting, email, evidence policy, privacy schedule, administrator
approvers and trusted identity-claim mapping remain manual gates as recorded in Section 18.
• The owner selected a hosted Supabase test project for Phase 1. Its region, project and credentials must be approved/provisioned
before database integration tests or the full check; do not send credentials in chat.
• Use the approved request reference and summary/description limits in Q17/Q18. The remaining rate/session thresholds, reminder
cadence, estimate threshold, status-transition details, content limits, discussion controls and dashboard metric definitions remain
gated exactly as described in Section 18.
• The owner approved a minimal PostgreSQL health-check RPC invoked through the Supabase client for T-SETUP-3 (implementation-plan
Q27); no separate PostgreSQL driver is approved. The owner reports the hosted test project is provisioned in an approved region
(region name not recorded), and resolved Q28 by approving read-only S11 profile fields and sign-out only. Phase 1 may proceed;
local environment configuration and RPC deployment are required before T-SETUP-3 and the full check.

## 8. Change log

Version | Date | Change | Status
v0.1 | 28 Oct 2026 Initial structure based on the university operations concept. | Draft
v1.0 | 28 Oct 2026 Confirmed platform, eight MVP feature areas, pilot scope, roles, stack, authentication, notifications,
sensitive access and integration approach.
Draft for review

v1.1 | 04 Nov 2026 Added OP20/S11 phase commitment; documented design references available for S1–S12; added
T-BR1-1–T-BR14-1, T-SEC-1a/b–T-SEC-15a/b and T-C-1–T-C-10 traceability; mapped EC1–EC12
individually including EC10; aligned ten implementation phases and separated F8 Governance,
Hardening and Release; preserved unresolved institutional questions as open.

Approved by product owner
08 Nov 2026

## 9. Approval status

The product owner approved PRD v1.1 and the S1–S12 screen designs on 08 November 2026, and separately approved the conditional
implementation recommendations in IMPLEMENTATION_PLAN.md Section 18. Their approval resolves the corresponding decision
register entries, but does not replace the specific manual approvals and provisioning gates recorded there.

## 10. Owner-directed stack update (08 November 2026)

The product owner approved the following implementation stack, superseding conflicting database choices in earlier PRD sections:

• Frontend: React + Vite (Tailwind CSS remains the documented styling direction).
• Backend: Node.js + Express.
• Database: Supabase (PostgreSQL), replacing MongoDB.

The logical entities and business requirements in the earlier PRD remain in scope, but MongoDB-specific collections, ObjectIds and
document-model instructions are not implementation requirements. Map those logical entities to a relational PostgreSQL schema
before Phase 2. The owner-approved approach is TypeScript in root npm workspaces, Supabase client access only through Express,
server authorization and PostgreSQL RLS. A hosted Supabase test project is selected for Phase 1; project/region, migration tooling,
trusted identity-claim mapping and server credential provisioning remain manual gates. Do not infer Supabase Auth or expose
privileged credentials in the frontend.

On 08 November 2026, the product owner also approved the conditional recommendations in IMPLEMENTATION_PLAN.md Section 18.
Those recommendations define safe interim behavior and phase gates; obtain the listed manual approvals before provisioning external
services, using real data, enabling policy-dependent features or deploying.

Change log

Version | Date | Change | Approval
v1.2 | 08 Nov 2026 | Recorded product-owner approval of PRD v1.1, the React/Vite, Node.js/Express and Supabase/PostgreSQL stack direction, and S1–S12 design references. | Product owner
v1.3 | 08 Nov 2026 | Recorded owner approval of the conditional recommendations in implementation-plan Section 18 and updated the PRD precedence and remaining manual gates. | Product owner
v1.4 | 08 Nov 2026 | Recorded the owner's initial selection of a local Supabase test stack for Phase 1. | Product owner
v1.5 | 08 Nov 2026 | Recorded the owner's later selection of a hosted Supabase test project; region/access approval and provisioning remain gated. | Product owner
v1.6 | 08 Nov 2026 | Recorded open clarification Q27 for the Phase 1 PostgreSQL connectivity test mechanism; Phase 1 is paused pending its answer and the hosted test project. | Product owner
v1.7 | 08 Nov 2026 | Recorded owner approval of the health-check RPC approach and added the public Supabase key required by T-SETUP-3. | Product owner
v1.8 | 08 Nov 2026 | Recorded owner confirmation that the hosted test project is provisioned in an approved region; local configuration and RPC deployment remain pending. | Product owner
v1.9 | 08 Nov 2026 | Added clarification Q28 for the S11/OP20 editable preference fields. | Product owner
v1.10 | 08 Nov 2026 | Recorded owner approval of read-only S11 profile fields and sign-out for Phase 1; preference writes remain disabled pending field approval. | Product owner
