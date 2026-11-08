import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class ConfigurationError extends Error {
  constructor(missingFields: string[]) {
    super(`Invalid server configuration: ${missingFields.join(", ")}`);
    this.name = "ConfigurationError";
  }
}

export function loadConfig(
  source: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AppConfig {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const invalidFields = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new ConfigurationError(invalidFields);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  };
}
