import express, {
  type ErrorRequestHandler,
  type RequestHandler,
  type Response,
} from "express";
import { z } from "zod";
import type {
  AuthPrincipal,
  Authenticator,
  ProfileRepository,
  UserRole,
} from "./auth/types.js";
import {
  RequestFieldValidationError,
  RequestIdempotencyConflictError,
} from "./requests/service.js";
import type {
  RequestService,
  RequestSubmission,
} from "./requests/types.js";

interface AppDependencies {
  authenticator: Authenticator;
  profiles: ProfileRepository;
  requests: RequestService;
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

function authorizationFromResponse(response: Response): string | null {
  const authorization: unknown = response.locals.authorizationHeader;
  return typeof authorization === "string" &&
    /^Bearer\s+\S+$/i.test(authorization)
    ? authorization
    : null;
}

function isEmployee(principal: AuthPrincipal): boolean {
  return principal.role === "employee";
}

const requestSubmissionSchema = z
  .object({
    categoryId: z.string().uuid({ error: "Choose a category." }),
    departmentId: z.string().uuid({ error: "Choose a destination department." }),
    summary: z
      .string()
      .trim()
      .min(5, { error: "Enter a short summary." })
      .max(120, { error: "Enter a short summary." }),
    description: z
      .string()
      .trim()
      .min(10, { error: "Enter a description." })
      .max(5000, { error: "Enter a description." }),
  })
  .strict();

function validationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  const allowedFields = new Set([
    "categoryId",
    "departmentId",
    "summary",
    "description",
  ]);
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && allowedFields.has(field)) {
      errors[field] ??= issue.message;
    }
  }
  return errors;
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
        response.locals.authorizationHeader = request.get("authorization");
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

  app.get(
    "/api/v1/requests/options",
    requireAuthentication,
    async (_request, response) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!isEmployee(principal)) {
        response.status(403).json({
          message: "You don’t have permission to submit this request.",
        });
        return;
      }

      response
        .status(200)
        .json(await dependencies.requests.getOptions(authorizationHeader));
    },
  );

  app.post(
    "/api/v1/requests",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!isEmployee(principal)) {
        response.status(403).json({
          message: "You don’t have permission to submit this request.",
        });
        return;
      }

      const idempotencyKey = z.string().uuid().safeParse(
        request.get("idempotency-key"),
      );
      if (!idempotencyKey.success) {
        response.status(400).json({
          message: "This submission could not be verified. Please retry.",
        });
        return;
      }

      const parsed = requestSubmissionSchema.safeParse(request.body);
      if (!parsed.success) {
        const errors = validationErrors(parsed.error);
        response.status(400).json(
          Object.keys(errors).length > 0
            ? { errors }
            : { message: "Check the request details and try again." },
        );
        return;
      }

      const input: RequestSubmission = {
        ...parsed.data,
        idempotencyKey: idempotencyKey.data,
      };

      try {
        const created = await dependencies.requests.submit(
          principal,
          authorizationHeader,
          input,
        );
        response.status(created.replayed ? 200 : 201).json(created);
      } catch (error) {
        if (error instanceof RequestFieldValidationError) {
          response.status(400).json({
            errors: { [error.field]: error.message },
          });
          return;
        }
        if (error instanceof RequestIdempotencyConflictError) {
          response.status(409).json({ message: error.message });
          return;
        }
        next(error);
      }
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
