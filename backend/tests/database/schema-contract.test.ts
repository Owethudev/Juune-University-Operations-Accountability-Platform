import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080002_phase2_schema.sql",
  import.meta.url,
);
const seedUrl = new URL("../../../supabase/seed.sql", import.meta.url);

async function loadSql(url: URL): Promise<string> {
  return readFile(url, "utf8");
}

describe("Phase 2 schema draft", () => {
  it("T-DB-1 maps every PRD entity and the role/permission registry", async () => {
    const sql = await loadSql(migrationUrl);
    const entities = [
      "institutions",
      "users",
      "departments",
      "roles",
      "user_roles",
      "department_managers",
      "request_categories",
      "requests",
      "request_events",
      "notifications",
      "announcements",
      "announcement_departments",
      "opportunities",
      "opportunity_departments",
      "audit_events",
      "escalation_events",
      "escalation_authorities",
      "attachments",
      "permission_definitions",
      "role_permissions",
    ];

    for (const entity of entities) {
      expect(sql).toMatch(
        new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${entity}\\b`, "i"),
      );
    }

    expect(sql).toContain("institutional_id");
    expect(sql).toContain("role_permissions");
  });

  it("T-DB-2 keeps relations tenant-consistent and enforces persisted invariants", async () => {
    const sql = await loadSql(migrationUrl);

    expect(sql).toMatch(/unique\s*\(\s*institution_id\s*,\s*id\s*\)/i);
    expect(sql).toMatch(/foreign\s+key\s*\(\s*institution_id\s*,\s*department_id\s*\)/i);
    expect(sql).toMatch(/lack_of_assistance_flags\s*>=\s*0/i);
    expect(sql).toMatch(/summary[\s\S]{0,180}char_length/i);
    expect(sql).toMatch(/description[\s\S]{0,180}char_length/i);
    expect(sql).toMatch(/on\s+delete\s+restrict/i);
  });

  it("T-DB-3 includes query indexes and leaves RLS to the following migration", async () => {
    const sql = await loadSql(migrationUrl);

    expect(sql).toMatch(/RLS[\s\S]{0,100}defined by the following migration/i);

    for (const indexName of [
      "requests_institution_status_updated_idx",
      "requests_institution_requester_created_idx",
      "requests_institution_department_status_updated_idx",
      "request_events_request_created_idx",
      "notifications_recipient_status_created_idx",
      "audit_events_institution_timestamp_idx",
    ]) {
      expect(sql).toContain(indexName);
    }

    expect(sql).not.toMatch(/row\s+level\s+security/i);
    expect(sql).not.toMatch(/create\s+policy/i);
    expect(sql).not.toMatch(/revoke\s+all\s+on\s+table/i);
  });

  it("T-DB-4 uses repeatable DDL and immutable history records", async () => {
    const sql = await loadSql(migrationUrl);

    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists/gi);
    expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists/gi);
    expect(sql).toMatch(/request_events_append_only/i);
    expect(sql).toMatch(/audit_events_append_only/i);
    expect(sql).toMatch(/before\s+update\s+or\s+delete/i);
  });

  it("T-SEED-1 seeds only deterministic synthetic roles, departments and records", async () => {
    const sql = await loadSql(seedUrl);

    for (const role of [
      "employee",
      "department_manager",
      "senior_leadership",
      "platform_admin",
    ]) {
      expect(sql).toContain(`'${role}'`);
    }

    for (const department of ["IT", "Facilities/Maintenance", "Administration"]) {
      expect(sql).toContain(`'${department}'`);
    }

    expect(sql).toContain("@example.invalid");
    expect(sql).toMatch(/on\s+conflict/i);
    expect(sql).toContain("request_categories");
    expect(sql).toContain("requests");
    expect(sql).toContain("announcements");
    expect(sql).toContain("opportunities");
    expect(sql).toContain("audit_events");
    expect(sql).toContain("insert into public.role_permissions");
    expect(sql).toContain("'department_manager', 'SEC3'");
    expect(sql).toContain("'platform_admin', 'SEC13'");
    expect(sql).toContain("insert into public.user_permissions");
    expect(sql).toContain("'SEC8'");
    expect(sql).toContain("'SEC10'");
    expect(sql).not.toMatch(/@(gmail|yahoo|outlook)\.com/i);
  });
});
