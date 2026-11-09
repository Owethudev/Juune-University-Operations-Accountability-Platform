import { createApp } from "./app.js";
import type { Authenticator, ProfileRepository } from "./auth/types.js";
import {
  createDatabaseClient,
  verifyDatabaseConnection,
} from "./config/database.js";
import { ConfigurationError, loadConfig } from "./config/environment.js";
import {
  loadServerConfig,
  ServerConfigurationError,
} from "./config/server.js";
import { RequestCreationService } from "./requests/service.js";
import { SupabaseRequestRepository } from "./requests/supabase-repository.js";
import { ContentManagementService } from "./content/service.js";
import { SupabaseContentRepository } from "./content/supabase-repository.js";
import { GovernanceManagementService } from "./governance/service.js";
import { SupabaseGovernanceRepository } from "./governance/supabase-repository.js";

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
  const serverConfig = loadServerConfig(process.env);
  const database = createDatabaseClient(config);
  await verifyDatabaseConnection(database);

  const app = createApp({
    authenticator: unconfiguredAuthenticator,
    profiles: emptyProfiles,
    requests: new RequestCreationService(
      new SupabaseRequestRepository(config),
    ),
    content: new ContentManagementService(
      new SupabaseContentRepository(config),
    ),
    governance: new GovernanceManagementService(
      new SupabaseGovernanceRepository(config),
    ),
  });
  app.listen(serverConfig.port, serverConfig.host);
}

void startServer().catch((error: unknown) => {
  if (
    error instanceof ConfigurationError ||
    error instanceof ServerConfigurationError
  ) {
    console.error(error.message);
  } else {
    console.error("Backend startup failed; check the approved database configuration.");
  }
  process.exitCode = 1;
});
