import { randomUUID } from "node:crypto";
import type {
  AuthPrincipal,
  Authenticator,
  ProfileRepository,
  ProfileView,
  UserRole,
} from "../auth/types.js";
import type { ContentService } from "../content/types.js";
import type {
  AuditEvent,
  GovernanceConfiguration,
  GovernanceService,
} from "../governance/types.js";
import type {
  DashboardSummary,
  RequestDetail,
  RequestEvent,
  RequestService,
} from "../requests/types.js";

const institutionId = "00000000-0000-4000-8000-000000000001";
const departmentId = "00000000-0000-4000-8000-000000000101";
const categoryId = "00000000-0000-4000-8000-000000000301";

const demoUsers: Record<UserRole, ProfileView & AuthPrincipal> = {
  employee: {
    id: "00000000-0000-4000-8000-000000000201",
    userId: "00000000-0000-4000-8000-000000000201",
    institutionId,
    departmentId,
    name: "Alex Demo",
    email: "alex.employee@example.invalid",
    department: "Information Technology",
    role: "employee",
  },
  department_manager: {
    id: "00000000-0000-4000-8000-000000000202",
    userId: "00000000-0000-4000-8000-000000000202",
    institutionId,
    departmentId,
    name: "Sam Manager",
    email: "sam.manager@example.invalid",
    department: "Information Technology",
    role: "department_manager",
  },
  senior_leadership: {
    id: "00000000-0000-4000-8000-000000000203",
    userId: "00000000-0000-4000-8000-000000000203",
    institutionId,
    departmentId: null,
    name: "Taylor Leadership",
    email: "taylor.leadership@example.invalid",
    department: null,
    role: "senior_leadership",
  },
  platform_admin: {
    id: "00000000-0000-4000-8000-000000000204",
    userId: "00000000-0000-4000-8000-000000000204",
    institutionId,
    departmentId: null,
    name: "Jordan Administrator",
    email: "jordan.admin@example.invalid",
    department: null,
    role: "platform_admin",
  },
};

const roles = Object.keys(demoUsers) as UserRole[];

export function isDemoRole(value: unknown): value is UserRole {
  return typeof value === "string" && roles.includes(value as UserRole);
}

export function demoSession(role: UserRole) {
  const { id, name, email, department } = demoUsers[role];
  return {
    accessToken: `demo-token-${role}`,
    user: { id, name, email, department, role },
  };
}

export function createDemoAuthenticator(): Authenticator {
  return {
    async authenticate(authorizationHeader) {
      const match = /^Bearer demo-token-(employee|department_manager|senior_leadership|platform_admin)$/.exec(
        authorizationHeader ?? "",
      );
      if (!match || !isDemoRole(match[1])) return null;
      return demoUsers[match[1]];
    },
  };
}

export function createDemoProfiles(): ProfileRepository {
  return {
    async findByUserId(userId) {
      const profile = Object.values(demoUsers).find((user) => user.id === userId);
      if (!profile) return null;
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        role: profile.role,
      };
    },
  };
}

function requireDemoManager(principal: AuthPrincipal): void {
  if (principal.role !== "department_manager") {
    throw new Error("Demo role cannot perform this action.");
  }
}

function createEvent(
  eventType: RequestEvent["eventType"],
  actorName: string,
  message: string | null = null,
  metadata: Record<string, unknown> = {},
): RequestEvent {
  return {
    id: randomUUID(),
    eventType,
    actorName,
    message,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function canView(principal: AuthPrincipal, record: RequestDetail): boolean {
  return (
    principal.role === "senior_leadership" ||
    principal.role === "platform_admin" ||
    (principal.role === "employee" && record.requester.id === principal.userId) ||
    (principal.role === "department_manager" &&
      record.department.id === principal.departmentId)
  );
}

export function createDemoServices(): {
  requests: RequestService;
  content: ContentService;
  governance: GovernanceService;
} {
  const employee = demoUsers.employee;
  const manager = demoUsers.department_manager;
  const requests = new Map<string, RequestDetail>();
  const idempotency = new Map<string, string>();
  const notifications = new Map<string, { id: string; relatedEntityId: string; isRead: boolean }[]>();
  const flags = new Map<string, number>();
  const auditEvents: AuditEvent[] = [{
    id: "00000000-0000-4000-8000-000000000901",
    actorId: demoUsers.platform_admin.id,
    actorName: demoUsers.platform_admin.name,
    action: "demo.seeded",
    targetType: "demo",
    targetId: "00000000-0000-4000-8000-000000000401",
    createdAt: new Date().toISOString(),
    outcome: "success",
  }];
  function notify(userId: string, relatedEntityId: string): void {
    const userNotifications = notifications.get(userId) ?? [];
    userNotifications.unshift({
      id: randomUUID(),
      relatedEntityId,
      isRead: false,
    });
    notifications.set(userId, userNotifications);
  }

  const seededId = "00000000-0000-4000-8000-000000000401";
  requests.set(seededId, {
    id: seededId,
    reference: "JU-DEMO0001",
    categoryId,
    departmentId,
    summary: "Demo request: staff laptop setup",
    description: "A synthetic request to demonstrate request tracking and manager updates.",
    status: "submitted",
    statusReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requester: { id: employee.id, name: employee.name },
    category: { id: categoryId, name: "IT support" },
    department: { id: departmentId, name: "Information Technology" },
    assignedTo: { id: manager.id, name: manager.name },
    sensitivity: "standard",
    events: [
      createEvent("created", employee.name, "Synthetic demo request submitted."),
    ],
    attachments: [],
  });

  const requestsService: RequestService = {
    async getOptions() {
      return {
        categories: [
          {
            id: categoryId,
            name: "IT support",
            defaultDepartmentId: departmentId,
            sensitivityDefault: "standard",
          },
          {
            id: "00000000-0000-4000-8000-000000000302",
            name: "Facilities and maintenance",
            defaultDepartmentId: "00000000-0000-4000-8000-000000000102",
            sensitivityDefault: "standard",
          },
        ],
        departments: [
          { id: departmentId, name: "Information Technology" },
          {
            id: "00000000-0000-4000-8000-000000000102",
            name: "Facilities",
          },
        ],
      };
    },
    async submit(principal, _authorization, input) {
      const priorId = idempotency.get(`${principal.userId}:${input.idempotencyKey}`);
      if (priorId) return { ...requests.get(priorId)!, replayed: true };
      const options = await this.getOptions("");
      const category = options.categories.find((item) => item.id === input.categoryId);
      const department = options.departments.find((item) => item.id === input.departmentId);
      if (!category || !department) throw new Error("Invalid demo request options.");
      const id = randomUUID();
      const record: RequestDetail = {
        id,
        reference: `JU-${id.slice(0, 8).toUpperCase()}`,
        categoryId: category.id,
        departmentId: department.id,
        summary: input.summary,
        description: input.description,
        status: "submitted",
        statusReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requester: { id: principal.userId, name: demoUsers[principal.role].name },
        category: { id: category.id, name: category.name },
        department: { id: department.id, name: department.name },
        assignedTo: null,
        sensitivity: "standard",
        events: [createEvent("created", demoUsers[principal.role].name)],
        attachments: [],
      };
      requests.set(id, record);
      idempotency.set(`${principal.userId}:${input.idempotencyKey}`, id);
      return { ...record, replayed: false };
    },
    async list(principal, _authorization, filters) {
      const all = [...requests.values()]
        .filter((record) => canView(principal, record))
        .filter((record) => !filters.status || record.status === filters.status)
        .filter((record) => !filters.departmentId || record.department.id === filters.departmentId)
        .filter((record) => !filters.categoryId || record.categoryId === filters.categoryId)
        .filter((record) => !filters.search || `${record.reference} ${record.summary}`.toLowerCase().includes(filters.search.toLowerCase()))
        .map((record) => ({
          id: record.id,
          reference: record.reference,
          summary: record.summary,
          categoryId: record.categoryId,
          categoryName: record.category.name,
          departmentId: record.department.id,
          departmentName: record.department.name,
          status: record.status,
          updatedAt: record.updatedAt,
        }));
      const start = (filters.page - 1) * filters.pageSize;
      return {
        items: all.slice(start, start + filters.pageSize),
        page: filters.page,
        pageSize: filters.pageSize,
        total: all.length,
      };
    },
    async getDetail(principal, _authorization, id) {
      const record = requests.get(id);
      return record && canView(principal, record) ? record : null;
    },
    async addResponse(principal, _authorization, id, message) {
      const record = requests.get(id);
      if (!record || !canView(principal, record)) throw new Error("Demo request unavailable.");
      const event = createEvent("response", demoUsers[principal.role].name, message);
      record.events.push(event);
      record.updatedAt = event.createdAt;
      return event;
    },
    async requestReopen(principal, authorization, id, reason) {
      return this.addResponse(principal, authorization, id, reason);
    },
    async changeStatus(principal, _authorization, id, status, reason) {
      requireDemoManager(principal);
      const record = requests.get(id);
      if (!record || !canView(principal, record)) throw new Error("Demo request unavailable.");
      record.status = status;
      record.statusReason = reason;
      record.assignedTo = { id: principal.userId, name: demoUsers[principal.role].name };
      const event = createEvent("status_changed", demoUsers[principal.role].name, reason, { status });
      record.events.push(event);
      record.updatedAt = event.createdAt;
      notify(record.requester.id, id);
      auditEvents.unshift({
        id: randomUUID(),
        actorId: principal.userId,
        actorName: demoUsers[principal.role].name,
        action: "requests.status_changed",
        targetType: "requests",
        targetId: id,
        createdAt: event.createdAt,
        outcome: "success",
      });
      return record;
    },
    async assignToSelf(principal, _authorization, id) {
      requireDemoManager(principal);
      const record = requests.get(id);
      if (!record || !canView(principal, record)) throw new Error("Demo request unavailable.");
      record.assignedTo = { id: principal.userId, name: demoUsers[principal.role].name };
      const event = createEvent("assigned", demoUsers[principal.role].name);
      record.events.push(event);
      record.updatedAt = event.createdAt;
      return record;
    },
    async flagRequest(principal, _authorization, id) {
      const record = requests.get(id);
      if (!record || record.requester.id !== principal.userId) throw new Error("Demo request unavailable.");
      const flagCount = (flags.get(id) ?? 0) + 1;
      flags.set(id, flagCount);
      const escalated = flagCount === 3;
      record.events.push(
        createEvent(escalated ? "escalation" : "flag", demoUsers[principal.role].name, null, { flagCount }),
      );
      if (escalated) {
        record.updatedAt = new Date().toISOString();
        notify(manager.id, id);
        notify(demoUsers.senior_leadership.id, id);
        auditEvents.unshift({
          id: randomUUID(),
          actorId: principal.userId,
          actorName: demoUsers[principal.role].name,
          action: "requests.escalated",
          targetType: "requests",
          targetId: id,
          createdAt: record.updatedAt,
          outcome: "success",
        });
      }
      return { flagCount, reviewTriggered: flagCount === 3 };
    },
    async listNotifications(principal) {
      const items = notifications.get(principal.userId) ?? [];
      return {
        items: items.map((item) => ({
          id: item.id,
          eventType: "request_status_changed",
          relatedEntityType: "request",
          relatedEntityId: item.relatedEntityId,
          createdAt: new Date().toISOString(),
          isRead: item.isRead,
        })),
        unreadCount: items.filter((item) => !item.isRead).length,
        hasMore: false,
      };
    },
    async markNotificationRead(principal, _authorization, id) {
      const item = (notifications.get(principal.userId) ?? []).find((notification) => notification.id === id);
      if (item) item.isRead = true;
    },
    async getDashboardSummary(principal, _authorization, filters) {
      const visible = [...requests.values()]
        .filter((record) => canView(principal, record))
        .filter((record) => !filters.departmentId || record.department.id === filters.departmentId)
        .filter((record) => !filters.status || record.status === filters.status);
      const grouped = new Map<string, typeof visible>();
      for (const record of visible) {
        const key = `${record.department.id}:${record.status}`;
        grouped.set(key, [...(grouped.get(key) ?? []), record]);
      }
      const rows = [...grouped.values()].map((group) => ({
        departmentId: group[0].department.id,
        departmentName: group[0].department.name,
        status: group[0].status,
        requestCount: group.length,
        assignedCount: group.filter((record) => record.assignedTo !== null).length,
      }));
      const summary: DashboardSummary = {
        rows,
        recentRequests: visible.slice(0, 5).map((record) => ({
          id: record.id,
          reference: record.reference,
          departmentName: record.department.name,
          status: record.status,
          updatedAt: record.updatedAt,
        })),
      };
      return summary;
    },
  };

  const announcement = {
    id: "00000000-0000-4000-8000-000000000701",
    title: "Welcome to the Juune demo",
    body: "This synthetic campus announcement demonstrates the staff information feed.",
    publisherName: "Demo Publisher",
    publishedAt: new Date().toISOString(),
    expiresAt: null,
    audienceDepartmentNames: ["Information Technology", "Facilities"],
  };
  const opportunity = {
    id: "00000000-0000-4000-8000-000000000801",
    title: "Demo professional development",
    type: "training" as const,
    description: "A synthetic training opportunity for demonstrating the opportunity feed.",
    publisherName: "Demo Publisher",
    departmentNames: ["Information Technology", "Facilities"],
    opensAt: null,
    closesAt: null,
    applicationUrl: null,
    instructions: "Demo content only.",
  };

  const content: ContentService = {
    async getPublishingPermissions(principal) {
      const allowed = principal.role === "department_manager" || principal.role === "platform_admin";
      return { announcements: allowed, opportunities: allowed };
    },
    async listAnnouncements() { return [announcement]; },
    async listAnnouncementDrafts() { return []; },
    async getAnnouncement(_authorization, id) { return id === announcement.id ? announcement : null; },
    async createAnnouncement(principal, _authorization, input) {
      return { id: randomUUID(), title: input.title, state: input.publish ? "published" : "draft" };
    },
    async updateAnnouncementDraft(_principal, _authorization, id, input) {
      return { id, title: input.title, state: "draft" };
    },
    async publishAnnouncementDraft(_principal, _authorization, id) {
      return { id, title: announcement.title, state: "published" };
    },
    async listOpportunities() { return [opportunity]; },
    async listOpportunityDrafts() { return []; },
    async getOpportunity(_authorization, id) { return id === opportunity.id ? opportunity : null; },
    async createOpportunity(_principal, _authorization, input) {
      return { id: randomUUID(), title: input.title, state: input.publish ? "published" : "draft" };
    },
    async updateOpportunityDraft(_principal, _authorization, id, input) {
      return { id, title: input.title, state: "draft" };
    },
    async publishOpportunityDraft(_principal, _authorization, id) {
      return { id, title: opportunity.title, state: "published" };
    },
    async getOpportunityApplication() { return null; },
  };

  const configuration: GovernanceConfiguration = {
    departments: [
      { id: departmentId, name: "Information Technology", type: "service", status: "active" as const },
      { id: "00000000-0000-4000-8000-000000000102", name: "Facilities", type: "service", status: "active" as const },
    ],
    categories: [
      { id: categoryId, name: "IT support", description: "Synthetic demo category", defaultDepartmentId: departmentId, sensitivityDefault: "standard" as const, active: true },
    ],
    roles: [
      { code: "employee", displayName: "Employee" },
      { code: "department_manager", displayName: "Department manager" },
      { code: "senior_leadership", displayName: "Senior leadership" },
      { code: "platform_admin", displayName: "Platform administrator" },
    ],
    rolePermissions: [],
    permissions: [],
    users: Object.values(demoUsers).map((user) => ({
      id: user.id,
      name: user.name,
      department: user.department,
      status: "active" as const,
      roleCodes: [user.role],
    })),
    escalation: { trigger: "third_flag" as const, recipientConfigurationEnabled: false as const },
  };
  const governance: GovernanceService = {
    async getConfiguration(principal) {
      if (principal.role !== "platform_admin") throw new Error("Demo administrator role required.");
      return configuration;
    },
    async saveCategory(principal, _authorization, input) {
      if (principal.role !== "platform_admin") throw new Error("Demo administrator role required.");
      const saved = {
        id: input.id ?? randomUUID(),
        name: input.name,
        description: input.description,
        defaultDepartmentId: input.defaultDepartmentId,
        sensitivityDefault: input.sensitivityDefault,
        active: input.active,
      };
      configuration.categories.push(saved);
      return saved;
    },
    async setUserRole() {},
    async setRolePermission() {},
    async deactivateDepartment() { return { reassignedRequests: 0, reassignedUsers: 0 }; },
    async listAuditEvents() { return auditEvents; },
  };

  return { requests: requestsService, content, governance };
}
