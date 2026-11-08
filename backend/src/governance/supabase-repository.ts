import { z } from "zod";
import { createDatabaseClient } from "../config/database.js";
import type { AppConfig } from "../config/environment.js";
import { GovernanceActionError } from "./service.js";
import type {
  AuditFilters,
  AuditEvent,
  DeactivationResult,
  GovernanceCategory,
  GovernanceConfiguration,
  GovernanceService,
  RolePermissionChangeInput,
  RequestCategoryInput,
  UserRoleChangeInput,
} from "./types.js";

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  defaultDepartmentId: z.string().uuid(),
  sensitivityDefault: z.enum(["standard", "restricted"]),
  active: z.boolean(),
});
const configurationSchema = z.object({
  departments: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    status: z.enum(["active", "inactive"]),
  })),
  categories: z.array(categorySchema),
  roles: z.array(z.object({ code: z.string(), displayName: z.string() })),
  rolePermissions: z.array(z.object({
    roleCode: z.string(),
    permissionCode: z.string(),
    description: z.string(),
  })),
  permissions: z.array(z.object({ code: z.string(), description: z.string() })),
  users: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    department: z.string().nullable(),
    status: z.enum(["active", "deactivated", "invited", "suspended"]),
    roleCodes: z.array(z.string()),
  })),
  escalation: z.object({
    trigger: z.literal("third_flag"),
    recipientConfigurationEnabled: z.literal(false),
  }),
});
const auditRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  actor_id: z.string().uuid().nullable(),
  actor_name: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  created_at: z.string(),
  outcome: z.enum(["success", "denied", "failure"]),
}));
const deactivationSchema = z.object({
  reassignedRequests: z.number().int().nonnegative(),
  reassignedUsers: z.number().int().nonnegative(),
});

export class GovernanceRepositoryError extends Error {
  constructor() {
    super("Governance repository operation failed.");
    this.name = "GovernanceRepositoryError";
  }
}

function handleDatabaseError(error: { code?: string }): never {
  if (error.code === "42501") {
    throw new GovernanceActionError("denied", "This governance action is not permitted.");
  }
  if (
    error.code === "22023" ||
    error.code === "23514" ||
    error.code === "23503" ||
    error.code === "23505" ||
    error.code === "22P02"
  ) {
    throw new GovernanceActionError(
      "invalid",
      "Check the configuration details and active department references.",
    );
  }
  throw new GovernanceRepositoryError();
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new GovernanceRepositoryError();
  return parsed.data;
}

export class SupabaseGovernanceRepository implements GovernanceService {
  constructor(private readonly config: AppConfig) {}

  async getConfiguration(
    _principal: Parameters<GovernanceService["getConfiguration"]>[0],
    authorizationHeader: string,
  ): Promise<GovernanceConfiguration> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("get_admin_configuration");
    if (error) handleDatabaseError(error);
    return parseOrThrow(configurationSchema, data);
  }

  async saveCategory(
    _principal: Parameters<GovernanceService["saveCategory"]>[0],
    authorizationHeader: string,
    input: RequestCategoryInput,
  ): Promise<GovernanceCategory> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("save_request_category", {
      required_category_id: input.id ?? null,
      required_name: input.name,
      required_description: input.description,
      required_default_department_id: input.defaultDepartmentId,
      required_sensitivity_default: input.sensitivityDefault,
      required_active: input.active,
    });
    if (error) handleDatabaseError(error);
    return parseOrThrow(categorySchema, data);
  }

  async setUserRole(
    _principal: Parameters<GovernanceService["setUserRole"]>[0],
    authorizationHeader: string,
    input: UserRoleChangeInput,
  ): Promise<void> {
    const { error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("set_governance_user_role", {
      required_user_id: input.userId,
      required_role_code: input.roleCode,
      required_granted: input.granted,
    });
    if (error) handleDatabaseError(error);
  }

  async setRolePermission(
    _principal: Parameters<GovernanceService["setRolePermission"]>[0],
    authorizationHeader: string,
    input: RolePermissionChangeInput,
  ): Promise<void> {
    const { error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("set_governance_role_permission", {
      required_role_code: input.roleCode,
      required_permission_code: input.permissionCode,
      required_granted: input.granted,
    });
    if (error) handleDatabaseError(error);
  }

  async deactivateDepartment(
    _principal: Parameters<GovernanceService["deactivateDepartment"]>[0],
    authorizationHeader: string,
    departmentId: string,
    replacementDepartmentId: string,
  ): Promise<DeactivationResult> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("deactivate_department", {
      required_department_id: departmentId,
      replacement_department_id: replacementDepartmentId,
    });
    if (error) handleDatabaseError(error);
    return parseOrThrow(deactivationSchema, data);
  }

  async listAuditEvents(
    authorizationHeader: string,
    filters: AuditFilters,
  ): Promise<AuditEvent[]> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("list_audit_events", {
      required_from_date: filters.from ?? null,
      required_to_date: filters.to ?? null,
      required_actor_user_id: filters.actorId ?? null,
      required_action: filters.action ?? null,
      required_target_id: filters.targetId ?? null,
      required_page: filters.page,
      required_page_size: filters.pageSize,
    });
    if (error) handleDatabaseError(error);
    return parseOrThrow(auditRowsSchema, data).map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
      outcome: row.outcome,
    }));
  }
}
