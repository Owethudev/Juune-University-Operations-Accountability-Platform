export type AuditOutcome = "success" | "denied" | "failed";

export interface AuditEventInput {
  institutionId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  outcome: AuditOutcome;
  correlationId?: string;
}

export interface AuditEventRecord extends AuditEventInput {
  timestamp: string;
}

export interface AuditSink {
  append(event: AuditEventRecord): Promise<void>;
}

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

function isValidEvent(event: AuditEventInput): boolean {
  return (
    isNonEmptyText(event.institutionId) &&
    (event.actorUserId === null || isNonEmptyText(event.actorUserId)) &&
    isNonEmptyText(event.action) &&
    event.action.length <= 120 &&
    isNonEmptyText(event.targetType) &&
    isNonEmptyText(event.targetId) &&
    (event.correlationId === undefined ||
      (isNonEmptyText(event.correlationId) && event.correlationId.length <= 120)) &&
    (event.outcome === "success" ||
      event.outcome === "denied" ||
      event.outcome === "failed")
  );
}

export async function recordAuditEvent(
  sink: AuditSink,
  event: AuditEventInput,
  clock: () => Date = () => new Date(),
): Promise<void> {
  if (!isValidEvent(event)) {
    throw new Error("Invalid audit event.");
  }

  const timestamp = clock();
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Invalid audit event timestamp.");
  }

  const record: AuditEventRecord = {
    institutionId: event.institutionId,
    actorUserId: event.actorUserId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    timestamp: timestamp.toISOString(),
    outcome: event.outcome,
    ...(event.correlationId === undefined
      ? {}
      : { correlationId: event.correlationId }),
  };

  await sink.append(record);
}
