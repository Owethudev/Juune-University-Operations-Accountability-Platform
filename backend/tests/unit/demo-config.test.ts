import { describe, expect, it } from "vitest";
import { loadDemoMode } from "../../src/config/demo.js";

describe("demo mode configuration", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(loadDemoMode({ DEMO_MODE: undefined })).toBe(false);
    expect(loadDemoMode({ DEMO_MODE: "false" })).toBe(false);
    expect(loadDemoMode({ DEMO_MODE: "true" })).toBe(true);
  });

  it("rejects ambiguous values", () => {
    expect(() => loadDemoMode({ DEMO_MODE: "yes" })).toThrow(
      "DEMO_MODE must be set to true or false.",
    );
  });
});
