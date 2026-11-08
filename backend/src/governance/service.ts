import type { AuthPrincipal } from "../auth/types.js";
import type {
  AuditFilters,
  AuditEvent,
  DeactivationResult,
  GovernanceCategory,
  GovernanceConfiguration,
  GovernanceService as GovernanceServiceContract,
  RolePermissionChangeInput,
  RequestCategoryInput,
  UserRoleChangeInput,
} from "./types.js";

export class GovernanceActionError extends Error {
  constructor(
    readonly kind: "denied" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "GovernanceActionError";
  }
}

function requirePlatformAdmin(principal: AuthPrincipal): void {
  if (principal.role !== "platform_admin") {
    throw new GovernanceActionError(
      "denied",
      "You don’t have permission to change configuration.",
    );
  }
}

export class GovernanceManagementService implements GovernanceServiceContract {
  constructor(private readonly repository: GovernanceServiceContract) {}

  async getConfiguration(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<GovernanceConfiguration> {
    requirePlatformAdmin(principal);
    return this.repository.getConfiguration(principal, authorizationHeader);
  }

  async saveCategory(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RequestCategoryInput,
  ): Promise<GovernanceCategory> {
    requirePlatformAdmin(principal);
    return this.repository.saveCategory(principal, authorizationHeader, input);
  }

  async setUserRole(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: UserRoleChangeInput,
  ): Promise<void> {
    requirePlatformAdmin(principal);
    if (input.roleCode === "platform_admin" || input.userId === principal.userId) {
      throw new GovernanceActionError(
        "denied",
        "Administrator access requires the designated second-approver process.",
      );
    }
    return this.repository.setUserRole(principal, authorizationHeader, input);
  }

  async setRolePermission(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RolePermissionChangeInput,
  ): Promise<void> {
    requirePlatformAdmin(principal);
    if (["SEC11", "SEC12", "SEC13"].includes(input.permissionCode)) {
      throw new GovernanceActionError(
        "denied",
        "Sensitive permission changes require the designated second-approver process.",
      );
    }
    return this.repository.setRolePermission(
      principal,
      authorizationHeader,
      input,
    );
  }

  async deactivateDepartment(
    principal: AuthPrincipal,
    authorizationHeader: string,
    departmentId: string,
    replacementDepartmentId: string,
  ): Promise<DeactivationResult> {
    requirePlatformAdmin(principal);
    if (departmentId === replacementDepartmentId) {
      throw new GovernanceActionError(
        "invalid",
        "Choose a different active department for reassignment.",
      );
    }
    return this.repository.deactivateDepartment(
      principal,
      authorizationHeader,
      departmentId,
      replacementDepartmentId,
    );
  }

  listAuditEvents(
    _authorizationHeader: string,
    filters: AuditFilters,
  ): Promise<AuditEvent[]> {
    return this.repository.listAuditEvents(_authorizationHeader, filters);
  }
}
