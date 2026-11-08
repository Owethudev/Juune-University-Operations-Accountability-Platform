import { randomInt } from "node:crypto";
import type { AuthPrincipal } from "../auth/types.js";
import type {
  CreatedRequest,
  NotificationPage,
  RequestDetail,
  RequestEvent,
  RequestListFilters,
  RequestListPage,
  RequestRecord,
  RequestRepository,
  RequestService,
  RequestStatus,
  RequestSubmission,
} from "./types.js";

const REFERENCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_REFERENCE_ATTEMPTS = 5;

export class RequestFieldValidationError extends Error {
  constructor(
    readonly field: "categoryId" | "departmentId",
    message: string,
  ) {
    super(message);
    this.name = "RequestFieldValidationError";
  }
}

export class RequestIdempotencyConflictError extends Error {
  constructor() {
    super("This submission key was already used for different request details.");
    this.name = "RequestIdempotencyConflictError";
  }
}

export class RequestUniqueViolationError extends Error {
  constructor() {
    super("A request uniqueness constraint was violated.");
    this.name = "RequestUniqueViolationError";
  }
}

export class RequestActionError extends Error {
  constructor(
    readonly kind: "denied" | "conflict" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "RequestActionError";
  }
}

const transitions: Record<RequestStatus, readonly RequestStatus[]> = {
  submitted: ["acknowledged"],
  acknowledged: [
    "in_progress",
    "waiting_for_requester",
    "on_hold",
    "resolved",
  ],
  in_progress: ["waiting_for_requester", "on_hold", "resolved"],
  waiting_for_requester: ["in_progress", "on_hold", "resolved"],
  on_hold: ["in_progress", "waiting_for_requester", "resolved"],
  resolved: ["reopened"],
  closed: [],
  reopened: ["in_progress", "on_hold", "resolved"],
};

const requiredReasonStatuses = new Set<RequestStatus>(["on_hold", "resolved"]);

function isManager(principal: AuthPrincipal): boolean {
  return principal.role === "department_manager";
}

function createRequestReference(): string {
  const suffix = Array.from(
    { length: 8 },
    () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)],
  ).join("");
  return `JU-${suffix}`;
}

function matchesSubmission(
  existing: RequestRecord,
  input: RequestSubmission,
): boolean {
  return (
    existing.categoryId === input.categoryId &&
    existing.departmentId === input.departmentId &&
    existing.summary === input.summary &&
    existing.description === input.description
  );
}

export class RequestCreationService implements RequestService {
  constructor(
    private readonly repository: RequestRepository,
    private readonly referenceGenerator: () => string = createRequestReference,
  ) {}

  getOptions(authorizationHeader: string) {
    return this.repository.getOptions(authorizationHeader);
  }

  async submit(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: RequestSubmission,
  ): Promise<CreatedRequest> {
    const options = await this.repository.getOptions(authorizationHeader);
    const category = options.categories.find(
      (option) => option.id === input.categoryId,
    );
    if (!category) {
      throw new RequestFieldValidationError(
        "categoryId",
        "Choose a category.",
      );
    }

    const department = options.departments.find(
      (option) => option.id === input.departmentId,
    );
    if (!department) {
      throw new RequestFieldValidationError(
        "departmentId",
        "Choose a destination department.",
      );
    }

    const existing = await this.repository.findByIdempotencyKey(
      authorizationHeader,
      principal,
      input.idempotencyKey,
    );
    if (existing) {
      return this.replayOrReject(existing, input);
    }

    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      try {
        const created = await this.repository.insert(
          authorizationHeader,
          principal,
          input,
          this.referenceGenerator(),
          category.sensitivityDefault,
        );
        return { ...created, replayed: false };
      } catch (error) {
        if (!(error instanceof RequestUniqueViolationError)) {
          throw error;
        }

        const concurrentRequest = await this.repository.findByIdempotencyKey(
          authorizationHeader,
          principal,
          input.idempotencyKey,
        );
        if (concurrentRequest) {
          return this.replayOrReject(concurrentRequest, input);
        }
      }
    }

    throw new Error("Unable to generate a unique request reference.");
  }

  list(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    filters: RequestListFilters,
  ): Promise<RequestListPage> {
    return this.repository.list(authorizationHeader, filters);
  }

  getDetail(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail | null> {
    return this.repository.getDetail(authorizationHeader, requestId);
  }

  async addResponse(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    message: string,
  ): Promise<RequestEvent> {
    const request = await this.repository.getDetail(
      authorizationHeader,
      requestId,
    );
    if (!request) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to view this item.",
      );
    }
    if (
      request.requester.id !== principal.userId &&
      request.assignedTo?.id !== principal.userId
    ) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to respond to this item.",
      );
    }
    if (request.status === "closed") {
      throw new RequestActionError(
        "conflict",
        "Responses are not available for a closed request.",
      );
    }

    return this.repository.addResponse(
      authorizationHeader,
      principal,
      requestId,
      message.trim(),
    );
  }

  async requestReopen(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    reason: string,
  ): Promise<RequestEvent> {
    const request = await this.repository.getDetail(
      authorizationHeader,
      requestId,
    );
    if (!request || request.requester.id !== principal.userId) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to view this item.",
      );
    }
    if (request.status !== "resolved") {
      throw new RequestActionError(
        "conflict",
        "Only a resolved request can be reopened.",
      );
    }

    return this.repository.addResponse(
      authorizationHeader,
      principal,
      requestId,
      reason.trim(),
      "reopen_request",
    );
  }

  async changeStatus(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
    status: RequestStatus,
    reason: string | null,
  ): Promise<RequestDetail> {
    if (!isManager(principal)) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to change this request.",
      );
    }

    const current = await this.repository.getDetail(
      authorizationHeader,
      requestId,
    );
    if (!current) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to view this item.",
      );
    }
    if (current.assignedTo?.id !== principal.userId) {
      throw new RequestActionError(
        "denied",
        "Only the assigned department manager can change this request.",
      );
    }
    if (!transitions[current.status].includes(status)) {
      throw new RequestActionError(
        "conflict",
        "This status change is not available for the current request.",
      );
    }
    const normalizedReason = reason?.trim() || null;
    if (
      requiredReasonStatuses.has(status) &&
      (!normalizedReason || normalizedReason.length > 5000)
    ) {
      throw new RequestActionError(
        "invalid",
        "Enter a reason for this status change.",
      );
    }
    if (status === "reopened") {
      const hasReopenRequest = await this.repository.hasReopenRequest(
        authorizationHeader,
        requestId,
        current.requester.id,
      );
      if (!hasReopenRequest) {
        throw new RequestActionError(
          "conflict",
          "The requester must submit a reasoned reopen request first.",
        );
      }
    }

    const updated = await this.repository.changeStatus(
      authorizationHeader,
      requestId,
      status,
      normalizedReason,
    );
    if (updated.status !== status) {
      throw new RequestActionError(
        "conflict",
        "The request changed before your update was saved. Reload and try again.",
      );
    }
    return updated;
  }

  async assignToSelf(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<RequestDetail> {
    if (!isManager(principal)) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to change this request.",
      );
    }
    const current = await this.repository.getDetail(
      authorizationHeader,
      requestId,
    );
    if (!current) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to view this item.",
      );
    }
    if (current.assignedTo?.id === principal.userId) {
      return current;
    }
    if (current.assignedTo) {
      throw new RequestActionError(
        "conflict",
        "This request is already assigned. Reload to see the latest owner.",
      );
    }
    const updated = await this.repository.assignToSelf(
      authorizationHeader,
      principal,
      requestId,
    );
    if (updated.assignedTo?.id !== principal.userId) {
      throw new RequestActionError(
        "conflict",
        "The request changed before your assignment was saved. Reload and try again.",
      );
    }
    return updated;
  }

  async flagRequest(
    principal: AuthPrincipal,
    authorizationHeader: string,
    requestId: string,
  ): Promise<{ flagCount: number; reviewTriggered: boolean }> {
    const request = await this.repository.getDetail(
      authorizationHeader,
      requestId,
    );
    if (!request || request.requester.id !== principal.userId) {
      throw new RequestActionError(
        "denied",
        "You don’t have permission to view this item.",
      );
    }

    const flagCount = await this.repository.flagRequest(
      authorizationHeader,
      requestId,
    );
    if (!Number.isInteger(flagCount) || flagCount < 1) {
      throw new Error("The request flag could not be recorded.");
    }
    return { flagCount, reviewTriggered: flagCount === 3 };
  }

  listNotifications(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    page = 1,
  ): Promise<NotificationPage> {
    return this.repository.listNotifications(authorizationHeader, page);
  }

  markNotificationRead(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    notificationId: string,
  ): Promise<void> {
    return this.repository.markNotificationRead(
      authorizationHeader,
      notificationId,
    );
  }

  private replayOrReject(
    existing: RequestRecord,
    input: RequestSubmission,
  ): CreatedRequest {
    if (!matchesSubmission(existing, input)) {
      throw new RequestIdempotencyConflictError();
    }
    return { ...existing, replayed: true };
  }
}
