import type { AuthPrincipal } from "../auth/types.js";

export interface RequestCategoryOption {
  id: string;
  name: string;
  defaultDepartmentId: string;
  sensitivityDefault: "standard" | "restricted";
}

export interface RequestDepartmentOption {
  id: string;
  name: string;
}

export interface RequestOptions {
  categories: RequestCategoryOption[];
  departments: RequestDepartmentOption[];
}

export interface RequestSubmission {
  categoryId: string;
  departmentId: string;
  summary: string;
  description: string;
  idempotencyKey: string;
}

export interface RequestRecord {
  id: string;
  reference: string;
  categoryId: string;
  departmentId: string;
  summary: string;
  description: string;
  status: "submitted";
  createdAt: string;
}

export interface CreatedRequest extends RequestRecord {
  replayed: boolean;
}

export interface RequestRepository {
  getOptions(authorizationHeader: string): Promise<RequestOptions>;
  findByIdempotencyKey(
    authorizationHeader: string,
    principal: AuthPrincipal,
    idempotencyKey: string,
  ): Promise<RequestRecord | null>;
  insert(
    authorizationHeader: string,
    principal: AuthPrincipal,
    input: RequestSubmission,
    reference: string,
    sensitivity: RequestCategoryOption["sensitivityDefault"],
  ): Promise<RequestRecord>;
}

export interface RequestService {
  getOptions(authorizationHeader: string): Promise<RequestOptions>;
  submit(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RequestSubmission,
  ): Promise<CreatedRequest>;
}
