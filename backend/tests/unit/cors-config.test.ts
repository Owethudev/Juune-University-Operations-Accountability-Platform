import { describe, expect, it } from "vitest";
import { loadCorsAllowedOrigins } from "../../src/config/cors.js";

describe("CORS origin configuration", () => {
  it("allows same-origin hosting when no cross-origin origins are configured", () => {
    expect(loadCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: undefined })).toEqual(
      [],
    );
  });

  it("parses and normalizes a comma-separated exact HTTPS origin allowlist", () => {
    expect(
      loadCorsAllowedOrigins({
        CORS_ALLOWED_ORIGINS: " https://juune.example.edu,https://admin.example.edu ",
      }),
    ).toEqual(["https://juune.example.edu", "https://admin.example.edu"]);
  });

  it.each([
    "*",
    "https://juune.example.edu/",
    "https://juune.example.edu/path",
    "http://juune.example.edu",
    "https://user:password@juune.example.edu",
    "https://juune.example.edu,",
  ])("rejects unsafe or malformed origin configuration", (origins) => {
    expect(() =>
      loadCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: origins }),
    ).toThrow(/^Invalid CORS origin configuration\.$/);
  });

  it("allows HTTP only for local development origins", () => {
    expect(
      loadCorsAllowedOrigins({
        CORS_ALLOWED_ORIGINS: "http://localhost:5173,http://127.0.0.1:4173",
      }),
    ).toEqual(["http://localhost:5173", "http://127.0.0.1:4173"]);
  });
});
