import { createApp } from "./app.js";
import type { Authenticator, ProfileRepository } from "./auth/types.js";
import {
  createDatabaseClient,
  verifyDatabaseConnection,
} from "./config/database.js";
import { ConfigurationError, loadConfig } from "./config/environment.js";

const unconfiguredAuthenticator: Authenticator = {
  async authenticate() {
    return null;
  },
};

const emptyProfiles: ProfileRepository = {
  async findByUserId() {
    return null;
  },
};

async function startServer(): Promise<void> {
  const config = loadConfig(process.env);
  const database = createDatabaseClient(config);
  await verifyDatabaseConnection(database);

  const app = createApp({
    authenticator: unconfiguredAuthenticator,
    profiles: emptyProfiles,
  });
  app.listen(4000, "127.0.0.1");
}

void startServer().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    console.error(error.message);
  } else {
    console.error("Backend startup failed; check the approved database configuration.");
  }
  process.exitCode = 1;
});
