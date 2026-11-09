# Database restore runbook

## Status

Rehearsal status: **Not rehearsed**. The production provider, backup retention
and recovery-point objectives are not configured here. This document does not
authorize a production restore or use of real employee data.

## Preconditions

The incident owner and database operator must confirm:

- The institution-approved database provider, region, exact source project,
  and recovery target.
- The incident approval and business owner authorization for the restore.
- The approved backup or point-in-time recovery mechanism and its timestamp.
- The expected data-loss window and the application version compatible with
  that recovery point.
- The approved secret-manager and access procedure. Never paste credentials
  into commands, this document, tickets, or logs.

If any value is unknown, stop. Do not infer the source project from a local
configuration file or a CLI's linked-project default.

## Restore to an isolated target

1. Record the incident, source project identifier, recovery point, approvals,
   operator, and target identifier in the approved incident record.
2. Provision or select a separate isolated restore target in an
   institution-approved region. Verify the target identifier with a second
   operator. Never restore over production for a rehearsal.
3. Use only the provider's documented managed backup/PITR procedure to restore
   into that isolated target. Do not download production data to a developer
   workstation or an unapproved storage location.
4. Apply only the schema/configuration steps approved for the selected recovery
   point. Do not run `supabase db reset` on a hosted source or restore target.
5. Configure a non-production API to use the isolated target through the
   approved secret manager. Keep institutional sign-in disabled unless the
   approved synthetic identity provider is configured for this target.
6. Run health checks and the rollback-only SQL authorization suite with the
   approved synthetic identities. Verify institution isolation, row-level
   security, request access, and audit access. Do not create real user accounts
   or send notifications.
7. Record test results and any discrepancies without exporting records or
   sensitive values. The database operator and incident owner must sign off
   before the restored target is used for any further recovery decision.
8. Retain or dispose of the isolated target according to the institution's
   approved handling policy. Do not connect it to users or promote it to
   production without separate approval and validation.

## Recovery verification

The provider-specific recovery time, expected counts, retention period and
promotion procedure must be established before a rehearsal. Never invent
success criteria or claim a restore succeeded based only on the provider
report; verify application health and database authorization on the isolated
target.
