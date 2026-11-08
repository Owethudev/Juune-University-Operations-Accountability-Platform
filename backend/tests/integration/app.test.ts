import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { ProfileView } from "../../src/auth/types.js";

const profile: ProfileView = {
  id: "synthetic-employee-1",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};

function createTestApp(authenticated = true) {
  return createApp({
    authenticator: {
      authenticate: vi.fn(async (authorization: string | undefined) => {
        if (authenticated && authorization === "Bearer synthetic-test-token") {
          return {
            userId: profile.id,
            institutionId: "synthetic-institution",
            departmentId: "synthetic-it",
            role: profile.role,
          };
        }
        return null;
      }),
    },
    profiles: {
      findByUserId: vi.fn(async (userId: string) =>
        userId === profile.id ? profile : null,
      ),
    },
    requests: {
      async getOptions() {
        return { categories: [], departments: [] };
      },
      async submit() {
        throw new Error("Request service should not be called in this test.");
      },
      async list() {
        return { items: [], page: 1, pageSize: 10, total: 0 };
      },
      async getDetail() {
        return null;
      },
      async addResponse() {
        throw new Error("Request service should not be called in this test.");
      },
      async requestReopen() {
        throw new Error("Request service should not be called in this test.");
      },
      async changeStatus() {
        throw new Error("Request service should not be called in this test.");
      },
      async assignToSelf() {
        throw new Error("Request service should not be called in this test.");
      },
      async flagRequest() {
        return { flagCount: 0, reviewTriggered: false };
      },
      async listNotifications() {
        return { items: [], unreadCount: 0, hasMore: false };
      },
      async markNotificationRead() {},
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Phase 1 API", () => {
  it("returns a safe error response and logs a redacted diagnostic on API failures", async () => {
    const sentinel = "synthetic-private-diagnostic";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({
      authenticator: {
        async authenticate() {
          return {
            userId: profile.id,
            institutionId: "synthetic-institution",
            departmentId: "synthetic-it",
            role: "employee" as const,
          };
        },
      },
      profiles: {
        async findByUserId() {
          throw new Error(sentinel);
        },
      },
      requests: {
        async getOptions() {
          return { categories: [], departments: [] };
        },
        async submit() {
          throw new Error("Request service should not be called in this test.");
        },
        async list() {
          return { items: [], page: 1, pageSize: 10, total: 0 };
        },
        async getDetail() {
          return null;
        },
        async addResponse() {
          throw new Error("Request service should not be called in this test.");
        },
        async requestReopen() {
          throw new Error("Request service should not be called in this test.");
        },
        async changeStatus() {
          throw new Error("Request service should not be called in this test.");
        },
        async assignToSelf() {
          throw new Error("Request service should not be called in this test.");
        },
        async flagRequest() {
          return { flagCount: 0, reviewTriggered: false };
        },
        async listNotifications() {
          return { items: [], unreadCount: 0, hasMore: false };
        },
        async markNotificationRead() {},
      },
    });

    const response = await request(app)
      .get("/api/v1/profile")
      .set("Authorization", "******")
      .expect(500);

    expect(response.body.message).toContain("Something went wrong.");
    expect(JSON.stringify(response.body)).not.toContain(sentinel);
    expect(errorSpy).toHaveBeenCalledWith(
      "API request failed.",
      expect.objectContaining({
        method: "GET",
        path: "/api/v1/profile",
        errorName: "Error",
      }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(sentinel);
  });

  it("T-AUTH-2 fails safely when institutional sign-in is not configured", async () => {
    const response = await request(createTestApp())
      .post("/api/v1/auth/start")
      .expect(503);

    expect(response.body).toEqual({
      message:
        "We couldn’t sign you in. Check your institutional account or contact your university support team.",
    });
  });

  it("T-SETUP-4 returns safe health status without environment details", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/health")
      .expect(200);

    expect(response.body).toEqual({ status: "ok" });
    expect(JSON.stringify(response.body)).not.toContain("SUPABASE");
  });

  it("T-AUTH-1 denies unauthenticated access to protected profile routes", async () => {
    await request(createTestApp(false)).get("/api/v1/profile").expect(401);
  });

  it("T-OP20-1 and T-SEC-14a allow reading only the authenticated user's profile", async () => {
    const response = await request(createTestApp())
      .get("/api/v1/profile")
      .set("Authorization", "Bearer synthetic-test-token")
      .expect(200);

    expect(response.body).toEqual(profile);
  });

  it("T-SEC-14b denies profile, preference, role and department writes in Phase 1", async () => {
    const app = createTestApp();

    await request(app)
      .patch("/api/v1/profile/preferences")
      .set("Authorization", "Bearer synthetic-test-token")
      .send({ role: "platform_admin", department: "Administration" })
      .expect(403);
  });
});
