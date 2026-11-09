import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const rollbackUrl = new URL(
  "../../../docs/release/ROLLBACK.md",
  import.meta.url,
);
const restoreUrl = new URL(
  "../../../docs/release/RESTORE.md",
  import.meta.url,
);

describe("Phase 10 operational runbooks", () => {
  it("T-REL-4 documents a non-destructive application rollback and database gate", async () => {
    const runbook = await readFile(rollbackUrl, "utf8");

    expect(runbook).toMatch(/previous known-good application\s+release/i);
    expect(runbook).toMatch(/database migrations are forward-only/i);
    expect(runbook).toMatch(/do not run.*db reset.*hosted/i);
    expect(runbook).toMatch(/API health endpoint/i);
    expect(runbook).toMatch(/rehearsal status:[\s\S]{0,20}not rehearsed/i);
  });

  it("T-REL-4 requires an isolated restore target and synthetic verification", async () => {
    const runbook = await readFile(restoreUrl, "utf8");

    expect(runbook).toMatch(/isolated.*restore target/i);
    expect(runbook).toMatch(/never restore over production/i);
    expect(runbook).toMatch(/synthetic identities/i);
    expect(runbook).toMatch(/health checks/i);
    expect(runbook).toMatch(/row-level\s+security/i);
    expect(runbook).toMatch(/rehearsal status:[\s\S]{0,20}not rehearsed/i);
  });
});
