# Phase 10 release readiness

## Current decision

**Not ready to deploy or begin a pilot.** Local automated checks are passing,
but the approved institutional identity provider and release environment are
not configured. Do not load real employee data or represent the platform as
pilot-ready.

General approval to continue development does not identify an institution-owned
identity provider, hosting project, region, operational owner, or approval
record. These values must come from the institution; do not infer them from
developer configuration or substitute synthetic production settings.

## Release test status

| Test | Status | Evidence or remaining gate |
|---|---|---|
| T-REL-1: clean install and automated checks | Local checks pass; environment setup is incomplete | `npm ci` and `npm run check` pass locally. The Vercel failure reported for commit `38b3053` was caused by the production Vite config importing `vitest/config`; Vite and Vitest settings are now separated so a production frontend build does not load Vitest. The backend now has a production start script and honors the platform port/interface. A fresh-clone run and approved environment configuration/seed validation have not been completed. No hosted database was changed. |
| T-REL-2: PRD five-minute demo | Isolated demo mode implemented and core API journey tested; deployed browser journey not yet run | Configure the in-memory demo deployment and run all browser steps below. The ordinary production authenticator remains fail-closed and unchanged. |
| T-REL-3: security and institutional approvals | Incomplete | HTTPS/public-host checks, privacy/security/governance approvals, backup and retention validation, secrets review in the release environment, and hosting sign-off must be recorded by their institutional owners. |
| T-REL-4: rollback and restore | Runbooks written; rehearsal not done | Follow [ROLLBACK.md](./ROLLBACK.md) and [RESTORE.md](./RESTORE.md) in an approved isolated environment. Record evidence and approvals; never rehearse against production. |

## Backend service commands

For a Node hosting service that supports a long-running process, configure the
repository root as the project root and use:

- Build: `npm run build --workspace backend`
- Start: `npm run start --workspace backend`

The backend binds to `0.0.0.0` and uses the platform-provided `PORT` (defaults
to `4000` for local development). Configure `SUPABASE_URL` and
`SUPABASE_ANON_KEY` as deployment environment variables using the platform's
secret settings; do not commit them. If frontend and API are on separate
origins, set `CORS_ALLOWED_ORIGINS` to the exact HTTPS frontend origin (or a
comma-separated list of exact HTTPS origins); do not include paths or use a
wildcard. The frontend's `VITE_API_BASE_URL` must then be the API base URL on
the backend host, ending in `/api/v1`. Same-origin deployments can leave the
CORS list empty. This is a persistent Node server, not a serverless-function
adapter. The current authenticator is intentionally unconfigured, so successful
deployment does not mean users can sign in or that the service is ready for
pilot data.

### Synthetic demo-only deployment

For a public demonstration without institutional sign-in, deploy the backend
with `DEMO_MODE=true`. The frontend checks the backend `/health` endpoint and
automatically shows the demo role picker when the response reports
`demoMode: true`; no frontend demo flag is required. `VITE_DEMO_MODE=true` is
an optional override for a demo-only frontend build, but the normal
health-detection path is preferred.
In this mode, the backend does not load Supabase configuration or connect to a
database; all accounts and records are synthetic, in-memory demo fixtures, and
changes reset when the backend restarts. The role picker is intentionally open
so a reviewer can switch among the synthetic employee, manager, leadership,
and administrator personas. Do not use this mode for real operations, real
accounts, or real employee data. Leave both flags false for any non-demo
deployment. Set the exact frontend origin in `CORS_ALLOWED_ORIGINS` and the
backend URL in the frontend's build-time `VITE_API_BASE_URL`.

The demo API uses static role tokens and is intentionally not an authentication
system. It is safe only because demo mode never connects to Supabase or stores
real data. Keep it on a separate demo service; do not enable `DEMO_MODE` on a
service intended for real users or data.

## T-REL-2 synthetic browser journey

Run this journey against the isolated demo deployment described above. Demo
mode does not require an institutional identity provider; the role picker
provides synthetic accounts. Do not use real employee identities or data.

1. Sign in as a synthetic employee.
2. Create an IT or Facilities request and confirm the suggested destination.
3. Sign in as the receiving department manager and acknowledge/update the
   request.
4. Inspect the request timeline and the notifications delivered to both
   managers.
5. Flag the request three times and inspect the escalation event and audit
   trail.
6. Open the role-appropriate dashboard, a published announcement and an
   opportunity.
7. Sign in as an administrator and inspect category/routing configuration and
   the audit log.
8. Record the environment identifier, build, synthetic roles used, results,
   failures and human reviewer in the institution-approved release record.

Do not mark this test passed based only on API tests with mock services or a
local sign-in screen. Record a step as blocked if the approved environment or
identity configuration is unavailable.

## Unblocking ownership

Before release verification can continue, the institution must provide or
identify:

- The approved identity provider, issuer/audience/JWKS settings, and synthetic
  test accounts.
- The approved hosting and database project identifiers, region and secret
  management process.
- Named owners and recorded decisions for privacy, security, retention,
  backup, incident response and pilot scope.
- An isolated approved environment for the browser demo and rollback/restore
  rehearsal.

Do not put credentials, private URLs, personal data or approval-sensitive
details in this repository.
