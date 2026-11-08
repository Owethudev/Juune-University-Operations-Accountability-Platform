import { z } from "zod";
import type { AppConfig } from "../config/environment.js";
import { createDatabaseClient } from "../config/database.js";
import type { AuthPrincipal } from "../auth/types.js";
import { RequestUniqueViolationError } from "./service.js";
import type {
  RequestCategoryOption,
  RequestDepartmentOption,
  RequestOptions,
  RequestRecord,
  RequestRepository,
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
  status: z.literal("submitted"),
  created_at: z.string(),
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
}
