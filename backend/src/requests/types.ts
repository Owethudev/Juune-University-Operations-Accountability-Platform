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
  status: RequestStatus;
  createdAt: string;
}

export type RequestStatus =
  | "submitted"
  | "acknowledged"
  | "in_progress"
  | "waiting_for_requester"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

export type RequestEventType =
  | "created"
  | "status_changed"
  | "assigned"
  | "response"
  | "flag"
  | "escalation"
  | "evidence_added"
  | "reopened"
  | "closed";

export interface RequestEvent {
  id: string;
  eventType: RequestEventType;
  actorName: string;
  message: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RequestListFilters {
  search?: string;
  status?: RequestStatus;
  categoryId?: string;
  departmentId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface RequestListItem {
  id: string;
  reference: string;
  summary: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  departmentName: string;
  status: RequestStatus;
  updatedAt: string;
}

export interface RequestListPage {
  items: RequestListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RequestParticipant {
  id: string;
  name: string;
}

export interface RequestDetail extends RequestRecord {
  requester: RequestParticipant;
  category: RequestDepartmentOption;
  department: RequestDepartmentOption;
  assignedTo: RequestParticipant | null;
  statusReason: string | null;
  updatedAt: string;
  sensitivity: "standard" | "restricted";
  events: RequestEvent[];
  attachments: [];
}

export interface NotificationItem {
  id: string;
  eventType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
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
  list(
    authorizationHeader: string,
    filters: RequestListFilters,
  ): Promise<RequestListPage>;
  getDetail(
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail | null>;
  addResponse(
    authorizationHeader: string,
    principal: AuthPrincipal,
    requestId: string,
    message: string,
    kind?: "response" | "reopen_request",
  ): Promise<RequestEvent>;
  hasReopenRequest(
    authorizationHeader: string,
    requestId: string,
    requesterId: string,
  ): Promise<boolean>;
  changeStatus(
    authorizationHeader: string,
    requestId: string,
    status: RequestStatus,
    reason: string | null,
  ): Promise<RequestDetail>;
  assignToSelf(
    authorizationHeader: string,
    principal: AuthPrincipal,
    requestId: string,
  ): Promise<RequestDetail>;
  flagRequest(
    authorizationHeader: string,
    requestId: string,
  ): Promise<number>;
  listNotifications(
    authorizationHeader: string,
    page: number,
  ): Promise<NotificationPage>;
  markNotificationRead(
    authorizationHeader: string,
    notificationId: string,
  ): Promise<void>;
}

export interface RequestService {
  getOptions(authorizationHeader: string): Promise<RequestOptions>;
  submit(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RequestSubmission,
  ): Promise<CreatedRequest>;
  list(
    principal: AuthPrincipal,
    authorizationHeader: string,
    filters: RequestListFilters,
  ): Promise<RequestListPage>;
  getDetail(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail | null>;
  addResponse(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    message: string,
  ): Promise<RequestEvent>;
  requestReopen(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    reason: string,
  ): Promise<RequestEvent>;
  changeStatus(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    status: RequestStatus,
    reason: string | null,
  ): Promise<RequestDetail>;
  assignToSelf(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail>;
  flagRequest(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<{ flagCount: number; reviewTriggered: boolean }>;
  listNotifications(
    principal: AuthPrincipal,
    authorizationHeader: string,
    page: number,
  ): Promise<NotificationPage>;
  markNotificationRead(
    principal: AuthPrincipal,
    authorizationHeader: string,
    notificationId: string,
  ): Promise<void>;
}
