import { isRecord } from "./api.js";
import {
  apiBaseUrl,
  bearerHeaders,
  responseJson,
} from "./api.js";

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
  sensitivityDefault: "standard" | "restricted";
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

export function parseGovernanceConfiguration(
  value: unknown,
): GovernanceConfiguration | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.departments) ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.roles) ||
    !Array.isArray(value.rolePermissions) ||
    !Array.isArray(value.permissions) ||
    !Array.isArray(value.users) ||
    !isRecord(value.escalation) ||
    value.escalation.trigger !== "third_flag" ||
    value.escalation.recipientConfigurationEnabled !== false
  ) {
    return null;
  }
  const departments = value.departments.filter(
    (department): department is GovernanceDepartment =>
      isRecord(department) &&
      typeof department.id === "string" &&
      typeof department.name === "string" &&
      typeof department.type === "string" &&
      (department.status === "active" || department.status === "inactive"),
  );
  const categories = value.categories.filter(
    (category): category is GovernanceCategory =>
      isRecord(category) &&
      typeof category.id === "string" &&
      typeof category.name === "string" &&
      (typeof category.description === "string" || category.description === null) &&
      typeof category.defaultDepartmentId === "string" &&
      (category.sensitivityDefault === "standard" ||
        category.sensitivityDefault === "restricted") &&
      typeof category.active === "boolean",
  );
  const roles = value.roles.filter(
    (role): role is GovernanceRole =>
      isRecord(role) &&
      typeof role.code === "string" &&
      typeof role.displayName === "string",
  );
  const rolePermissions = value.rolePermissions.filter(
    (permission): permission is GovernanceRolePermission =>
      isRecord(permission) &&
      typeof permission.roleCode === "string" &&
      typeof permission.permissionCode === "string" &&
      typeof permission.description === "string",
  );
  const permissions = value.permissions.filter(
    (permission): permission is GovernancePermission =>
      isRecord(permission) &&
      typeof permission.code === "string" &&
      typeof permission.description === "string",
  );
  const users = value.users.filter(
    (user): user is GovernanceUser =>
      isRecord(user) &&
      typeof user.id === "string" &&
      typeof user.name === "string" &&
      (typeof user.department === "string" || user.department === null) &&
      (user.status === "active" ||
        user.status === "deactivated" ||
        user.status === "invited" ||
        user.status === "suspended") &&
      Array.isArray(user.roleCodes) &&
      user.roleCodes.every((roleCode) => typeof roleCode === "string"),
  );
  if (
    departments.length !== value.departments.length ||
    categories.length !== value.categories.length ||
    roles.length !== value.roles.length ||
    rolePermissions.length !== value.rolePermissions.length ||
    permissions.length !== value.permissions.length ||
    users.length !== value.users.length
  ) {
    return null;
  }
  return {
    departments,
    categories,
    roles,
    rolePermissions,
    permissions,
    users,
    escalation: {
      trigger: "third_flag",
      recipientConfigurationEnabled: false,
    },
  };
}

export function parseGovernanceChangeResult(value: unknown): boolean {
  return isRecord(value) && value.saved === true;
}

export function parseAuditEvents(value: unknown): AuditEvent[] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.filter(
    (item): item is AuditEvent =>
      isRecord(item) &&
      typeof item.id === "string" &&
      (typeof item.actorId === "string" || item.actorId === null) &&
      typeof item.actorName === "string" &&
      typeof item.action === "string" &&
      typeof item.targetType === "string" &&
      typeof item.targetId === "string" &&
      typeof item.createdAt === "string" &&
      (item.outcome === "success" ||
        item.outcome === "denied" ||
        item.outcome === "failure"),
  );
  return items.length === value.items.length ? items : null;
}

export async function fetchGovernanceJson(
  path: string,
  accessToken: string | null | undefined,
  options?: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...bearerHeaders(accessToken),
      ...(options?.headers ?? {}),
    },
  });
  return { response, body: await responseJson(response) };
}

export function governanceErrorMessage(body: unknown, fallback: string): string {
  return isRecord(body) && typeof body.message === "string"
    ? body.message
    : fallback;
}
