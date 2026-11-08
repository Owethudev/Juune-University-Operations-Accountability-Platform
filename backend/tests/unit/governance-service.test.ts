import { describe, expect, it, vi } from "vitest";
import {
  GovernanceActionError,
  GovernanceManagementService,
} from "../../src/governance/service.js";
import type { GovernanceService } from "../../src/governance/types.js";

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

function createService() {
  const repository: GovernanceService = {
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
      name: "Synthetic category",
      description: null,
      defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
      sensitivityDefault: "standard" as const,
      active: true,
    })),
    setUserRole: vi.fn(async () => undefined),
    setRolePermission: vi.fn(async () => undefined),
    deactivateDepartment: vi.fn(async () => ({
      reassignedRequests: 0,
      reassignedUsers: 0,
    })),
    listAuditEvents: vi.fn(async () => []),
  };
  return {
    service: new GovernanceManagementService(repository),
    repository,
  };
}

describe("Phase 8 governance authorization service", () => {
  it("denies non-admin reads and writes even when called directly", async () => {
    const { service, repository } = createService();

    await expect(
      service.getConfiguration(employee, "Bearer synthetic"),
    ).rejects.toBeInstanceOf(GovernanceActionError);
    await expect(
      service.saveCategory(employee, "Bearer synthetic", {
        name: "Synthetic category",
        description: null,
        defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
        sensitivityDefault: "standard",
        active: true,
      }),
    ).rejects.toMatchObject({ kind: "denied" });
    expect(repository.getConfiguration).not.toHaveBeenCalled();
    expect(repository.saveCategory).not.toHaveBeenCalled();
  });

  it("T-SEC-13a/b blocks self-elevation, administrator grants, and sensitive permission changes", async () => {
    const { service, repository } = createService();

    await expect(
      service.setUserRole(employee, "Bearer synthetic", {
        userId: employee.userId,
        roleCode: "department_manager",
        granted: true,
      }),
    ).rejects.toMatchObject({ kind: "denied" });
    await expect(
      service.setUserRole(admin, "Bearer synthetic", {
        userId: employee.userId,
        roleCode: "platform_admin",
        granted: true,
      }),
    ).rejects.toMatchObject({ kind: "denied" });
    await expect(
      service.setRolePermission(admin, "Bearer synthetic", {
        roleCode: "employee",
        permissionCode: "SEC13",
        granted: true,
      }),
    ).rejects.toMatchObject({ kind: "denied" });
    expect(repository.setUserRole).not.toHaveBeenCalled();
    expect(repository.setRolePermission).not.toHaveBeenCalled();
  });

  it("allows administrators to delegate approved non-admin role and permission changes", async () => {
    const { service, repository } = createService();

    await service.setUserRole(admin, "Bearer synthetic", {
      userId: employee.userId,
      roleCode: "department_manager",
      granted: true,
    });
    await service.setRolePermission(admin, "Bearer synthetic", {
      roleCode: "employee",
      permissionCode: "SEC1",
      granted: true,
    });

    expect(repository.setUserRole).toHaveBeenCalledWith(
      admin,
      "Bearer synthetic",
      {
        userId: employee.userId,
        roleCode: "department_manager",
        granted: true,
      },
    );
    expect(repository.setRolePermission).toHaveBeenCalledWith(
      admin,
      "Bearer synthetic",
      {
        roleCode: "employee",
        permissionCode: "SEC1",
        granted: true,
      },
    );
  });
});
