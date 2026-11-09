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
| T-REL-2: PRD five-minute demo | Blocked; not run end to end | The production authenticator is unconfigured and fails closed. Configure an institution-approved identity provider and synthetic accounts, then run the browser journey below against the approved isolated environment. |
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
secret settings; do not commit them. This is a persistent Node server, not a
serverless-function adapter. The current authenticator is intentionally
unconfigured, so successful deployment does not mean users can sign in or that
the service is ready for pilot data.

## T-REL-2 synthetic browser journey

Run only after the approved isolated environment, identity provider and
synthetic accounts are ready. Do not use real employee identities or data.

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
