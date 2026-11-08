import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/auth/types.js";
import type { AppConfig } from "../../src/config/environment.js";
import { SupabaseRequestRepository } from "../../src/requests/supabase-repository.js";
import type { RequestSubmission } from "../../src/requests/types.js";

const config: AppConfig = {
  nodeEnv: "test",
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "test-anon-key",
};

const principal: AuthPrincipal = {
  userId: "00000000-0000-4000-8000-000000000201",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee",
};

const submission: RequestSubmission = {
  categoryId: "00000000-0000-4000-8000-000000000301",
  departmentId: "00000000-0000-4000-8000-000000000101",
  summary: "A synthetic IT request",
  description: "A synthetic description for this test request.",
  idempotencyKey: "00000000-0000-4000-8000-000000000901",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SupabaseRequestRepository", () => {
  it("inserts without RETURNING, then reads the request in a separate scoped query", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        Response.json({
          id: "00000000-0000-4000-8000-000000000401",
          reference: "JU-ABCDEFGH",
          category_id: submission.categoryId,
          department_id: submission.departmentId,
          summary: submission.summary,
          description: submission.description,
          status: "submitted",
          created_at: "2026-11-08T12:00:00.000Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const repository = new SupabaseRequestRepository(config);

    await expect(
      repository.insert(
        "Bearer synthetic-token",
        principal,
        submission,
        "JU-ABCDEFGH",
        "standard",
      ),
    ).resolves.toMatchObject({
      id: "00000000-0000-4000-8000-000000000401",
      reference: "JU-ABCDEFGH",
      status: "submitted",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const insertRequest = fetchMock.mock.calls[0]?.[0];
    const insertInit = fetchMock.mock.calls[0]?.[1];
    const selectRequest = fetchMock.mock.calls[1]?.[0];
    const selectInit = fetchMock.mock.calls[1]?.[1];
    expect(new Request(insertRequest, insertInit).method).toBe("POST");
    expect(
      new Request(insertRequest, insertInit).headers.get("Prefer") ?? "",
    ).not.toContain("return=representation");
    expect(new Request(insertRequest, insertInit).headers.get("Authorization")).toBe(
      "Bearer synthetic-token",
    );
    expect(new Request(selectRequest, selectInit).method).toBe("GET");
    expect(String(selectRequest)).toContain(
      "idempotency_key=eq.00000000-0000-4000-8000-000000000901",
    );
  });
});
