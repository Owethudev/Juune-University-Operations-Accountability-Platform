import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type {
  CreatedRequest,
  RequestDetail,
  RequestListPage,
  RequestOptions,
} from "../../src/requests/types.js";

const employee = {
  userId: "00000000-0000-4000-8000-000000000201",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee" as const,
};
const manager = {
  ...employee,
  userId: "00000000-0000-4000-8000-000000000202",
  role: "department_manager" as const,
};
const requestId = "00000000-0000-4000-8000-000000000401";
const detail: RequestDetail = {
  id: requestId,
  reference: "JU-ABCDEFGH",
  categoryId: "00000000-0000-4000-8000-000000000301",
  departmentId: employee.departmentId,
  summary: "A synthetic request",
  description: "A synthetic description for this request.",
  category: { id: "00000000-0000-4000-8000-000000000301", name: "IT support" },
  department: { id: employee.departmentId, name: "IT" },
  requester: { id: employee.userId, name: "Synthetic Employee" },
  assignedTo: { id: manager.userId, name: "Synthetic Manager" },
  status: "in_progress" as const,
  statusReason: null,
  createdAt: "2026-11-08T12:00:00.000Z",
  updatedAt: "2026-11-08T12:30:00.000Z",
  sensitivity: "standard",
  events: [
    {
      id: "00000000-0000-4000-8000-000000000501",
      eventType: "created",
      actorName: "Synthetic Employee",
      message: null,
      metadata: {},
      createdAt: "2026-11-08T12:00:00.000Z",
    },
  ],
  attachments: [],
};
const page: RequestListPage = {
  items: [
    {
      id: requestId,
      reference: "JU-ABCDEFGH",
      summary: "A synthetic request",
      categoryId: "00000000-0000-4000-8000-000000000301",
      categoryName: "IT support",
      departmentId: employee.departmentId,
      departmentName: "IT",
      status: "in_progress",
      updatedAt: "2026-11-08T12:30:00.000Z",
    },
  ],
  page: 1,
  pageSize: 10,
  total: 1,
};
const options: RequestOptions = { categories: [], departments: [] };
const created: CreatedRequest = {
  id: requestId,
  reference: "JU-ABCDEFGH",
  categoryId: "00000000-0000-4000-8000-000000000301",
  departmentId: employee.departmentId,
  summary: "A synthetic request",
  description: "A synthetic description for this request.",
  status: "submitted",
  createdAt: "2026-11-08T12:00:00.000Z",
  replayed: false,
};

function testApp({
  role = "employee",
  listResult = page,
  detailResult = detail,
}: {
  role?: "employee" | "department_manager" | "senior_leadership" | "platform_admin";
  listResult?: typeof page;
  detailResult?: typeof detail | null;
} = {}) {
  const principal = { ...employee, role };
  const service = {
    getOptions: vi.fn(async () => options),
    submit: vi.fn(async () => created),
    list: vi.fn(async () => listResult),
    getDetail: vi.fn(async () => detailResult),
    addResponse: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000502",
      eventType: "response" as const,
      actorName: "Synthetic Employee",
      message: "I can provide more details.",
      metadata: {},
      createdAt: "2026-11-08T12:45:00.000Z",
    })),
    requestReopen: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000503",
      eventType: "response" as const,
      actorName: "Synthetic Employee",
      message: "The issue has returned.",
      metadata: { kind: "reopen_request" },
      createdAt: "2026-11-08T13:00:00.000Z",
    })),
    changeStatus: vi.fn(async () => ({
      ...detail,
      status: "resolved" as const,
      statusReason: "The reported issue was addressed.",
    })),
    assignToSelf: vi.fn(async () => ({
      ...detail,
      assignedTo: { id: manager.userId, name: "Synthetic Manager" },
    })),
    flagRequest: vi.fn(async () => ({
      flagCount: 3,
      reviewTriggered: true,
    })),
    listNotifications: vi.fn(async () => ({
      items: [
        {
          id: "00000000-0000-4000-8000-000000000601",
          eventType: "request_status_changed",
          relatedEntityType: "request",
          relatedEntityId: requestId,
          createdAt: "2026-11-08T12:40:00.000Z",
          isRead: false,
        },
      ],
      unreadCount: 1,
      hasMore: false,
    })),
    markNotificationRead: vi.fn(async () => undefined),
  };
  const app = createApp({
    authenticator: {
      authenticate: vi.fn(async (authorization: string | undefined) =>
        authorization === "Bearer synthetic-token" ? principal : null,
      ),
    },
    profiles: { findByUserId: vi.fn(async () => null) },
    requests: service,
  });
  return { app, service };
}

function testAppWithAuthenticatedPrincipal() {
  const { service } = testApp();
  const app = createApp({
    authenticator: {
      authenticate: vi.fn(async () => employee),
    },
    profiles: { findByUserId: vi.fn(async () => null) },
    requests: service,
  });
  return { app, service };
}

describe("Phase 4 request tracking API", () => {
  it("T-US2-1 lists only accessible requests with validated filters and pagination", async () => {
    const { app, service } = testApp();

    await request(app)
      .get("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-token")
      .query({
        search: "JU-ABCD",
        status: "in_progress",
        categoryId: "00000000-0000-4000-8000-000000000301",
        departmentId: employee.departmentId,
        from: "2026-11-01",
        to: "2026-11-08",
        page: "2",
        pageSize: "20",
      })
      .expect(200, page);

    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      expect.objectContaining({
        search: "JU-ABCD",
        status: "in_progress",
        page: 2,
        pageSize: 20,
      }),
    );
  });

  it("rejects malformed or reversed list filters without querying the repository", async () => {
    const { app, service } = testApp();

    await request(app)
      .get("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-token")
      .query({ from: "2026-11-09", to: "2026-11-08" })
      .expect(400);

    expect(service.list).not.toHaveBeenCalled();
  });

  it("T-US2-1 returns permitted details and a chronological history", async () => {
    const { app, service } = testApp();

    await request(app)
      .get(`/api/v1/requests/${requestId}`)
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, detail);

    expect(service.getDetail).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      requestId,
    );
  });

  it("T-US2-2 denies a direct URL without disclosing whether the request exists", async () => {
    const { app } = testApp({ detailResult: null });
    const response = await request(app)
      .get(`/api/v1/requests/${requestId}`)
      .set("Authorization", "Bearer synthetic-token")
      .expect(404);

    expect(response.body).toEqual({
      message: "You don’t have permission to view this item.",
    });
    expect(JSON.stringify(response.body)).not.toContain("A synthetic request");
  });

  it("T-US2-3 records an authorised response through the request service", async () => {
    const { app, service } = testApp();
    const message = "I can provide more details.";
    const response = await request(app)
      .post(`/api/v1/requests/${requestId}/responses`)
      .set("Authorization", "Bearer synthetic-token")
      .send({ message })
      .expect(201);

    expect(response.body.event.eventType).toBe("response");
    expect(response.body.event.actorName).toBe("Synthetic Employee");
    expect(response.body.event.createdAt).toBeTruthy();
    expect(service.addResponse).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      requestId,
      message,
    );
  });

  it("T-US4-3 flags a requester-owned request and creates a review event on the third flag", async () => {
    const { app, service } = testAppWithAuthenticatedPrincipal();
    const response = await request(app)
      .post(`/api/v1/requests/${requestId}/flags`)
      .set("Authorization", "Bearer phase5-test-token")
      .send({})
      .expect(200);

    expect(response.body).toEqual({ flagCount: 3, reviewTriggered: true });
    expect(service.flagRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer phase5-test-token",
      requestId,
    );
  });

  it("T-SEC-4a lists only the authenticated user's in-app notifications and marks them read", async () => {
    const { app, service } = testAppWithAuthenticatedPrincipal();
    await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", "Bearer phase5-test-token")
      .expect(200, {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000601",
            eventType: "request_status_changed",
            relatedEntityType: "request",
            relatedEntityId: requestId,
            createdAt: "2026-11-08T12:40:00.000Z",
            isRead: false,
          },
        ],
        unreadCount: 1,
        hasMore: false,
      });
    await request(app)
      .patch("/api/v1/notifications/00000000-0000-4000-8000-000000000601/read")
      .set("Authorization", "Bearer phase5-test-token")
      .expect(204);

    expect(service.listNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer phase5-test-token",
      1,
    );
    expect(service.markNotificationRead).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer phase5-test-token",
      "00000000-0000-4000-8000-000000000601",
    );
  });

  it("T-EDGE-10 accepts a reasoned reopen request without changing status immediately", async () => {
    const { app, service } = testApp();
    const reason = "The issue has returned.";

    const response = await request(app)
      .post(`/api/v1/requests/${requestId}/reopen-requests`)
      .set("Authorization", "Bearer synthetic-token")
      .send({ reason })
      .expect(201);

    expect(response.body.event.metadata).toEqual({ kind: "reopen_request" });
    expect(service.requestReopen).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      requestId,
      reason,
    );
  });

  it("T-US2-3 and T-BR3-1 record manager status changes with required reasons", async () => {
    const { app, service } = testApp({ role: "department_manager" });
    const reason = "The reported issue was addressed.";

    const response = await request(app)
      .patch(`/api/v1/requests/${requestId}/status`)
      .set("Authorization", "Bearer synthetic-token")
      .send({ status: "resolved", reason })
      .expect(200);

    expect(response.body.status).toBe("resolved");
    expect(response.body.statusReason).toBe(reason);
    expect(service.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ role: "department_manager" }),
      "Bearer synthetic-token",
      requestId,
      "resolved",
      reason,
    );
  });

  it("T-SEC-3b denies status changes from an employee", async () => {
    const { app, service } = testApp();

    await request(app)
      .patch(`/api/v1/requests/${requestId}/status`)
      .set("Authorization", "Bearer synthetic-token")
      .send({ status: "resolved", reason: "Completed." })
      .expect(403);

    expect(service.changeStatus).not.toHaveBeenCalled();
  });

  it("allows managers to assign a request to themselves", async () => {
    const { app, service } = testApp({ role: "department_manager" });

    const response = await request(app)
      .post(`/api/v1/requests/${requestId}/assignment`)
      .set("Authorization", "Bearer synthetic-token")
      .send({})
      .expect(200);

    expect(response.body.assignedTo.id).toBe(manager.userId);
    expect(service.assignToSelf).toHaveBeenCalledWith(
      expect.objectContaining({ role: "department_manager" }),
      "Bearer synthetic-token",
      requestId,
    );
  });
});
