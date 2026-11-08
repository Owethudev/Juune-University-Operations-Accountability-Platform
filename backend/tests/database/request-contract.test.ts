import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080005_phase3_requests.sql",
  import.meta.url,
);
const privilegeMigrationUrl = new URL(
  "../../../supabase/migrations/202611080006_phase3_request_idempotency_grant.sql",
  import.meta.url,
);
const policyUrl = new URL(
  "../../../supabase/migrations/202611080003_phase2_rls.sql",
  import.meta.url,
);
const sqlTestUrl = new URL(
  "../../../supabase/tests/phase3_requests.test.sql",
  import.meta.url,
);

describe("Phase 3 request persistence contract", () => {
  it("enforces one idempotency key per tenant requester and creates initial history atomically", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toMatch(/alter column idempotency_key set not null/i);
    expect(migration).toMatch(
      /unique\s+index[\s\S]{0,180}\(institution_id,\s*requester_id,\s*idempotency_key\)/i,
    );
    expect(migration).toMatch(
      /after\s+insert\s+on\s+public\.requests[\s\S]{0,120}record_initial_request_event/i,
    );
    expect(migration).toMatch(
      /insert into public\.request_events\s*\([\s\S]*?\bevent_type\b[\s\S]*?\)\s*values\s*\([\s\S]*?'created'/i,
    );
  });

  it("keeps request inserts tenant- and requester-scoped under SEC1", async () => {
    const policy = await readFile(policyUrl, "utf8");
    const insertPolicy = policy.match(
      /create\s+policy\s+requests_scoped_insert[\s\S]*?;\s*create\s+policy/i,
    )?.[0];

    expect(insertPolicy).toBeDefined();
    expect(insertPolicy).toMatch(/institution_id\s*=\s*juune_private\.current_institution_id\(\)/i);
    expect(insertPolicy).toMatch(/requester_id\s*=\s*juune_private\.current_user_id\(\)/i);
    expect(insertPolicy).toMatch(/has_permission\('SEC1'\)/i);
    expect(insertPolicy).toMatch(/status\s*=\s*'submitted'/i);
  });

  it("grants authenticated users insert access only to the new idempotency column", async () => {
    const privilegeMigration = await readFile(privilegeMigrationUrl, "utf8");

    expect(privilegeMigration).toMatch(
      /grant\s+insert\s*\(\s*idempotency_key\s*\)\s+on\s+public\.requests\s+to\s+authenticated/i,
    );
  });

  it("provides rollback-only hosted allow/deny and duplicate-submit checks", async () => {
    const sql = await readFile(sqlTestUrl, "utf8");

    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    expect(sql).toContain("T-US1-1");
    expect(sql).toContain("T-SEC-1b");
    expect(sql).toContain("T-EDGE-3");
  });
});
