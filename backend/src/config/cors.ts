import type { RequestHandler } from "express";

const allowedMethods = "GET, HEAD, POST, PUT, PATCH, OPTIONS";
const allowedHeaders = new Set([
  "authorization",
  "content-type",
  "idempotency-key",
]);

export class CorsConfigurationError extends Error {
  constructor() {
    super("Invalid CORS origin configuration.");
    this.name = "CorsConfigurationError";
  }
}

export function loadCorsAllowedOrigins(
  source: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string[] {
  const configuredOrigins = source.CORS_ALLOWED_ORIGINS;
  if (configuredOrigins === undefined || configuredOrigins.trim() === "") {
    return [];
  }

  const entries = configuredOrigins.split(",").map((origin) => origin.trim());
  if (entries.some((origin) => origin === "")) {
    throw new CorsConfigurationError();
  }

  const origins = new Set<string>();
  for (const entry of entries) {
    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      throw new CorsConfigurationError();
    }

    const isHttps = parsed.protocol === "https:";
    const isLocalHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    if (
      parsed.origin !== entry ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      (!isHttps && !isLocalHttp)
    ) {
      throw new CorsConfigurationError();
    }

    origins.add(parsed.origin);
  }

  return [...origins];
}

export function createCorsMiddleware(
  allowedOrigins: readonly string[],
): RequestHandler {
  const originSet = new Set(allowedOrigins);

  return (request, response, next) => {
    const origin = request.get("origin");
    if (!origin) {
      next();
      return;
    }

    response.vary("Origin");
    if (!originSet.has(origin)) {
      if (request.method === "OPTIONS") {
        response.status(403).json({ message: "Origin is not allowed." });
        return;
      }
      next();
      return;
    }

    response.set("Access-Control-Allow-Origin", origin);
    if (request.method !== "OPTIONS") {
      next();
      return;
    }

    const requestedMethod = request.get("access-control-request-method");
    if (
      !requestedMethod ||
      !allowedMethods.split(", ").includes(requestedMethod.toUpperCase())
    ) {
      response.status(403).json({ message: "Request method is not allowed." });
      return;
    }

    const requestedHeaders = (request.get("access-control-request-headers") ?? "")
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);
    if (requestedHeaders.some((header) => !allowedHeaders.has(header))) {
      response.status(403).json({ message: "Request headers are not allowed." });
      return;
    }

    response.vary("Access-Control-Request-Method");
    response.vary("Access-Control-Request-Headers");
    response.set({
      "Access-Control-Allow-Methods": allowedMethods,
      "Access-Control-Allow-Headers": [...new Set(requestedHeaders)].join(", "),
      "Access-Control-Max-Age": "600",
    });
    response.status(204).end();
  };
}
