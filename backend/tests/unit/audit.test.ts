import { describe, expect, it, vi } from "vitest";
import { recordAuditEvent } from "../../src/audit/audit.js";

describe("audit event helper", () => {
  it("records only approved audit fields with a UTC timestamp", async () => {
    const append = vi.fn(async () => undefined);
    const timestamp = new Date("2026-11-08T12:30:00.000Z");

    await recordAuditEvent(
      { append },
      {
        institutionId: "synthetic-institution",
        actorUserId: "synthetic-employee-1",
        action: "sign_in_attempt",
        targetType: "session",
        targetId: "synthetic-session",
        outcome: "failed",
        correlationId: "synthetic-correlation",
      },
      () => timestamp,
    );

    expect(append).toHaveBeenCalledWith({
      institutionId: "synthetic-institution",
      actorUserId: "synthetic-employee-1",
      action: "sign_in_attempt",
      targetType: "session",
      targetId: "synthetic-session",
      timestamp: "2026-11-08T12:30:00.000Z",
      outcome: "failed",
      correlationId: "synthetic-correlation",
    });
  });

  it("rejects invalid event data without writing it", async () => {
    const append = vi.fn(async () => undefined);

    await expect(
      recordAuditEvent(
        { append },
        {
          institutionId: "synthetic-institution",
          actorUserId: null,
          action: "a".repeat(121),
          targetType: "configuration",
          targetId: "synthetic-target",
          outcome: "denied",
        },
      ),
    ).rejects.toThrow("Invalid audit event.");

    expect(append).not.toHaveBeenCalled();
  });
});
