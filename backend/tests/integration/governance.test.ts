import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { GovernanceActionError } from "../../src/governance/service.js";
import type {
  AuditEvent,
  GovernanceService,
  RequestCategoryInput,
} from "../../src/governance/types.js";
import { unusedContentService } from "./content-fixture.js";

const admin = {
  userId: "00000000-0000-4000-8000-000000000204",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: null,
  role: "platform_admin" as const,
};
const employee = {
  ...admin,
  userId: "00000000-0000-4000-8000-000000000201",
  role: "employee" as const,
};
const categoryInput: RequestCategoryInput = {
  name: "Synthetic category",
  description: "Synthetic category description.",
  defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
  sensitivityDefault: "standard",
  active: true,
};
const auditEvent: AuditEvent = {
  id: "00000000-0000-4000-8000-000000000901",
  actorId: admin.userId,
  actorName: "Synthetic Platform Administrator",
  action: "request_categories.insert",
  targetType: "request_categories",
  targetId: "00000000-0000-4000-8000-000000000902",
  createdAt: "2026-11-08T10:00:00.000Z",
  outcome: "success",
};

function createTestApp({
  principal = admin,
  auditError,
}: {
  principal?: typeof admin | typeof employee;
  auditError?: GovernanceActionError;
} = {}) {
  const governance: GovernanceService = {
    getConfiguration: vi.fn(async () => ({
      departments: [],
      categories: [],
      roles: [],
      rolePermissions: [],
      permissions: [],
      users: [],
      escalation: {
        trigger: "third_flag" as const,
        recipientConfigurationEnabled: false as const,
      },
    })),
    saveCategory: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000902",
      ...categoryInput,
    })),
    setUserRole: vi.fn(async () => undefined),
    setRolePermission: vi.fn(async () => undefined),
    deactivateDepartment: vi.fn(async () => ({
      reassignedRequests: 1,
      reassignedUsers: 2,
    })),
    listAuditEvents: vi.fn(async () => {
      if (auditError) throw auditError;
      return [auditEvent];
    }),
  };
  const app = createApp({
    authenticator: {
      authenticate: vi.fn(async (authorization: string | undefined) =>
        authorization === "Bearer ******" ? principal : null,
      ),
    },
    profiles: { findByUserId: vi.fn(async () => null) },
    requests: {
      getOptions: async () => ({ categories: [], departments: [] }),
      submit: async () => { throw new Error("Not used in governance test."); },
      list: async () => ({ items: [], page: 1, pageSize: 10, total: 0 }),
      getDetail: async () => null,
      addResponse: async () => { throw new Error("Not used in governance test."); },
      requestReopen: async () => { throw new Error("Not used in governance test."); },
      changeStatus: async () => { throw new Error("Not used in governance test."); },
      assignToSelf: async () => { throw new Error("Not used in governance test."); },
      flagRequest: async () => ({ flagCount: 0, reviewTriggered: false }),
      listNotifications: async () => ({ items: [], unreadCount: 0, hasMore: false }),
      markNotificationRead: async () => undefined,
      getDashboardSummary: async () => ({ rows: [], recentRequests: [] }),
    },
    content: unusedContentService(),
    governance,
  });
  return { app, governance };
}

describe("Phase 8 governance API", () => {
  it("T-US8-1/T-BR11-1 saves valid configuration through the audited admin service", async () => {
    const { app, governance } = createTestApp();

    await request(app)
      .get("/api/v1/admin/configuration")
      .set("Authorization", "Bearer ******")
      .expect(200);
    expect(governance.getConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.userId }),
      "Bearer ******",
    );

    await request(app)
      .put("/api/v1/admin/configuration/categories")
      .set("Authorization", "Bearer ******")
      .send(categoryInput)
      .expect(200, {
        category: {
          id: "00000000-0000-4000-8000-000000000902",
          ...categoryInput,
        },
      });

    expect(governance.saveCategory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.userId }),
      "Bearer ******",
      categoryInput,
    );
  });

  it("T-US8-2/T-SEC-11b denies non-admin configuration writes before persistence", async () => {
    const { app, governance } = createTestApp({ principal: employee });

    await request(app)
      .put("/api/v1/admin/configuration/categories")
      .set("Authorization", "Bearer ******")
      .send(categoryInput)
      .expect(403);

    expect(governance.saveCategory).not.toHaveBeenCalled();
  });

  it("T-SEC-13a allows administrators to request audited non-admin role and permission changes", async () => {
    const { app, governance } = createTestApp();

    await request(app)
      .put("/api/v1/admin/configuration/user-roles")
      .set("Authorization", "Bearer ******")
      .send({
        userId: employee.userId,
        roleCode: "department_manager",
        granted: true,
      })
      .expect(200, { saved: true });
    await request(app)
      .put("/api/v1/admin/configuration/role-permissions")
      .set("Authorization", "Bearer ******")
      .send({
        roleCode: "employee",
        permissionCode: "SEC1",
        granted: false,
      })
      .expect(200, { saved: true });

    expect(governance.setUserRole).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.userId }),
      "Bearer ******",
      {
        userId: employee.userId,
        roleCode: "department_manager",
        granted: true,
      },
    );
    expect(governance.setRolePermission).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.userId }),
      "Bearer ******",
      {
        roleCode: "employee",
        permissionCode: "SEC1",
        granted: false,
      },
    );
  });

  it("T-SEC-13b denies non-admin direct role and permission writes", async () => {
    const { app, governance } = createTestApp({ principal: employee });

    await request(app)
      .put("/api/v1/admin/configuration/user-roles")
      .set("Authorization", "Bearer ******")
      .send({
        userId: admin.userId,
        roleCode: "department_manager",
        granted: true,
      })
      .expect(403);
    await request(app)
      .put("/api/v1/admin/configuration/role-permissions")
      .set("Authorization", "Bearer ******")
      .send({
        roleCode: "employee",
        permissionCode: "SEC1",
        granted: true,
      })
      .expect(403);

    expect(governance.setUserRole).not.toHaveBeenCalled();
    expect(governance.setRolePermission).not.toHaveBeenCalled();
  });

  it("validates category references and strict input shapes at the API boundary", async () => {
    const { app, governance } = createTestApp();

    await request(app)
      .put("/api/v1/admin/configuration/categories")
      .set("Authorization", "Bearer ******")
      .send({ ...categoryInput, defaultDepartmentId: "not-a-uuid" })
      .expect(400);

    await request(app)
      .put("/api/v1/admin/configuration/categories")
      .set("Authorization", "Bearer ******")
      .send({ ...categoryInput, name: "Unapproved department category" })
      .expect(200);

    expect(governance.saveCategory).toHaveBeenCalledTimes(1);
  });

  it("T-SEC-12a/b returns only permitted audit fields and denies unauthorized reviewers", async () => {
    const { app, governance } = createTestApp();
    const response = await request(app)
      .get("/api/v1/audit-events")
      .set("Authorization", "Bearer ******")
      .query({ actorId: admin.userId, action: "request_categories.insert" })
      .expect(200);

    expect(governance.listAuditEvents).toHaveBeenCalledWith(
      "Bearer ******",
      {
        from: undefined,
        to: undefined,
        actorId: admin.userId,
        action: "request_categories.insert",
        targetId: undefined,
        page: 1,
        pageSize: 25,
      },
    );
    expect(response.body.items).toEqual([auditEvent]);
    expect(response.body.items[0]).not.toHaveProperty("email");
    expect(response.body.items[0]).not.toHaveProperty("metadata");

    const denied = createTestApp({
      auditError: new GovernanceActionError("denied", "Not permitted."),
    });
    await request(denied.app)
      .get("/api/v1/audit-events")
      .set("Authorization", "Bearer ******")
      .expect(403);
  });

  it("T-EDGE-1 refuses department deactivation without reassignment", async () => {
    const { app, governance } = createTestApp();

    await request(app)
      .post("/api/v1/admin/configuration/departments/00000000-0000-4000-8000-000000000101/deactivate")
      .set("Authorization", "Bearer ******")
      .send({})
      .expect(400);

    await request(app)
      .post("/api/v1/admin/configuration/departments/00000000-0000-4000-8000-000000000101/deactivate")
      .set("Authorization", "Bearer ******")
      .send({ replacementDepartmentId: "00000000-0000-4000-8000-000000000102" })
      .expect(200, { reassignedRequests: 1, reassignedUsers: 2 });

    expect(governance.deactivateDepartment).toHaveBeenCalledTimes(1);
  });
});
