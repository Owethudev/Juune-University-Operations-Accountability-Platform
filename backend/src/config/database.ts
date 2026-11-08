import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "./environment.js";

export interface DatabaseHealth {
  status: "ok";
}

export class DatabaseConnectionError extends Error {
  constructor() {
    super("Supabase database health check failed.");
    this.name = "DatabaseConnectionError";
  }
}

export function createDatabaseClient(
  config: AppConfig,
  authorizationHeader?: string,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: authorizationHeader
        ? { Authorization: authorizationHeader }
        : {},
    },
  });
}

function isDatabaseHealth(value: unknown): value is DatabaseHealth {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok"
  );
}

export async function verifyDatabaseConnection(
  client: SupabaseClient,
): Promise<DatabaseHealth> {
  const { data, error } = await client.rpc("juune_health_check");
  if (error || !isDatabaseHealth(data)) {
    throw new DatabaseConnectionError();
  }
  return data;
}
