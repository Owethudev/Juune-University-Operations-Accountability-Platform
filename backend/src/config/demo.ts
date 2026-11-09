export class DemoModeConfigurationError extends Error {
  constructor() {
    super("DEMO_MODE must be set to true or false.");
    this.name = "DemoModeConfigurationError";
  }
}

export function loadDemoMode(
  source: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  const value = source.DEMO_MODE;
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new DemoModeConfigurationError();
}
