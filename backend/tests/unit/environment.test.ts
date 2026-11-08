import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/config/environment.js";

describe("environment configuration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("T-SETUP-1 fails safely when required environment values are missing", () => {
    const sentinel = "synthetic-test-value-must-not-be-logged";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      loadConfig({
        NODE_ENV: "test",
        SUPABASE_URL: undefined,
        SUPABASE_ANON_KEY: sentinel,
      }),
    ).toThrow();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("T-SETUP-1 does not include provided values in configuration errors", () => {
    const sentinel = "synthetic-test-value-must-not-be-logged";

    try {
      loadConfig({
        NODE_ENV: "test",
        SUPABASE_URL: "not-a-valid-url",
        SUPABASE_ANON_KEY: sentinel,
      });
      throw new Error("Expected invalid configuration to be rejected.");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      expect(error.message).not.toContain(sentinel);
    }
  });
});
