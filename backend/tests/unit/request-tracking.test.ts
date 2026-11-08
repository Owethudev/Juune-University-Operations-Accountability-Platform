import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/auth/types.js";
import {
  RequestActionError,
  RequestCreationService,
} from "../../src/requests/service.js";
import type {
  RequestDetail,
  RequestRepository,
  RequestStatus,
} from "../../src/requests/types.js";

const employee: AuthPrincipal = {
  userId: "00000000-0000-4000-8000-000000000201",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee",
};
const manager: AuthPrincipal = {
  ...employee,
  userId: "00000000-0000-4000-8000-000000000202",
  role: "department_manager",
};
const requestId = "00000000-0000-4000-8000-000000000401";

function requestDetail(
  status: RequestStatus = "in_progress",
  assignedTo: string | null = manager.userId,
): RequestDetail {
  return {
    id: requestId,
    reference: "JU-ABCDEFGH",
    categoryId: "00000000-0000-4000-8000-000000000301",
    departmentId: employee.departmentId!,
    summary: "A synthetic request",
    description: "A synthetic description for this request.",
    status,
    statusReason: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    updatedAt: "2026-11-08T12:30:00.000Z",
    sensitivity: "standard",
    requester: { id: employee.userId, name: "Synthetic Employee" },
    assignedTo: assignedTo
      ? { id: assignedTo, name: "Synthetic Manager" }
      : null,
    category: {
      id: "00000000-0000-4000-8000-000000000301",
      name: "IT support",
    },
    department: {
      id: employee.departmentId!,
      name: "IT",
    },
    events: [],
    attachments: [],
  };
}

function createRepository(
  overrides: Partial<RequestRepository> = {},
): RequestRepository {
  return {
    getOptions: vi.fn(async () => ({ categories: [], departments: [] })),
    findByIdempotencyKey: vi.fn(async () => null),
    insert: vi.fn(async () => ({
      id: requestId,
      reference: "JU-ABCDEFGH",
      categoryId: "00000000-0000-4000-8000-000000000301",
      departmentId: employee.departmentId!,
      summary: "A synthetic request",
      description: "A synthetic description for this request.",
      status: "submitted" as const,
      createdAt: "2026-11-08T12:00:00.000Z",
    })),
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 10, total: 0 })),
    getDetail: vi.fn(async () => requestDetail()),
    addResponse: vi.fn(async (_authorization, _principal, _id, message, kind) => ({
      id: "00000000-0000-4000-8000-000000000501",
      eventType: "response" as const,
      actorName: "Synthetic Employee",
      message,
      metadata:
        kind === "reopen_request" ? { kind } : ({} as Record<string, unknown>),
      createdAt: "2026-11-08T13:00:00.000Z",
    })),
    hasReopenRequest: vi.fn(async () => false),
    changeStatus: vi.fn(async (_authorization, _id, status, reason) => ({
      ...requestDetail(status),
      statusReason: reason,
    })),
    assignToSelf: vi.fn(async (_authorization, principal) =>
      requestDetail("in_progress", principal.userId),
    ),
    flagRequest: vi.fn(async () => 1),
    listNotifications: vi.fn(async () => ({
      items: [],
      unreadCount: 0,
      hasMore: false,
    })),
    markNotificationRead: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("Request tracking service", () => {
  it("allows a requester response and denies a non-participant", async () => {
    const repository = createRepository();
    const service = new RequestCreationService(repository);

    await expect(
      service.addResponse(employee, "******", requestId, "A requester update."),
    ).resolves.toMatchObject({
      eventType: "response",
      message: "A requester update.",
    });

    const unrelated = { ...employee, userId: "00000000-0000-4000-8000-000000000299" };
    await expect(
      service.addResponse(unrelated, "******", requestId, "Unauthorized update."),
    ).rejects.toMatchObject({ kind: "denied" });
    expect(repository.addResponse).toHaveBeenCalledOnce();
  });

  it("T-US4-3 records requester flags and identifies the third-flag review trigger", async () => {
    const repository = createRepository({
      flagRequest: vi
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.flagRequest(employee, "******", requestId),
    ).resolves.toEqual({ flagCount: 1, reviewTriggered: false });
    await expect(
      service.flagRequest(employee, "******", requestId),
    ).resolves.toEqual({ flagCount: 2, reviewTriggered: false });
    await expect(
      service.flagRequest(employee, "******", requestId),
    ).resolves.toEqual({ flagCount: 3, reviewTriggered: true });
    expect(repository.flagRequest).toHaveBeenCalledTimes(3);
  });

  it("denies a manager flagging a request they do not own before updating the counter", async () => {
    const repository = createRepository();
    const service = new RequestCreationService(repository);

    await expect(
      service.flagRequest(manager, "******", requestId),
    ).rejects.toMatchObject({ kind: "denied" });
    expect(repository.flagRequest).not.toHaveBeenCalled();
  });

  it("returns only notifications scoped by the repository and keeps escalation notification behavior gated", async () => {
    const repository = createRepository();
    const service = new RequestCreationService(repository);

    await expect(
      service.listNotifications(employee, "******"),
    ).resolves.toMatchObject({ items: [], unreadCount: 0 });
    expect(repository.listNotifications).toHaveBeenCalledWith("******", 1);
  });

  it("allows only the assigned manager to make an allowed status transition", async () => {
    const repository = createRepository({
      getDetail: vi.fn(async () => requestDetail("in_progress")),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.changeStatus(
        manager,
        "Bearer synthetic-token",
        requestId,
        "resolved",
        "The issue was addressed.",
      ),
    ).resolves.toMatchObject({
      status: "resolved",
      statusReason: "The issue was addressed.",
    });
    expect(repository.changeStatus).toHaveBeenCalledWith(
      "Bearer synthetic-token",
      requestId,
      "resolved",
      "The issue was addressed.",
    );
  });

  it("assigns an unassigned request to the manager and rejects a conflicting owner", async () => {
    const repository = createRepository({
      getDetail: vi.fn(async () => requestDetail("submitted", null)),
      assignToSelf: vi.fn(async (_authorization, principal) =>
        requestDetail("submitted", principal.userId),
      ),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.assignToSelf(manager, "******", requestId),
    ).resolves.toMatchObject({ assignedTo: { id: manager.userId } });

    const alreadyAssigned = createRepository({
      getDetail: vi.fn(async () =>
        requestDetail("submitted", "00000000-0000-4000-8000-000000000299"),
      ),
    });
    await expect(
      new RequestCreationService(alreadyAssigned).assignToSelf(
        manager,
        "******",
        requestId,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    expect(alreadyAssigned.assignToSelf).not.toHaveBeenCalled();
  });

  it("denies a manager who is not assigned to the request", async () => {
    const repository = createRepository({
      getDetail: vi.fn(async () =>
        requestDetail("in_progress", "00000000-0000-4000-8000-000000000299"),
      ),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.changeStatus(
        manager,
        "Bearer synthetic-token",
        requestId,
        "resolved",
        "Complete.",
      ),
    ).rejects.toMatchObject({
      kind: "denied",
    } satisfies Partial<RequestActionError>);
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("requires a reason for on-hold and resolved transitions", async () => {
    const service = new RequestCreationService(createRepository());

    await expect(
      service.changeStatus(
        manager,
        "Bearer synthetic-token",
        requestId,
        "on_hold",
        null,
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("does not allow closure or unsupported lifecycle transitions", async () => {
    const repository = createRepository();
    const service = new RequestCreationService(repository);

    await expect(
      service.changeStatus(
        manager,
        "Bearer synthetic-token",
        requestId,
        "closed",
        "Done.",
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("requires a requester reopen request before a manager confirms reopening", async () => {
    const repository = createRepository({
      getDetail: vi.fn(async () => requestDetail("resolved")),
      hasReopenRequest: vi.fn(async () => false),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.changeStatus(
        manager,
        "Bearer synthetic-token",
        requestId,
        "reopened",
        null,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });
});
