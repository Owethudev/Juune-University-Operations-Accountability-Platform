import type { AuthPrincipal } from "../auth/types.js";

export type RequestSensitivity = "standard" | "restricted";

export interface GovernanceDepartment {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive";
}

export interface GovernanceCategory {
  id: string;
  name: string;
  description: string | null;
  defaultDepartmentId: string;
  sensitivityDefault: RequestSensitivity;
  active: boolean;
}

export interface GovernanceRole {
  code: string;
  displayName: string;
}

export interface GovernanceRolePermission {
  roleCode: string;
  permissionCode: string;
  description: string;
}

export interface GovernancePermission {
  code: string;
  description: string;
}

export interface GovernanceUser {
  id: string;
  name: string;
  department: string | null;
  status: "active" | "deactivated" | "invited" | "suspended";
  roleCodes: string[];
}

export interface GovernanceConfiguration {
  departments: GovernanceDepartment[];
  categories: GovernanceCategory[];
  roles: GovernanceRole[];
  rolePermissions: GovernanceRolePermission[];
  permissions: GovernancePermission[];
  users: GovernanceUser[];
  escalation: {
    trigger: "third_flag";
    recipientConfigurationEnabled: false;
  };
}

export interface RequestCategoryInput {
  id?: string;
  name: string;
  description: string | null;
  defaultDepartmentId: string;
  sensitivityDefault: RequestSensitivity;
  active: boolean;
}

export interface UserRoleChangeInput {
  userId: string;
  roleCode: string;
  granted: boolean;
}

export interface RolePermissionChangeInput {
  roleCode: string;
  permissionCode: string;
  granted: boolean;
}

export interface AuditFilters {
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  targetId?: string;
  page: number;
  pageSize: number;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  outcome: "success" | "denied" | "failure";
}

export interface DeactivationResult {
  reassignedRequests: number;
  reassignedUsers: number;
}

export interface GovernanceRepository {
  getConfiguration(authorizationHeader: string): Promise<GovernanceConfiguration>;
  saveCategory(
    authorizationHeader: string,
    input: RequestCategoryInput,
  ): Promise<GovernanceCategory>;
  setUserRole(
    authorizationHeader: string,
    input: UserRoleChangeInput,
  ): Promise<void>;
  setRolePermission(
    authorizationHeader: string,
    input: RolePermissionChangeInput,
  ): Promise<void>;
  deactivateDepartment(
    authorizationHeader: string,
    departmentId: string,
    replacementDepartmentId: string,
  ): Promise<DeactivationResult>;
  listAuditEvents(
    authorizationHeader: string,
    filters: AuditFilters,
  ): Promise<AuditEvent[]>;
}

export interface GovernanceService {
  getConfiguration(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<GovernanceConfiguration>;
  saveCategory(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RequestCategoryInput,
  ): Promise<GovernanceCategory>;
  setUserRole(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: UserRoleChangeInput,
  ): Promise<void>;
  setRolePermission(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RolePermissionChangeInput,
  ): Promise<void>;
  deactivateDepartment(
    principal: AuthPrincipal,
    authorizationHeader: string,
    departmentId: string,
    replacementDepartmentId: string,
  ): Promise<DeactivationResult>;
  listAuditEvents(
    authorizationHeader: string,
    filters: AuditFilters,
  ): Promise<AuditEvent[]>;
}
