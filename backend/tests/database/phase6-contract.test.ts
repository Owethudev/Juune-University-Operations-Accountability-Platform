import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080009_phase6_dashboards.sql",
  import.meta.url,
);
const hostedTestUrl = new URL(
  "../../../supabase/tests/phase6_dashboards.test.sql",
  import.meta.url,
);

describe("Phase 6 dashboard contract", () => {
  it("filters scoped summaries on the server and excludes sensitive requests", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toMatch(/security\s+definer/i);
    expect(migration).toMatch(/r\.sensitivity\s*=\s*'standard'/i);
    expect(migration).toMatch(/current_institution_id/i);
    expect(migration).toMatch(/is_manager_of\(r\.department_id\)/i);
    expect(migration).toMatch(/has_role\('senior_leadership'\)/i);
    expect(migration).toMatch(/required_from_date/i);
    expect(migration).toMatch(/required_to_date/i);
    expect(migration).toMatch(/required_status/i);
    expect(migration).toMatch(/required_department_id/i);
    expect(migration).toMatch(/assigned_count/i);
    expect(migration).toMatch(/revoke all on function/i);
    expect(migration).toContain(") to authenticated;");
  });

  it("documents rollback-only manager, leadership, and sensitive-data checks", async () => {
    const sql = await readFile(hostedTestUrl, "utf8");
    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    expect(sql).toContain("T-US5-1");
    expect(sql).toContain("T-US5-2");
    expect(sql).toContain("T-SEC-6b");
    expect(sql).toContain("T-EDGE-8");
  });
});
