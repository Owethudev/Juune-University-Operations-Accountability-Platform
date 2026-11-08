import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/202611080008_phase5_notifications_escalation.sql",
  import.meta.url,
);
const schemaUrl = new URL(
  "../../../supabase/migrations/202611080002_phase2_schema.sql",
  import.meta.url,
);
const hostedTestUrl = new URL(
  "../../../supabase/tests/phase5_notifications.test.sql",
  import.meta.url,
);
const planUrl = new URL("../../../IMPLEMENTATION_PLAN.md", import.meta.url);

describe("Phase 5 notifications and escalation contract", () => {
  it("creates one neutral third-flag escalation event atomically", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    const schema = await readFile(schemaUrl, "utf8");

    expect(migration).toMatch(/lack_of_assistance_flags\s*<\s*3/i);
    expect(migration).toMatch(/lack_of_assistance_flags\s*>=\s*3/i);
    expect(migration).toMatch(/new\.event_type\s+in\s*\('flag',\s*'escalation'\)/i);
    expect(schema).toMatch(/unique\s*\(institution_id,\s*request_id,\s*trigger\)/i);
    expect(migration).toMatch(/on\s+conflict\s*\(institution_id,\s*request_id,\s*trigger\)\s+do\s+nothing/i);
    expect(migration).toMatch(/security\s+definer/i);
    expect(migration).toMatch(
      /create trigger requests_z_escalate_after_third_flag\s+after update of lack_of_assistance_flags/i,
    );
    expect(migration).toMatch(/review/i);
    expect(migration).not.toMatch(/misconduct|blame/i);
  });

  it("keeps email, scheduled reminders, and unconfigured estimate policies gated", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    const plan = await readFile(planUrl, "utf8");

    expect(migration).not.toMatch(/channel\s*=\s*'email'/i);
    expect(migration).not.toMatch(/pg_cron|cron\.schedule/i);
    expect(plan).toMatch(/Make reminder cadence and overdue thresholds configurable and leave scheduled reminders disabled until approved/i);
    expect(plan).toMatch(/Suppress resolution estimates until the owner approves a minimum sample size and method/i);
  });

  it("documents a rollback-only hosted test for flags, dedupe, and recipient isolation", async () => {
    const sql = await readFile(hostedTestUrl, "utf8");
    expect(sql.trimEnd()).toMatch(/rollback;$/i);
    expect(sql).toContain("T-US4-3");
    expect(sql).toContain("T-EDGE-5");
    expect(sql).toContain("T-SEC-4b");
  });
});
