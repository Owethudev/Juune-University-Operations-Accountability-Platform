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
  RequestActionError,
  RequestFieldValidationError,
  RequestIdempotencyConflictError,
} from "./requests/service.js";
import { ContentActionError } from "./content/service.js";
import type { ContentService } from "./content/types.js";
import {
  GovernanceActionError,
} from "./governance/service.js";
import type {
  AuditFilters,
  GovernanceService,
  RolePermissionChangeInput,
  RequestCategoryInput,
  UserRoleChangeInput,
} from "./governance/types.js";
import type {
  DashboardFilters,
  RequestListFilters,
  RequestService,
  RequestStatus,
  RequestSubmission,
} from "./requests/types.js";

interface AppDependencies {
  authenticator: Authenticator;
  profiles: ProfileRepository;
  requests: RequestService;
  content: ContentService;
  governance: GovernanceService;
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
const requestStatusSchema = z.enum([
  "submitted",
  "acknowledged",
  "in_progress",
  "waiting_for_requester",
  "on_hold",
  "resolved",
  "closed",
  "reopened",
]);
const requestListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[\p{L}\p{N} _-]+$/u)
    .optional(),
  status: requestStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
const requestMessageSchema = z
  .object({
    message: z.string().trim().min(1, "Enter a response.").max(5000),
  })
  .strict();
const reopenRequestSchema = z
  .object({
    reason: z.string().trim().min(1, "Enter a reason to reopen this request.").max(5000),
  })
  .strict();
const requestStatusChangeSchema = z
  .object({
    status: requestStatusSchema,
    reason: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();
const emptyAssignmentSchema = z.object({}).strict();
const contentSearchSchema = z
  .string()
  .trim()
  .min(1)
  .max(80);
const announcementInputSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    body: z.string().trim().min(10).max(5000),
    audienceDepartmentIds: z.array(z.string().uuid()).max(100),
    expiresAt: z.string().datetime({ offset: true }).nullable(),
    publish: z.boolean(),
  })
  .strict();
const opportunityInputSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    type: z.enum([
      "vacancy",
      "promotion",
      "temporary_assignment",
      "training",
      "professional_development",
    ]),
    description: z.string().trim().min(10).max(5000),
    audienceDepartmentIds: z.array(z.string().uuid()).max(100),
    opensAt: z.string().datetime({ offset: true }).nullable(),
    closesAt: z.string().datetime({ offset: true }).nullable(),
    applicationUrl: z.string().trim().max(2048).nullable(),
    instructions: z.string().trim().min(10).max(5000).nullable(),
    publish: z.boolean(),
  })
  .strict()
  .refine(
    (value) => !(value.applicationUrl && value.instructions),
    "Provide either an HTTPS application link or application instructions.",
  );
const contentIdSchema = z.string().uuid();
const opportunityTypeSchema = z.enum([
  "vacancy",
  "promotion",
  "temporary_assignment",
  "training",
  "professional_development",
]);
const emptyActionSchema = z.object({}).strict();
const notificationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
const dashboardQuerySchema = z
  .object({
    departmentId: z.string().uuid().optional(),
    status: requestStatusSchema.optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .strict()
  .refine(
    (filters) => !filters.from || !filters.to || filters.from <= filters.to,
  );
const governanceCategorySchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable(),
    defaultDepartmentId: z.string().uuid(),
    sensitivityDefault: z.enum(["standard", "restricted"]),
    active: z.boolean(),
  })
  .strict();
const deactivateDepartmentSchema = z
  .object({ replacementDepartmentId: z.string().uuid() })
  .strict();
const governanceUserRoleSchema = z
  .object({
    userId: z.string().uuid(),
    roleCode: z.enum([
      "employee",
      "department_manager",
      "senior_leadership",
      "platform_admin",
    ]),
    granted: z.boolean(),
  })
  .strict();
const governanceRolePermissionSchema = z
  .object({
    roleCode: z.enum([
      "employee",
      "department_manager",
      "senior_leadership",
      "platform_admin",
    ]),
    permissionCode: z.string().trim().min(1).max(40),
    granted: z.boolean(),
  })
  .strict();
const auditQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    actorId: z.string().uuid().optional(),
    action: z.string().trim().min(1).max(120).optional(),
    targetId: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict()
  .refine((filters) => !filters.from || !filters.to || filters.from <= filters.to);

function respondRequestActionError(
  error: unknown,
  response: Response,
  next: (error?: unknown) => void,
): void {
  if (!(error instanceof RequestActionError)) {
    next(error);
    return;
  }
  const status =
    error.kind === "denied" ? 403 : error.kind === "conflict" ? 409 : 400;
  response.status(status).json({
    message:
      error.kind === "denied"
        ? "You don’t have permission to view this item."
        : error.message,
  });
}

function respondContentActionError(
  error: unknown,
  response: Response,
  next: (error?: unknown) => void,
): void {
  if (!(error instanceof ContentActionError)) {
    next(error);
    return;
  }
  response.status(error.kind === "denied" ? 403 : 400).json({
    message:
      error.kind === "denied"
        ? "You don’t have permission to view this item."
        : error.message,
  });
}

function respondGovernanceActionError(
  error: unknown,
  response: Response,
  next: (error?: unknown) => void,
): void {
  if (!(error instanceof GovernanceActionError)) {
    next(error);
    return;
  }
  response.status(error.kind === "denied" ? 403 : 400).json({
    message:
      error.kind === "denied"
        ? "You don’t have permission to view this item."
        : error.message,
  });
}

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
      response
        .status(200)
        .json(await dependencies.requests.getOptions(authorizationHeader));
    },
  );

  app.get(
    "/api/v1/notifications",
    requireAuthentication,
    async (_request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const parsed = notificationListQuerySchema.safeParse(_request.query);
      if (!parsed.success) {
        response.status(400).json({
          message: "Check the notification page and try again.",
        });
        return;
      }
      try {
        response
          .status(200)
          .json(
            await dependencies.requests.listNotifications(
              principal,
              authorizationHeader,
              parsed.data.page,
            ),
          );
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/dashboard",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (
        principal.role !== "department_manager" &&
        principal.role !== "senior_leadership"
      ) {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const parsed = dashboardQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        response.status(400).json({
          message: "Check the dashboard filters and try again.",
        });
        return;
      }
      try {
        const filters: DashboardFilters = parsed.data;
        const summary = await dependencies.requests.getDashboardSummary(
          principal,
          authorizationHeader,
          filters,
        );
        response.status(200).json(summary);
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.patch(
    "/api/v1/notifications/:notificationId/read",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const notificationId = z.string().uuid().safeParse(
        request.params.notificationId,
      );
      if (
        !notificationId.success ||
        !emptyActionSchema.safeParse(request.body ?? {}).success
      ) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        await dependencies.requests.markNotificationRead(
          principal,
          authorizationHeader,
          notificationId.data,
        );
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/requests",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }

      const parsed = requestListQuerySchema.safeParse(request.query);
      if (
        !parsed.success ||
        (parsed.data.from !== undefined &&
          parsed.data.to !== undefined &&
          parsed.data.from > parsed.data.to)
      ) {
        response.status(400).json({
          message: "Check the request filters and try again.",
        });
        return;
      }

      const filters: RequestListFilters = parsed.data;
      try {
        response
          .status(200)
          .json(
            await dependencies.requests.list(
              principal,
              authorizationHeader,
              filters,
            ),
          );
      } catch (error) {
        next(error);
      }
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

  app.get(
    "/api/v1/requests/:requestId",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      if (!requestId.success) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const detail = await dependencies.requests.getDetail(
          principal,
          authorizationHeader,
          requestId.data,
        );
        if (!detail) {
          response.status(404).json({
            message: "You don’t have permission to view this item.",
          });
          return;
        }
        response.status(200).json(detail);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/requests/:requestId/responses",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      const parsed = requestMessageSchema.safeParse(request.body);
      if (!requestId.success || !parsed.success) {
        response.status(400).json({ message: "Enter a response." });
        return;
      }
      try {
        const event = await dependencies.requests.addResponse(
          principal,
          authorizationHeader,
          requestId.data,
          parsed.data.message,
        );
        response.status(201).json({ event });
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/requests/:requestId/flags",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      if (
        !requestId.success ||
        !emptyActionSchema.safeParse(request.body ?? {}).success
      ) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const result = await dependencies.requests.flagRequest(
          principal,
          authorizationHeader,
          requestId.data,
        );
        response.status(200).json(result);
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/requests/:requestId/reopen-requests",
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
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      const parsed = reopenRequestSchema.safeParse(request.body);
      if (!requestId.success || !parsed.success) {
        response.status(400).json({
          message: "Enter a reason to reopen this request.",
        });
        return;
      }
      try {
        const event = await dependencies.requests.requestReopen(
          principal,
          authorizationHeader,
          requestId.data,
          parsed.data.reason,
        );
        response.status(201).json({ event });
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.patch(
    "/api/v1/requests/:requestId/status",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "department_manager") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      const parsed = requestStatusChangeSchema.safeParse(request.body);
      if (!requestId.success || !parsed.success) {
        response.status(400).json({
          message: "Check the status update and try again.",
        });
        return;
      }
      try {
        const detail = await dependencies.requests.changeStatus(
          principal,
          authorizationHeader,
          requestId.data,
          parsed.data.status as RequestStatus,
          parsed.data.reason ?? null,
        );
        response.status(200).json(detail);
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/requests/:requestId/assignment",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (
        principal.role !== "department_manager" ||
        !emptyAssignmentSchema.safeParse(request.body).success
      ) {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const requestId = z.string().uuid().safeParse(request.params.requestId);
      if (!requestId.success) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const detail = await dependencies.requests.assignToSelf(
          principal,
          authorizationHeader,
          requestId.data,
        );
        response.status(200).json(detail);
      } catch (error) {
        respondRequestActionError(error, response, next);
      }
    },
  );

  app.get(
    "/api/v1/content/publishing-permissions",
    requireAuthentication,
    async (_request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      try {
        const permissions = await dependencies.content.getPublishingPermissions(
          principal,
          authorizationHeader,
        );
        response.status(200).json(permissions);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/announcements",
    requireAuthentication,
    async (request, response, next) => {
      const authorizationHeader = authorizationFromResponse(response);
      if (!authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const parsed = z
        .object({
          search: contentSearchSchema.optional(),
          departmentId: z.string().uuid().optional(),
        })
        .strict()
        .safeParse(request.query);
      if (!parsed.success) {
        response.status(400).json({ message: "Check the announcement filters." });
        return;
      }
      try {
        const items = await dependencies.content.listAnnouncements(
          authorizationHeader,
          parsed.data,
        );
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/announcements/drafts",
    requireAuthentication,
    async (_request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      try {
        const items = await dependencies.content.listAnnouncementDrafts(
          principal,
          authorizationHeader,
        );
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/announcements/:announcementId",
    requireAuthentication,
    async (request, response, next) => {
      const authorizationHeader = authorizationFromResponse(response);
      const announcementId = contentIdSchema.safeParse(
        request.params.announcementId,
      );
      if (!authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!announcementId.success) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const item = await dependencies.content.getAnnouncement(
          authorizationHeader,
          announcementId.data,
        );
        if (!item) {
          response.status(404).json({
            message: "You don’t have permission to view this item.",
          });
          return;
        }
        response.status(200).json({ item });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/announcements",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const parsed = announcementInputSchema.safeParse(request.body);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!parsed.success) {
        response.status(400).json({ message: "Check the announcement details." });
        return;
      }
      try {
        const content = await dependencies.content.createAnnouncement(
          principal,
          authorizationHeader,
          parsed.data,
        );
        response.status(201).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.patch(
    "/api/v1/announcements/:announcementId",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const announcementId = contentIdSchema.safeParse(
        request.params.announcementId,
      );
      const parsed = announcementInputSchema.safeParse(request.body);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!announcementId.success || !parsed.success || parsed.data.publish) {
        response.status(400).json({ message: "Check the announcement details." });
        return;
      }
      try {
        const content = await dependencies.content.updateAnnouncementDraft(
          principal,
          authorizationHeader,
          announcementId.data,
          parsed.data,
        );
        response.status(200).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/announcements/:announcementId/publish",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const announcementId = contentIdSchema.safeParse(
        request.params.announcementId,
      );
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (
        !announcementId.success ||
        !emptyActionSchema.safeParse(request.body ?? {}).success
      ) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const content = await dependencies.content.publishAnnouncementDraft(
          principal,
          authorizationHeader,
          announcementId.data,
        );
        response.status(200).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.get(
    "/api/v1/opportunities",
    requireAuthentication,
    async (request, response, next) => {
      const authorizationHeader = authorizationFromResponse(response);
      const parsed = z
        .object({
          search: contentSearchSchema.optional(),
          departmentId: z.string().uuid().optional(),
          type: opportunityTypeSchema.optional(),
          closingFrom: z.string().date().optional(),
          closingTo: z.string().date().optional(),
        })
        .strict()
        .refine(
          (filters) =>
            !filters.closingFrom ||
            !filters.closingTo ||
            filters.closingFrom <= filters.closingTo,
          "Closing date range is invalid.",
        )
        .safeParse(request.query);
      if (!authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!parsed.success) {
        response.status(400).json({ message: "Check the opportunity filters." });
        return;
      }
      try {
        const items = await dependencies.content.listOpportunities(
          authorizationHeader,
          parsed.data,
        );
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/opportunities/drafts",
    requireAuthentication,
    async (_request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      try {
        const items = await dependencies.content.listOpportunityDrafts(
          principal,
          authorizationHeader,
        );
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/opportunities/:opportunityId/application",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const opportunityId = contentIdSchema.safeParse(
        request.params.opportunityId,
      );
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!opportunityId.success) {
        response.status(404).json({
          message: "This opportunity is no longer available.",
        });
        return;
      }
      try {
        const applicationUrl = await dependencies.content.getOpportunityApplication(
          principal,
          authorizationHeader,
          opportunityId.data,
        );
        if (!applicationUrl) {
          response.status(404).json({
            message: "This opportunity is no longer available.",
          });
          return;
        }
        response.status(200).json({ applicationUrl });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/v1/opportunities/:opportunityId",
    requireAuthentication,
    async (request, response, next) => {
      const authorizationHeader = authorizationFromResponse(response);
      const opportunityId = contentIdSchema.safeParse(
        request.params.opportunityId,
      );
      if (!authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!opportunityId.success) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const item = await dependencies.content.getOpportunity(
          authorizationHeader,
          opportunityId.data,
        );
        if (!item) {
          response.status(404).json({
            message: "You don’t have permission to view this item.",
          });
          return;
        }
        response.status(200).json({ item });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/opportunities",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const parsed = opportunityInputSchema.safeParse(request.body);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!parsed.success) {
        response.status(400).json({ message: "Check the opportunity details." });
        return;
      }
      try {
        const content = await dependencies.content.createOpportunity(
          principal,
          authorizationHeader,
          parsed.data,
        );
        response.status(201).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.patch(
    "/api/v1/opportunities/:opportunityId",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const opportunityId = contentIdSchema.safeParse(
        request.params.opportunityId,
      );
      const parsed = opportunityInputSchema.safeParse(request.body);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (!opportunityId.success || !parsed.success || parsed.data.publish) {
        response.status(400).json({ message: "Check the opportunity details." });
        return;
      }
      try {
        const content = await dependencies.content.updateOpportunityDraft(
          principal,
          authorizationHeader,
          opportunityId.data,
          parsed.data,
        );
        response.status(200).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/opportunities/:opportunityId/publish",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      const opportunityId = contentIdSchema.safeParse(
        request.params.opportunityId,
      );
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (
        !opportunityId.success ||
        !emptyActionSchema.safeParse(request.body ?? {}).success
      ) {
        response.status(404).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const content = await dependencies.content.publishOpportunityDraft(
          principal,
          authorizationHeader,
          opportunityId.data,
        );
        response.status(200).json(content);
      } catch (error) {
        respondContentActionError(error, response, next);
      }
    },
  );

  app.get(
    "/api/v1/admin/configuration",
    requireAuthentication,
    async (_request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "platform_admin") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      try {
        const configuration = await dependencies.governance.getConfiguration(
          principal,
          authorizationHeader,
        );
        response.status(200).json(configuration);
      } catch (error) {
        respondGovernanceActionError(error, response, next);
      }
    },
  );

  app.put(
    "/api/v1/admin/configuration/categories",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "platform_admin") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const parsed = governanceCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          message: "Check the category details and active department.",
        });
        return;
      }
      try {
        const input: RequestCategoryInput = parsed.data;
        const category = await dependencies.governance.saveCategory(
          principal,
          authorizationHeader,
          input,
        );
        response.status(200).json({ category });
      } catch (error) {
        respondGovernanceActionError(error, response, next);
      }
    },
  );

  app.post(
    "/api/v1/admin/configuration/departments/:departmentId/deactivate",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "platform_admin") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const departmentId = contentIdSchema.safeParse(request.params.departmentId);
      const parsed = deactivateDepartmentSchema.safeParse(request.body);
      if (!departmentId.success || !parsed.success) {
        response.status(400).json({
          message: "Choose an active replacement department.",
        });
        return;
      }
      try {
        const result = await dependencies.governance.deactivateDepartment(
          principal,
          authorizationHeader,
          departmentId.data,
          parsed.data.replacementDepartmentId,
        );
        response.status(200).json(result);
      } catch (error) {
        respondGovernanceActionError(error, response, next);
      }
    },
  );

  app.put(
    "/api/v1/admin/configuration/user-roles",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "platform_admin") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const parsed = governanceUserRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: "Check the user role details." });
        return;
      }
      try {
        const input: UserRoleChangeInput = parsed.data;
        await dependencies.governance.setUserRole(
          principal,
          authorizationHeader,
          input,
        );
        response.status(200).json({ saved: true });
      } catch (error) {
        respondGovernanceActionError(error, response, next);
      }
    },
  );

  app.put(
    "/api/v1/admin/configuration/role-permissions",
    requireAuthentication,
    async (request, response, next) => {
      const principal = principalFromResponse(response);
      const authorizationHeader = authorizationFromResponse(response);
      if (!principal || !authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      if (principal.role !== "platform_admin") {
        response.status(403).json({
          message: "You don’t have permission to view this item.",
        });
        return;
      }
      const parsed = governanceRolePermissionSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ message: "Check the role permission details." });
        return;
      }
      try {
        const input: RolePermissionChangeInput = parsed.data;
        await dependencies.governance.setRolePermission(
          principal,
          authorizationHeader,
          input,
        );
        response.status(200).json({ saved: true });
      } catch (error) {
        respondGovernanceActionError(error, response, next);
      }
    },
  );

  app.get(
    "/api/v1/audit-events",
    requireAuthentication,
    async (request, response, next) => {
      const authorizationHeader = authorizationFromResponse(response);
      if (!authorizationHeader) {
        response.status(401).json({ message: "Authentication required." });
        return;
      }
      const parsed = auditQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        response.status(400).json({ message: "Check the audit filters." });
        return;
      }
      try {
        const filters: AuditFilters = parsed.data;
        const items = await dependencies.governance.listAuditEvents(
          authorizationHeader,
          filters,
        );
        response.status(200).json({ items });
      } catch (error) {
        respondGovernanceActionError(error, response, next);
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
