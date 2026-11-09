import { describe, expect, it } from "vitest";
import { loadServerConfig } from "../../src/config/server.js";

describe("server runtime configuration", () => {
  it("uses the local default port and public interface when no platform config is provided", () => {
    expect(loadServerConfig({ PORT: undefined })).toEqual({
      port: 4000,
      host: "0.0.0.0",
    });
  });

  it("uses a valid platform-provided port", () => {
    expect(loadServerConfig({ PORT: "8080" })).toEqual({
      port: 8080,
      host: "0.0.0.0",
    });
  });

  it.each(["", "0", "65536", "4000abc", "-1"])(
    "rejects an invalid platform port without echoing its value",
    (port) => {
      expect(() => loadServerConfig({ PORT: port })).toThrowError(
        /^Invalid server port configuration\.$/,
      );
    },
  );
});
