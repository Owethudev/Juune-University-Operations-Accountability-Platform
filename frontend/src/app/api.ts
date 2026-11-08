export function apiBaseUrl(): string {
  const base = import.meta.env.DEV
    ? "/api/v1"
    : (import.meta.env.VITE_API_BASE_URL ?? "/api/v1");
  return base.replace(/\/$/, "");
}

export function bearerHeaders(accessToken: string | null | undefined): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
