import express, {
  type ErrorRequestHandler,
  type RequestHandler,
  type Response,
} from "express";
import type {
  AuthPrincipal,
  Authenticator,
  ProfileRepository,
  UserRole,
} from "./auth/types.js";

interface AppDependencies {
  authenticator: Authenticator;
  profiles: ProfileRepository;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "employee" ||
    value === "department_manager" ||
    value === "senior_leadership" ||
    value === "platform_admin"
  );
}

function isAuthPrincipal(value: unknown): value is AuthPrincipal {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.institutionId === "string" &&
    (typeof candidate.departmentId === "string" ||
      candidate.departmentId === null) &&
    isUserRole(candidate.role)
  );
}

function principalFromResponse(response: Response): AuthPrincipal | null {
  const principal: unknown = response.locals.principal;
  return isAuthPrincipal(principal) ? principal : null;
}

function createAuthenticationMiddleware(
  authenticator: Authenticator,
): RequestHandler {
  return (request, response, next) => {
    void authenticator
      .authenticate(request.get("authorization"))
      .then((principal) => {
        if (!principal) {
          response.status(401).json({ message: "Authentication required." });
          return;
        }

        response.locals.principal = principal;
        next();
      })
      .catch(next);
  };
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const requireAuthentication = createAuthenticationMiddleware(
    dependencies.authenticator,
  );

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/v1/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/api/v1/auth/start", (_request, response) => {
    response.status(503).json({
      message:
        "We couldn’t sign you in. Check your institutional account or contact your university support team.",
    });
  });

  app.get(
    "/api/v1/profile",
    requireAuthentication,
    async (_request, response) => {
      const principal = principalFromResponse(response);
      if (!principal) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }

      const profile = await dependencies.profiles.findByUserId(
        principal.userId,
      );
      if (!profile || profile.id !== principal.userId) {
        response
          .status(404)
          .json({ message: "Something went wrong. Please try again." });
        return;
      }

      response.status(200).json({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        role: profile.role,
      });
    },
  );

  app.patch(
    "/api/v1/profile/preferences",
    requireAuthentication,
    (_request, response) => {
      response.status(403).json({
        message: "You don’t have permission to view or change this item.",
      });
    },
  );

  const errorHandler: ErrorRequestHandler = (
    error,
    request,
    response,
    _next,
  ) => {
    console.error("API request failed.", {
      method: request.method,
      path: request.path,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(500).json({
      message:
        "Something went wrong. Please try again. If the problem continues, contact your university support team.",
    });
  };
  app.use(errorHandler);

  return app;
}
