import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080003_phase2_rls.sql",
  import.meta.url,
);
const securityTestUrl = new URL(
  "../../../supabase/tests/phase2_rls.test.sql",
  import.meta.url,
);
const auditFixUrl = new URL(
  "../../../supabase/migrations/202611080004_phase2_audit_tenant_fix.sql",
  import.meta.url,
);

async function loadSql(): Promise<string> {
  return readFile(migrationUrl, "utf8");
}

describe("Phase 2 RLS contract", () => {
  it("T-TENANT-1 derives scope only from the verified JWT and active database identity", async () => {
    const sql = await loadSql();

    expect(sql).toMatch(/auth\.jwt\(\)\s*->>\s*'sub'/i);
    expect(sql).toMatch(/auth\.jwt\(\)\s*->>\s*'institution_id'/i);
    expect(sql).not.toMatch(/auth\.jwt\(\)\s*->>\s*'role'/i);
    expect(sql).toMatch(/users[\s\S]{0,300}status\s*=\s*'active'/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*pg_catalog/i);
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).not.toMatch(/request\.headers/i);
  });

  it("T-SEC-15 forces RLS on every application table and has no anon policies", async () => {
    const sql = await loadSql();
    const tables = [
      "institutions",
      "roles",
      "departments",
      "users",
      "user_roles",
      "department_managers",
      "request_categories",
      "requests",
      "request_events",
      "attachments",
      "notifications",
      "announcements",
      "announcement_departments",
      "opportunities",
      "opportunity_departments",
      "audit_events",
      "escalation_events",
      "escalation_authorities",
      "permission_definitions",
      "role_permissions",
      "request_access_grants",
      "user_permissions",
    ];

    for (const table of tables) {
      expect(sql).toMatch(
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      );
      expect(sql).toMatch(
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i"),
      );
    }

    const revokeBlock = sql.match(
      /revoke\s+all\s+on\s+table([\s\S]*?)from\s+public\s*,\s*anon\s*,\s*authenticated/i,
    )?.[1];
    expect(revokeBlock).toBeDefined();
    for (const table of tables) {
      expect(revokeBlock).toContain(`public.${table}`);
    }
    expect(sql).not.toMatch(/create\s+policy[\s\S]{0,200}\bto\s+anon\b/i);
    expect(sql).not.toMatch(/create\s+policy[\s\S]{0,120}on\s+public\.attachments/i);
    expect(sql).not.toMatch(/grant\s+\w+[\s\S]{0,80}on\s+public\.attachments/i);
  });

  it("SEC1–SEC14 policies fail closed and use scoped permissions", async () => {
    const sql = await loadSql();
    const policyNames = [
      "institutions_tenant_select",
      "departments_tenant_select",
      "users_self_select",
      "user_roles_self_select",
      "department_managers_self_select",
      "request_categories_tenant_select",
      "requests_scoped_select",
      "requests_scoped_insert",
      "requests_manager_update",
      "request_events_scoped_select",
      "request_events_scoped_insert",
      "notifications_self_select",
      "notifications_self_update",
      "announcements_published_select",
      "announcements_publisher_write",
      "opportunities_published_select",
      "opportunities_publisher_write",
      "audit_events_authorized_select",
      "request_access_grants_authorized",
      "user_permissions_self_select",
      "user_permissions_admin_write",
      "role_permissions_tenant_select",
      "role_permissions_admin_write",
    ];

    for (const policy of policyNames) {
      expect(sql).toMatch(
        new RegExp(`create\\s+policy\\s+${policy}\\b`, "i"),
      );
    }

    for (const permission of [
      "SEC1",
      "SEC2",
      "SEC3",
      "SEC4",
      "SEC7",
      "SEC8",
      "SEC9",
      "SEC10",
      "SEC11",
      "SEC12",
      "SEC13",
    ]) {
      expect(sql).toContain(`'${permission}'`);
    }

    expect(sql).toMatch(/grant\s+select\s*\([^)]*\)\s*on\s+public\.users/i);
    expect(sql).toMatch(/grant\s+update\s*\(\s*read_at\s*\)\s*on\s+public\.notifications/i);
    expect(sql).toMatch(/institutional_id\s*=\s*\(auth\.jwt\(\)\s*->>\s*'sub'\)/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+view\s+public\.request_dashboard_summary/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+juune_private\.flag_request/i);
    expect(sql).not.toMatch(/grant\s+update\s*\([^)]*lack_of_assistance_flags/i);
    expect(sql).not.toMatch(/grant\s+all\s+privileges/i);
  });

  it("provides isolated SQL allow/deny fixtures for tenant, role, content, and audit policies", async () => {
    const sql = await readFile(securityTestUrl, "utf8");

    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    for (const testId of [
      "T-TENANT-1",
      "T-SEC-2a/b",
      "T-SEC-3a",
      "T-SEC-4a",
      "T-SEC-5b",
      "T-SEC-6a",
      "T-SEC-7b",
      "T-SEC-8b",
      "T-SEC-9b",
      "T-SEC-10b",
      "T-SEC-11a",
      "T-SEC-11b",
      "T-SEC-12a",
      "T-SEC-13a",
      "T-SEC-14b",
      "T-SEC-15b",
    ]) {
      expect(sql).toContain(testId);
    }
  });

  it("audits institution changes under the institution's tenant id", async () => {
    const sql = await readFile(auditFixUrl, "utf8");

    expect(sql).toMatch(
      /case\s+when\s+tg_table_name\s*=\s*'institutions'\s+then\s+nullif\(changed_row\s*->>\s*'id'/i,
    );
    expect(sql).toMatch(/else\s+nullif\(changed_row\s*->>\s*'institution_id'/i);
  });
});
