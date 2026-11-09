export interface ServerConfig {
  port: number;
  host: "0.0.0.0";
}

export class ServerConfigurationError extends Error {
  constructor() {
    super("Invalid server port configuration.");
    this.name = "ServerConfigurationError";
  }
}

export function loadServerConfig(
  source: NodeJS.ProcessEnv | Record<string, string | undefined>,
): ServerConfig {
  const portValue = source.PORT;
  if (portValue === undefined) {
    return { port: 4000, host: "0.0.0.0" };
  }

  if (!/^\d+$/.test(portValue)) {
    throw new ServerConfigurationError();
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ServerConfigurationError();
  }

  return { port, host: "0.0.0.0" };
}
