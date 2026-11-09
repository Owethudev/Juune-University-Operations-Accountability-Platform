# Application rollback runbook

## Status

Rehearsal status: **Not rehearsed**. No approved release host or production
identity provider is configured in this repository. This document does not
authorize a deployment or a production database operation.

## Preconditions

Before acting, the release owner must identify and record:

- The institution-approved environment and exact project/resource identifiers.
- The incident owner and the approval required to change the deployment.
- The currently deployed release and the previous known-good application
  release, including immutable artifact identifiers.
- Whether the database migrations introduced since that release are backward
  compatible with it.
- The environment's approved health-check URL and synthetic test identities.

Do not put credentials, tokens, private URLs, or personal data in this
runbook, tickets, or shell history. Obtain access through the approved secret
manager and operator process.

## Application rollback

1. Declare the incident through the institution's approved process. Record
   the start time, affected release, observed symptoms, and decision owner.
2. Confirm the target environment and previous known-good artifact with a
   second operator. Do not rely on an implicit default project or the
   developer `.env`.
3. Check migration history using the hosting/database provider's approved,
   read-only method. Confirm that the previous application release is
   compatible with the current schema.
4. If it is compatible, use the approved hosting provider's deployment
   controls to restore the previous immutable application artifact. The
   provider-specific command is intentionally omitted until the host is
   selected.
5. Check the API health endpoint and run the approved synthetic smoke flow.
   Verify authentication, request submission, request detail, and audit
   visibility with only the synthetic identities and data.
6. If health or authorization checks fail, stop the rollback and escalate to
   the release owner. Do not improvise database edits or disable authorization.
7. Record the final artifact identifier, checks, timestamps, operator, and
   outcome in the approved incident record.

## Database failure

Database migrations are forward-only. Prefer a reviewed corrective migration
that preserves data and supports the deployed application versions.

- Do not run `supabase db reset` against any hosted project.
- Do not apply a hand-written down migration or destructive SQL to production.
- Do not restore a backup over production as an application rollback.
- If a database restore is necessary, follow [RESTORE.md](./RESTORE.md) and
  obtain separate incident-owner approval.
- If migration compatibility or impact is uncertain, stop writes through the
  approved operational process and escalate; do not guess.

## Completion

The incident owner must verify the service, authorize reopening normal
operations, and capture unresolved risks. This runbook must be rehearsed in an
approved isolated environment before it can be considered release-ready.
