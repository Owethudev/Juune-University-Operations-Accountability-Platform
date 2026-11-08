import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config/environment.js";
import { createDatabaseClient } from "../config/database.js";
import type { AuthPrincipal } from "../auth/types.js";
import { RequestUniqueViolationError } from "./service.js";
import type {
  RequestCategoryOption,
  RequestDepartmentOption,
  RequestDetail,
  RequestEvent,
  RequestEventType,
  NotificationItem,
  NotificationPage,
  RequestListFilters,
  RequestListItem,
  RequestListPage,
  RequestOptions,
  RequestRecord,
  RequestRepository,
  RequestStatus,
  RequestSubmission,
} from "./types.js";

const categoryRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    default_department_id: z.string().uuid(),
    sensitivity_default: z.enum(["standard", "restricted"]),
  }),
);
const departmentRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
);
const requestRowSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  category_id: z.string().uuid(),
  department_id: z.string().uuid(),
  summary: z.string(),
  description: z.string(),
  status: z.enum([
    "submitted",
    "acknowledged",
    "in_progress",
    "waiting_for_requester",
    "on_hold",
    "resolved",
    "closed",
    "reopened",
  ]),
  created_at: z.string(),
});
const eventRowSchema = z.object({
  id: z.string().uuid(),
  event_type: z.enum([
    "created",
    "status_changed",
    "assigned",
    "response",
    "flag",
    "escalation",
    "evidence_added",
    "reopened",
    "closed",
  ]),
  actor_user_id: z.string().uuid().nullable(),
  actor_type: z.enum(["user", "system"]),
  message: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
const detailRowSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  requester_id: z.string().uuid(),
  category_id: z.string().uuid(),
  department_id: z.string().uuid(),
  assigned_to_user_id: z.string().uuid().nullable(),
  summary: z.string(),
  description: z.string(),
  status: z.enum([
    "submitted",
    "acknowledged",
    "in_progress",
    "waiting_for_requester",
    "on_hold",
    "resolved",
    "closed",
    "reopened",
  ]),
  status_reason: z.string().nullable(),
  sensitivity: z.enum(["standard", "restricted"]),
  created_at: z.string(),
  updated_at: z.string(),
});
const displayRowSchema = z.object({
  requester_name: z.string(),
  assigned_to_name: z.string().nullable(),
  category_name: z.string(),
  department_name: z.string(),
});
const queueRowSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  summary: z.string(),
  category_id: z.string().uuid(),
  department_id: z.string().uuid(),
  status: detailRowSchema.shape.status,
  updated_at: z.string(),
});
const notificationRowSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string().min(1).max(80),
  related_entity_type: z.string().nullable(),
  related_entity_id: z.string().uuid().nullable(),
  created_at: z.string(),
  read_at: z.string().nullable(),
  status: z.enum(["pending", "sent", "failed", "read"]),
});

export class RequestRepositoryError extends Error {
  constructor() {
    super("Request data could not be loaded or saved.");
    this.name = "RequestRepositoryError";
  }
}

function parseRequestRecord(value: unknown): RequestRecord {
  const parsed = requestRowSchema.safeParse(value);
  if (!parsed.success) {
    throw new RequestRepositoryError();
  }
  return {
    id: parsed.data.id,
    reference: parsed.data.reference,
    categoryId: parsed.data.category_id,
    departmentId: parsed.data.department_id,
    summary: parsed.data.summary,
    description: parsed.data.description,
    status: parsed.data.status,
    createdAt: parsed.data.created_at,
  };
}

function parseEvent(value: unknown, actorName: string): RequestEvent {
  const parsed = eventRowSchema.safeParse(value);
  if (!parsed.success) {
    throw new RequestRepositoryError();
  }
  return {
    id: parsed.data.id,
    eventType: parsed.data.event_type as RequestEventType,
    actorName,
    message: parsed.data.message,
    metadata: parsed.data.metadata,
    createdAt: parsed.data.created_at,
  };
}

export class SupabaseRequestRepository implements RequestRepository {
  constructor(private readonly config: AppConfig) {}

  async getOptions(authorizationHeader: string): Promise<RequestOptions> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const [categoriesResult, departmentsResult] = await Promise.all([
      database
        .from("request_categories")
        .select("id, name, default_department_id, sensitivity_default")
        .eq("active", true)
        .order("name"),
      database
        .from("departments")
        .select("id, name")
        .eq("status", "active")
        .order("name"),
    ]);

    if (categoriesResult.error || departmentsResult.error) {
      throw new RequestRepositoryError();
    }

    const categories = categoryRowsSchema.safeParse(categoriesResult.data);
    const departments = departmentRowsSchema.safeParse(departmentsResult.data);
    if (!categories.success || !departments.success) {
      throw new RequestRepositoryError();
    }

    return {
      categories: categories.data.map(
        (category): RequestCategoryOption => ({
          id: category.id,
          name: category.name,
          defaultDepartmentId: category.default_department_id,
          sensitivityDefault: category.sensitivity_default,
        }),
      ),
      departments: departments.data.map(
        (department): RequestDepartmentOption => ({
          id: department.id,
          name: department.name,
        }),
      ),
    };
  }

  async findByIdempotencyKey(
    authorizationHeader: string,
    principal: AuthPrincipal,
    idempotencyKey: string,
  ): Promise<RequestRecord | null> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { data, error } = await database
      .from("requests")
      .select(
        "id, reference, category_id, department_id, summary, description, status, created_at",
      )
      .eq("institution_id", principal.institutionId)
      .eq("requester_id", principal.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new RequestRepositoryError();
    }
    return data ? parseRequestRecord(data) : null;
  }

  async insert(
    authorizationHeader: string,
    principal: AuthPrincipal,
    input: RequestSubmission,
    reference: string,
    sensitivity: RequestCategoryOption["sensitivityDefault"],
  ): Promise<RequestRecord> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { error } = await database
      .from("requests")
      .insert({
        institution_id: principal.institutionId,
        requester_id: principal.userId,
        category_id: input.categoryId,
        department_id: input.departmentId,
        summary: input.summary,
        description: input.description,
        idempotency_key: input.idempotencyKey,
        reference,
        sensitivity,
      });

    if (error?.code === "23505") {
      throw new RequestUniqueViolationError();
    }
    if (error) {
      throw new RequestRepositoryError();
    }

    const created = await this.findByIdempotencyKey(
      authorizationHeader,
      principal,
      input.idempotencyKey,
    );
    if (!created) {
      throw new RequestRepositoryError();
    }
    return created;
  }

  async list(
    authorizationHeader: string,
    filters: RequestListFilters,
  ): Promise<RequestListPage> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    let query = database
      .from("requests")
      .select(
        "id, reference, summary, category_id, department_id, status, updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .range(
        (filters.page - 1) * filters.pageSize,
        filters.page * filters.pageSize - 1,
      );

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.departmentId) {
      query = query.eq("department_id", filters.departmentId);
    }
    if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
    if (filters.to) {
      query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
    }
    if (filters.search) {
      const term = filters.search.replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(
        `reference.ilike.%${term}%,summary.ilike.%${term}%`,
      );
    }

    const { data, error, count } = await query;
    if (error || !data) {
      throw new RequestRepositoryError();
    }
    const rows = z.array(queueRowSchema).safeParse(data);
    if (!rows.success) {
      throw new RequestRepositoryError();
    }

    const [categoriesResult, departmentsResult] = await Promise.all([
      database
        .from("request_categories")
        .select("id, name")
        .in("id", [...new Set(rows.data.map((row) => row.category_id))]),
      database
        .from("departments")
        .select("id, name")
        .in("id", [...new Set(rows.data.map((row) => row.department_id))]),
    ]);
    if (categoriesResult.error || departmentsResult.error) {
      throw new RequestRepositoryError();
    }
    const names = z
      .array(z.object({ id: z.string().uuid(), name: z.string() }))
      .safeParse(categoriesResult.data);
    const departmentNames = z
      .array(z.object({ id: z.string().uuid(), name: z.string() }))
      .safeParse(departmentsResult.data);
    if (!names.success || !departmentNames.success) {
      throw new RequestRepositoryError();
    }
    const categoryById = new Map(names.data.map((row) => [row.id, row.name]));
    const departmentById = new Map(
      departmentNames.data.map((row) => [row.id, row.name]),
    );
    const items: RequestListItem[] = rows.data.map((row) => {
      const categoryName = categoryById.get(row.category_id);
      const departmentName = departmentById.get(row.department_id);
      if (!categoryName || !departmentName) {
        throw new RequestRepositoryError();
      }
      return {
        id: row.id,
        reference: row.reference,
        summary: row.summary,
        categoryId: row.category_id,
        categoryName,
        departmentId: row.department_id,
        departmentName,
        status: row.status,
        updatedAt: row.updated_at,
      };
    });

    return {
      items,
      page: filters.page,
      pageSize: filters.pageSize,
      total: count ?? 0,
    };
  }

  async getDetail(
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail | null> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { data, error } = await database
      .from("requests")
      .select(
        "id, reference, requester_id, category_id, department_id, assigned_to_user_id, summary, description, status, status_reason, sensitivity, created_at, updated_at",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (error) {
      throw new RequestRepositoryError();
    }
    if (!data) return null;

    const row = detailRowSchema.safeParse(data);
    if (!row.success) {
      throw new RequestRepositoryError();
    }
    const [displayResult, eventsResult] = await Promise.all([
      database.rpc("get_request_display", {
        required_request_id: requestId,
      }),
      database
        .from("request_events")
        .select(
          "id, event_type, actor_user_id, actor_type, message, metadata, created_at",
        )
        .eq("request_id", requestId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
    ]);
    if (displayResult.error || eventsResult.error) {
      throw new RequestRepositoryError();
    }
    const display = displayRowSchema.safeParse(
      Array.isArray(displayResult.data)
        ? displayResult.data[0]
        : displayResult.data,
    );
    const eventRows = z.array(eventRowSchema).safeParse(eventsResult.data);
    if (!display.success || !eventRows.success) {
      throw new RequestRepositoryError();
    }
    const actorNames = new Map<string, string>([
      [row.data.requester_id, display.data.requester_name],
    ]);
    if (row.data.assigned_to_user_id && display.data.assigned_to_name) {
      actorNames.set(row.data.assigned_to_user_id, display.data.assigned_to_name);
    }
    const events = eventRows.data.map((event) =>
      parseEvent(
        event,
        event.actor_type === "system"
          ? "System"
          : actorNames.get(event.actor_user_id ?? "") ??
              "Authorised participant",
      ),
    );

    return {
      id: row.data.id,
      reference: row.data.reference,
      summary: row.data.summary,
      description: row.data.description,
      categoryId: row.data.category_id,
      departmentId: row.data.department_id,
      category: { id: row.data.category_id, name: display.data.category_name },
      department: {
        id: row.data.department_id,
        name: display.data.department_name,
      },
      requester: {
        id: row.data.requester_id,
        name: display.data.requester_name,
      },
      assignedTo:
        row.data.assigned_to_user_id && display.data.assigned_to_name
          ? {
              id: row.data.assigned_to_user_id,
              name: display.data.assigned_to_name,
            }
          : null,
      status: row.data.status,
      statusReason: row.data.status_reason,
      createdAt: row.data.created_at,
      updatedAt: row.data.updated_at,
      sensitivity: row.data.sensitivity,
      events,
      attachments: [],
    };
  }

  async addResponse(
    authorizationHeader: string,
    principal: AuthPrincipal,
    requestId: string,
    message: string,
    kind: "response" | "reopen_request" = "response",
  ): Promise<RequestEvent> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const eventId = randomUUID();
    const { error } = await database.from("request_events").insert({
      id: eventId,
      institution_id: principal.institutionId,
      request_id: requestId,
      actor_user_id: principal.userId,
      actor_type: "user",
      event_type: "response",
      message,
      metadata: kind === "reopen_request" ? { kind } : {},
    });
    if (error) {
      throw new RequestRepositoryError();
    }

    const { data, error: eventError } = await database
      .from("request_events")
      .select(
        "id, event_type, actor_user_id, actor_type, message, metadata, created_at",
      )
      .eq("id", eventId)
      .single();
    if (eventError || !data) {
      throw new RequestRepositoryError();
    }
    const { data: actor, error: actorError } = await database
      .from("users")
      .select("name")
      .eq("id", principal.userId)
      .maybeSingle();
    if (actorError || typeof actor?.name !== "string") {
      throw new RequestRepositoryError();
    }
    return parseEvent(data, actor.name);
  }

  async hasReopenRequest(
    authorizationHeader: string,
    requestId: string,
    requesterId: string,
  ): Promise<boolean> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { data, error } = await database
      .from("request_events")
      .select("id")
      .eq("request_id", requestId)
      .eq("actor_user_id", requesterId)
      .eq("event_type", "response")
      .contains("metadata", { kind: "reopen_request" })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new RequestRepositoryError();
    }
    return data !== null;
  }

  async changeStatus(
    authorizationHeader: string,
    requestId: string,
    status: RequestStatus,
    reason: string | null,
  ): Promise<RequestDetail> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const current = await this.getDetail(authorizationHeader, requestId);
    if (!current) {
      throw new RequestRepositoryError();
    }
    const { error } = await database
      .from("requests")
      .update({ status, status_reason: reason })
      .eq("id", requestId)
      .eq("status", current.status)
      .eq("updated_at", current.updatedAt);
    if (error) {
      throw new RequestRepositoryError();
    }
    const updated = await this.getDetail(authorizationHeader, requestId);
    if (!updated) {
      throw new RequestRepositoryError();
    }
    return updated;
  }

  async assignToSelf(
    authorizationHeader: string,
    principal: AuthPrincipal,
    requestId: string,
  ): Promise<RequestDetail> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const current = await this.getDetail(authorizationHeader, requestId);
    if (!current) {
      throw new RequestRepositoryError();
    }
    const { error } = await database
      .from("requests")
      .update({ assigned_to_user_id: principal.userId })
      .eq("id", requestId)
      .eq("updated_at", current.updatedAt);
    if (error) {
      throw new RequestRepositoryError();
    }
    const updated = await this.getDetail(authorizationHeader, requestId);
    if (!updated) {
      throw new RequestRepositoryError();
    }
    return updated;
  }

  async flagRequest(
    authorizationHeader: string,
    requestId: string,
  ): Promise<number> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { data, error } = await database.rpc("flag_request", {
      required_request_id: requestId,
    });
    if (error || typeof data !== "number" || !Number.isInteger(data)) {
      throw new RequestRepositoryError();
    }
    return data;
  }

  async listNotifications(
    authorizationHeader: string,
    page: number,
  ): Promise<NotificationPage> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const [itemsResult, unreadResult] = await Promise.all([
      database
        .from("notifications")
        .select(
          "id, event_type, related_entity_type, related_entity_id, created_at, read_at, status",
          { count: "exact" },
        )
        .eq("channel", "in_app")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range((page - 1) * 50, page * 50 - 1),
      database
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("channel", "in_app")
        .is("read_at", null)
        .neq("status", "read"),
    ]);
    if (
      itemsResult.error ||
      !itemsResult.data ||
      unreadResult.error ||
      itemsResult.count === null
    ) {
      throw new RequestRepositoryError();
    }
    const rows = z.array(notificationRowSchema).safeParse(itemsResult.data);
    if (!rows.success) {
      throw new RequestRepositoryError();
    }
    const items: NotificationItem[] = rows.data.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      relatedEntityType: row.related_entity_type,
      relatedEntityId: row.related_entity_id,
      createdAt: row.created_at,
      isRead: row.read_at !== null || row.status === "read",
    }));
    return {
      items,
      unreadCount: unreadResult.count ?? 0,
      hasMore: page * 50 < itemsResult.count,
    };
  }

  async markNotificationRead(
    authorizationHeader: string,
    notificationId: string,
  ): Promise<void> {
    const database = createDatabaseClient(this.config, authorizationHeader);
    const { error } = await database
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("channel", "in_app")
      .is("read_at", null);
    if (error) {
      throw new RequestRepositoryError();
    }
  }
}
