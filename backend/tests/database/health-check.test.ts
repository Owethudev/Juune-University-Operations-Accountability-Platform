import { describe, expect, it } from "vitest";
import { createDatabaseClient, verifyDatabaseConnection } from "../../src/config/database.js";
import { loadConfig } from "../../src/config/environment.js";

describe("Supabase database connection", () => {
  it("T-SETUP-3 connects to the isolated project through the approved health-check RPC", async () => {
    const config = loadConfig(process.env);
    const client = createDatabaseClient(config);

    await expect(verifyDatabaseConnection(client)).resolves.toEqual({
      status: "ok",
    });
  });
});
