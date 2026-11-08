import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { unusedContentService } from "./content-fixture.js";
import type { ProfileView } from "../../src/auth/types.js";
import type {
  CreatedRequest,
  RequestOptions,
} from "../../src/requests/types.js";

const profile: ProfileView = {
  id: "00000000-0000-4000-8000-000000000201",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};

const principal = {
  userId: profile.id,
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee" as const,
};

const options: RequestOptions = {
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      name: "IT support",
      defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
      sensitivityDefault: "standard",
    },
  ],
  departments: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      name: "IT",
    },
  ],
};

const created: CreatedRequest = {
  id: "00000000-0000-4000-8000-000000000401",
  reference: "JU-ABCDEFGH",
  categoryId: options.categories[0]!.id,
  departmentId: options.departments[0]!.id,
  summary: "A synthetic IT request",
  description: "A synthetic description for this test request.",
  status: "submitted",
  createdAt: "2026-11-08T12:00:00.000Z",
  replayed: false,
};

function createTestApp({
  role = "employee",
  authenticated = true,
  submit = vi.fn(async () => created),
}: {
  role?: "employee" | "department_manager" | "senior_leadership" | "platform_admin";
  authenticated?: boolean;
  submit?: ReturnType<typeof vi.fn<(...args: never[]) => Promise<CreatedRequest>>>;
} = {}) {
  const service = {
    getOptions: vi.fn(async () => options),
    submit,
    list: vi.fn(async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    })),
    getDetail: vi.fn(async () => null),
    addResponse: vi.fn(async () => {
      throw new Error("Request service should not be called in this test.");
    }),
    requestReopen: vi.fn(async () => {
      throw new Error("Request service should not be called in this test.");
    }),
    changeStatus: vi.fn(async () => {
      throw new Error("Request service should not be called in this test.");
    }),
    assignToSelf: vi.fn(async () => {
      throw new Error("Request service should not be called in this test.");
    }),
    flagRequest: vi.fn(async () => ({
      flagCount: 0,
      reviewTriggered: false,
    })),
    listNotifications: vi.fn(async () => ({
      items: [],
      unreadCount: 0,
      hasMore: false,
    })),
    markNotificationRead: vi.fn(async () => undefined),
    getDashboardSummary: vi.fn(async () => ({ rows: [], recentRequests: [] })),
  };

  const app = createApp({
    authenticator: {
      authenticate: vi.fn(async (authorization: string | undefined) =>
        authenticated && authorization === "Bearer synthetic-test-token"
          ? { ...principal, role }
          : null,
      ),
    },
    profiles: {
      findByUserId: vi.fn(async () => profile),
    },
    requests: service,
    content: unusedContentService(),
  });

  return { app, service };
}

const validPayload = {
  categoryId: options.categories[0]!.id,
  departmentId: options.departments[0]!.id,
  summary: created.summary,
  description: created.description,
};

describe("Phase 3 request API", () => {
  it("T-US1-1 lists only authenticated request options", async () => {
    const { app, service } = createTestApp();

    await request(app)
      .get("/api/v1/requests/options")
      .set("Authorization", "Bearer synthetic-test-token")
      .expect(200, options);

    expect(service.getOptions).toHaveBeenCalledOnce();
  });

  it("T-US1-1 creates a submitted request and returns its confirmation details", async () => {
    const { app, service } = createTestApp();

    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-test-token")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000501")
      .send(validPayload)
      .expect(201);

    expect(response.body).toEqual(created);
    expect(service.submit).toHaveBeenCalledOnce();
  });

  it("T-BR1-1 and T-US1-2 reject missing or invalid fields without creating a request", async () => {
    const { app, service } = createTestApp();

    const response = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-test-token")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000502")
      .send({ ...validPayload, categoryId: "", departmentId: "", summary: "bad", description: "short" })
      .expect(400);

    expect(response.body.errors).toEqual({
      categoryId: "Choose a category.",
      departmentId: "Choose a destination department.",
      summary: "Enter a short summary.",
      description: "Enter a description.",
    });
    expect(service.submit).not.toHaveBeenCalled();
  });

  it("T-SEC-1b denies unauthenticated and non-employee request creation", async () => {
    const unauthenticated = createTestApp({ authenticated: false });
    await request(unauthenticated.app)
      .post("/api/v1/requests")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000503")
      .send(validPayload)
      .expect(401);
    expect(unauthenticated.service.submit).not.toHaveBeenCalled();

    const manager = createTestApp({ role: "department_manager" });
    await request(manager.app)
      .post("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-test-token")
      .set("Idempotency-Key", "00000000-0000-4000-8000-000000000504")
      .send(validPayload)
      .expect(403);
    expect(manager.service.submit).not.toHaveBeenCalled();
  });

  it("T-EDGE-3 forwards the same idempotency key on retry", async () => {
    const submit = vi.fn(async () => ({ ...created, replayed: true }));
    const { app } = createTestApp({ submit });
    const key = "00000000-0000-4000-8000-000000000505";

    const first = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-test-token")
      .set("Idempotency-Key", key)
      .send(validPayload)
      .expect(200);
    const retry = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", "Bearer synthetic-test-token")
      .set("Idempotency-Key", key)
      .send(validPayload)
      .expect(200);

    expect(first.body).toEqual(retry.body);
    expect(first.body.replayed).toBe(true);
    expect(submit).toHaveBeenCalledTimes(2);
  });
});
