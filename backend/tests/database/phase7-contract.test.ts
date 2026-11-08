import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080010_phase7_content.sql",
  import.meta.url,
);
const hostedTestUrl = new URL(
  "../../../supabase/tests/phase7_content.test.sql",
  import.meta.url,
);

describe("Phase 7 announcements and opportunities contract", () => {
  it("enforces permissions, audience scope, current-state filters, and audited publishing in SQL", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toMatch(/has_permission\('SEC8'\)/i);
    expect(migration).toMatch(/has_permission\('SEC10'\)/i);
    expect(migration).toMatch(/list_my_announcement_drafts/i);
    expect(migration).toMatch(/list_my_opportunity_drafts/i);
    expect(migration).toMatch(/can_read_announcement/i);
    expect(migration).toMatch(/can_read_opportunity/i);
    expect(migration).toMatch(/state\s*=\s*'published'/i);
    expect(migration).toMatch(/expires_at\s*>\s*now\(\)/i);
    expect(migration).toMatch(/closes_at\s*>\s*now\(\)/i);
    expect(migration).toMatch(/publisher_user_id/i);
    expect(migration).toMatch(/revoke all on function/i);
    expect(migration).toMatch(/to authenticated;/i);
    expect(migration).toMatch(/https:\/\//i);
  });

  it("documents rollback-only allow/deny, audience, draft, and open-date checks", async () => {
    const sql = await readFile(hostedTestUrl, "utf8");
    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    expect(sql).toContain("T-US6-1");
    expect(sql).toContain("T-SEC-8b");
    expect(sql).toContain("T-SEC-7b");
    expect(sql).toContain("T-SEC-9b");
    expect(sql).toContain("T-EDGE-12");
  });
});
