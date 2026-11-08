import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080011_phase8_governance.sql",
  import.meta.url,
);
const hostedTestUrl = new URL(
  "../../../supabase/tests/phase8_governance.test.sql",
  import.meta.url,
);

describe("Phase 8 governance contract", () => {
  it("enforces admin-only scoped configuration, pilot routing, audit, and reassignment in SQL", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toMatch(/has_role\('platform_admin'\)/i);
    expect(migration).toMatch(/has_permission\('SEC11'\)/i);
    expect(migration).toMatch(/has_permission\('SEC12'\)/i);
    expect(migration).toMatch(/has_permission\('SEC13'\)/i);
    expect(migration).toMatch(/current_institution_id/i);
    expect(migration).toMatch(/facilities\/maintenance/i);
    expect(migration).toMatch(/IT/i);
    expect(migration).toMatch(/Administration/i);
    expect(migration).toMatch(/request_categories/i);
    expect(migration).toMatch(/default_department_id/i);
    expect(migration).toMatch(/replacement_department_id/i);
    expect(migration).toMatch(/status not in\s*\('resolved',\s*'closed'\)/i);
    expect(migration).toMatch(/audit_events/i);
    expect(migration).toMatch(/request_events_audit_insert/i);
    expect(migration).toMatch(/require_designated_admin_approvers/i);
    expect(migration).toMatch(/require_sensitive_permission_approval/i);
    expect(migration).toMatch(/recipientConfigurationEnabled', false/i);
    expect(migration).toMatch(/audit_events\.read/i);
    expect(migration).toMatch(/old_permission in \('SEC11', 'SEC12', 'SEC13'\)/i);
    expect(migration).toMatch(/revoke all on function/i);
    expect(migration).toMatch(/to authenticated;/i);
  });

  it("documents rollback-only allow/deny, audit safety, pilot scope, and reassignment checks", async () => {
    const sql = await readFile(hostedTestUrl, "utf8");
    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    expect(sql).toContain("T-US8-1");
    expect(sql).toContain("T-US8-2");
    expect(sql).toContain("T-BR11-1");
    expect(sql).toContain("T-BR13-1");
    expect(sql).toContain("T-BR14-1");
    expect(sql).toContain("T-SEC-11b");
    expect(sql).toContain("T-SEC-12b");
    expect(sql).toContain("T-SEC-13b");
    expect(sql).toContain("T-EDGE-1");
  });
});
