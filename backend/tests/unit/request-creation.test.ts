import { describe, expect, it, vi } from "vitest";
import {
  RequestCreationService,
  RequestFieldValidationError,
  RequestIdempotencyConflictError,
  RequestUniqueViolationError,
} from "../../src/requests/service.js";
import type {
  RequestCategoryOption,
  RequestDepartmentOption,
  RequestRepository,
  RequestSubmission,
  RequestRecord,
} from "../../src/requests/types.js";
import type { AuthPrincipal } from "../../src/auth/types.js";

const principal: AuthPrincipal = {
  userId: "00000000-0000-4000-8000-000000000201",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee",
};

const category: RequestCategoryOption = {
  id: "00000000-0000-4000-8000-000000000301",
  name: "IT support",
  defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
  sensitivityDefault: "standard",
};

const department: RequestDepartmentOption = {
  id: category.defaultDepartmentId,
  name: "IT",
};

const input: RequestSubmission = {
  categoryId: category.id,
  departmentId: department.id,
  summary: "A synthetic IT request",
  description: "A synthetic description for this test request.",
  idempotencyKey: "00000000-0000-4000-8000-000000000501",
};

const record: RequestRecord = {
  id: "00000000-0000-4000-8000-000000000401",
  reference: "JU-ABCDEFGH",
  categoryId: input.categoryId,
  departmentId: input.departmentId,
  summary: input.summary,
  description: input.description,
  status: "submitted",
  createdAt: "2026-11-08T12:00:00.000Z",
};

function createRepository(
  overrides: Partial<RequestRepository> = {},
): RequestRepository {
  return {
    getOptions: vi.fn(async () => ({
      categories: [category],
      departments: [department],
    })),
    findByIdempotencyKey: vi.fn(async () => null),
    insert: vi.fn(async () => record),
    ...overrides,
  };
}

describe("RequestCreationService", () => {
  it("creates a submitted request with an approved-format reference", async () => {
    const repository = createRepository();
    const service = new RequestCreationService(
      repository,
      () => "JU-ABCDEFGH",
    );

    await expect(
      service.submit(principal, "Bearer verified-test-token", input),
    ).resolves.toEqual({ ...record, replayed: false });
    expect(repository.insert).toHaveBeenCalledWith(
      "Bearer verified-test-token",
      principal,
      input,
      "JU-ABCDEFGH",
      "standard",
    );
  });

  it("T-EDGE-3 returns the original request for an identical idempotent retry", async () => {
    const repository = createRepository({
      findByIdempotencyKey: vi.fn(async () => record),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.submit(principal, "Bearer verified-test-token", input),
    ).resolves.toEqual({ ...record, replayed: true });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key for different request content", async () => {
    const repository = createRepository({
      findByIdempotencyKey: vi.fn(async () => record),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.submit(principal, "Bearer verified-test-token", {
        ...input,
        summary: "A changed request summary",
      }),
    ).rejects.toBeInstanceOf(RequestIdempotencyConflictError);
  });

  it("rejects a destination outside the selected category's configured destination", async () => {
    const repository = createRepository({
      getOptions: vi.fn(async () => ({
        categories: [category],
        departments: [
          department,
          {
            id: "00000000-0000-4000-8000-000000000102",
            name: "Facilities/Maintenance",
          },
        ],
      })),
    });
    const service = new RequestCreationService(repository);

    await expect(
      service.submit(principal, "Bearer verified-test-token", {
        ...input,
        departmentId: "00000000-0000-4000-8000-000000000102",
      }),
    ).rejects.toMatchObject({
      field: "departmentId",
      message: "Choose a destination department.",
    } satisfies Partial<RequestFieldValidationError>);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("retries reference collisions without creating a duplicate submission", async () => {
    const insert = vi
      .fn<RequestRepository["insert"]>()
      .mockRejectedValueOnce(new RequestUniqueViolationError())
      .mockResolvedValueOnce(record);
    const repository = createRepository({ insert });
    const service = new RequestCreationService(
      repository,
      vi
        .fn<() => string>()
        .mockReturnValueOnce("JU-ABCDEFGH")
        .mockReturnValueOnce("JU-IJKLMNOP"),
    );

    await service.submit(principal, "Bearer verified-test-token", input);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0]?.[3]).toBe("JU-ABCDEFGH");
    expect(insert.mock.calls[1]?.[3]).toBe("JU-IJKLMNOP");
  });
});
