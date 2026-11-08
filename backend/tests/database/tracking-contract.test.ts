import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080007_phase4_tracking_routing.sql",
  import.meta.url,
);
const phase3MigrationUrl = new URL(
  "../../../supabase/migrations/202611080005_phase3_requests.sql",
  import.meta.url,
);
const hostedTestUrl = new URL(
  "../../../supabase/tests/phase4_tracking.test.sql",
  import.meta.url,
);

describe("Phase 4 request tracking and routing contract", () => {
  it("permits alternate active departments while retaining tenant and SEC1 checks", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    const insertPolicy = migration.match(
      /create policy requests_scoped_insert[\s\S]*?;/i,
    )?.[0];

    expect(insertPolicy).toBeDefined();
    expect(insertPolicy).toMatch(/has_permission\('SEC1'\)/i);
    expect(insertPolicy).toMatch(/institution_id\s*=\s*juune_private\.current_institution_id\(\)/i);
    expect(insertPolicy).toMatch(/from public\.departments/i);
    expect(insertPolicy).toMatch(/d\.status\s*=\s*'active'/i);
    expect(insertPolicy).not.toMatch(/default_department_id\s*=\s*department_id/i);
    expect(insertPolicy).toMatch(/rc\.institution_id\s*=\s*public\.requests\.institution_id/i);
    expect(insertPolicy).toMatch(/d\.institution_id\s*=\s*public\.requests\.institution_id/i);
  });

  it("requires authorised request scope for detail/history and manager status transitions", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toMatch(/create or replace function public\.get_request_display/i);
    expect(migration).toMatch(/can_access_request\(r\.id\)/i);
    expect(migration).toMatch(/add column if not exists status_reason/i);
    expect(migration).toMatch(/'status_reason',\s*new\.status_reason/i);
    expect(migration).toMatch(/recorded_event := 'status_changed'/i);
    expect(migration).toMatch(/grant execute on function public\.get_request_display/i);
    expect(migration).toMatch(/is_manager_of\(old\.department_id\)/i);
    expect(migration).toMatch(/new\.assigned_to_user_id\s+is distinct from juune_private\.current_user_id\(\)/i);
  });

  it("keeps evidence metadata/storage inaccessible until OQ9 is approved", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    const phase3Migration = await readFile(phase3MigrationUrl, "utf8");

    expect(migration).not.toMatch(/grant\s+select[\s\S]{0,120}public\.attachments/i);
    expect(migration).not.toMatch(/create policy attachments/i);
    expect(phase3Migration).not.toContain("storage_key");
  });

  it("provides rollback-only hosted authorization, response, alternate routing and reopen checks", async () => {
    const hostedTest = await readFile(hostedTestUrl, "utf8");

    expect(hostedTest.trimEnd()).toMatch(/rollback;$/i);
    expect(hostedTest).toContain("T-US2-1");
    expect(hostedTest).toContain("T-SEC-2b");
    expect(hostedTest).toContain("T-US3-2");
    expect(hostedTest).toContain("T-EDGE-10");
  });
});
