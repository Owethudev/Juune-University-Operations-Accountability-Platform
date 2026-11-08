import { randomInt } from "node:crypto";
import type { AuthPrincipal } from "../auth/types.js";
import type {
  CreatedRequest,
  RequestRecord,
  RequestRepository,
  RequestService,
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
    if (!department || category.defaultDepartmentId !== department.id) {
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
