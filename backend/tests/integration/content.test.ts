import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { ContentActionError } from "../../src/content/service.js";
import { unusedGovernanceService } from "./content-fixture.js";
import type {
  Announcement,
  AnnouncementInput,
  ContentService,
  Opportunity,
  OpportunityInput,
} from "../../src/content/types.js";

const employee = {
  userId: "00000000-0000-4000-8000-000000000201",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "employee" as const,
};
const announcementId = "00000000-0000-4000-8000-000000000701";
const opportunityId = "00000000-0000-4000-8000-000000000801";
const announcement = {
  id: announcementId,
  title: "Synthetic campus notice",
  body: "Synthetic announcement details for the audience feed.",
  publisherName: "Synthetic Publisher",
  publishedAt: "2026-11-08T10:00:00.000Z",
  expiresAt: null,
  audienceDepartmentNames: ["IT"],
} satisfies Announcement;
const opportunity = {
  id: opportunityId,
  title: "Synthetic training opportunity",
  type: "training",
  description: "Synthetic opportunity details for the current feed.",
  publisherName: "Synthetic Publisher",
  departmentNames: ["IT"],
  opensAt: "2026-11-01T00:00:00.000Z",
  closesAt: "2026-12-01T00:00:00.000Z",
  applicationUrl: "https://careers.example.invalid/apply",
  instructions: null,
} satisfies Opportunity;

function createTestApp({
  role = "employee" as const,
  announcementResult = [announcement],
  opportunityResult = [opportunity],
  permissions = { announcements: false, opportunities: false },
}: {
  role?: "employee" | "department_manager" | "senior_leadership" | "platform_admin";
  announcementResult?: typeof announcement[];
  opportunityResult?: typeof opportunity[];
  permissions?: { announcements: boolean; opportunities: boolean };
} = {}) {
  const principal = { ...employee, role };
  const content = {
    getPublishingPermissions: vi.fn(async () => permissions),
    listAnnouncements: vi.fn(async () => announcementResult),
    listAnnouncementDrafts: vi.fn(async () => []),
    getAnnouncement: vi.fn(async (): Promise<Announcement | null> => announcement),
    createAnnouncement: vi.fn(
      async (
        _principal: typeof principal,
        _authorization: string,
        input: AnnouncementInput,
      ) => {
        if (!permissions.announcements) {
          throw new ContentActionError("denied", "Not permitted.");
        }
        return {
          id: announcement.id,
          title: input.title,
          state: input.publish ? "published" as const : "draft" as const,
        };
      },
    ),
    updateAnnouncementDraft: vi.fn(async () => ({
      id: announcement.id,
      title: announcement.title,
      state: "draft" as const,
    })),
    publishAnnouncementDraft: vi.fn(async () => ({
      id: announcement.id,
      title: announcement.title,
      state: "published" as const,
    })),
    listOpportunities: vi.fn(async () => opportunityResult),
    listOpportunityDrafts: vi.fn(async () => []),
    getOpportunity: vi.fn(async (): Promise<Opportunity | null> => opportunity),
    createOpportunity: vi.fn(
      async (
        _principal: typeof principal,
        _authorization: string,
        input: OpportunityInput,
      ) => {
        if (!permissions.opportunities) {
          throw new ContentActionError("denied", "Not permitted.");
        }
        return {
          id: opportunity.id,
          title: input.title,
          state: input.publish ? "published" as const : "draft" as const,
        };
      },
    ),
    updateOpportunityDraft: vi.fn(async () => ({
      id: opportunity.id,
      title: opportunity.title,
      state: "draft" as const,
    })),
    publishOpportunityDraft: vi.fn(async () => ({
      id: opportunity.id,
      title: opportunity.title,
      state: "published" as const,
    })),
    getOpportunityApplication: vi.fn(async () => opportunity.applicationUrl),
  } satisfies ContentService;
  const app = createApp({
    authenticator: {
      authenticate: vi.fn(async (authorization: string | undefined) =>
        authorization === "Bearer synthetic-token" ? principal : null,
      ),
    },
    profiles: { findByUserId: vi.fn(async () => null) },
    requests: {
      getOptions: async () => ({ categories: [], departments: [] }),
      submit: async () => { throw new Error("Not used in content test."); },
      list: async () => ({ items: [], page: 1, pageSize: 10, total: 0 }),
      getDetail: async () => null,
      addResponse: async () => { throw new Error("Not used in content test."); },
      requestReopen: async () => { throw new Error("Not used in content test."); },
      changeStatus: async () => { throw new Error("Not used in content test."); },
      assignToSelf: async () => { throw new Error("Not used in content test."); },
      flagRequest: async () => ({ flagCount: 0, reviewTriggered: false }),
      listNotifications: async () => ({ items: [], unreadCount: 0, hasMore: false }),
      markNotificationRead: async () => undefined,
      getDashboardSummary: async () => ({ rows: [], recentRequests: [] }),
    },
    content,
    governance: unusedGovernanceService(),
  });
  return { app, content };
}

describe("Phase 7 announcements and opportunities API", () => {
  it("T-SEC-7a/T-SEC-9a returns only repository-authorized current audience content", async () => {
    const { app } = createTestApp();

    await request(app)
      .get("/api/v1/announcements")
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, { items: [announcement] });
    await request(app)
      .get("/api/v1/opportunities")
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, { items: [opportunity] });
  });

  it("keeps draft feeds on publisher-only repository paths", async () => {
    const { app, content } = createTestApp({
      permissions: { announcements: true, opportunities: true },
    });

    await request(app)
      .get("/api/v1/announcements/drafts")
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, { items: [] });
    await request(app)
      .get("/api/v1/opportunities/drafts")
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, { items: [] });
    expect(content.listAnnouncementDrafts).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
    );
    expect(content.listOpportunityDrafts).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
    );
  });

  it("T-US6-1/T-SEC-8a publishes only after the explicit publish choice", async () => {
    const { app, content } = createTestApp({
      permissions: { announcements: true, opportunities: false },
    });
    await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", "Bearer synthetic-token")
      .send({
        title: "Synthetic campus notice",
        body: "Synthetic announcement details for the audience feed.",
        audienceDepartmentIds: [],
        expiresAt: null,
        publish: true,
      })
      .expect(201)
      .then((response) =>
        expect(response.body).toEqual(
          expect.objectContaining({ state: "published" }),
        ),
      );

    expect(content.createAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      expect.objectContaining({ publish: true }),
    );
  });

  it("T-SEC-8b denies non-publisher writes and validates content bounds", async () => {
    const { app, content } = createTestApp();
    await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", "Bearer synthetic-token")
      .send({
        title: "Synthetic campus notice",
        body: "Synthetic announcement details for the audience feed.",
        audienceDepartmentIds: [],
        expiresAt: null,
        publish: true,
      })
      .expect(403);
    await request(app)
      .post("/api/v1/opportunities")
      .set("Authorization", "Bearer synthetic-token")
      .send({
        title: "Bad link opportunity",
        type: "training",
        description: "Synthetic opportunity details for testing.",
        audienceDepartmentIds: [],
        applicationUrl: "javascript:alert(1)",
        publish: true,
      })
      .expect(400);

    expect(content.createOpportunity).not.toHaveBeenCalled();
  });

  it("T-EDGE-12 rechecks that an opportunity remains open before redirecting externally", async () => {
    const { app, content } = createTestApp();
    await request(app)
      .get(`/api/v1/opportunities/${opportunityId}/application`)
      .set("Authorization", "Bearer synthetic-token")
      .expect(200, { applicationUrl: opportunity.applicationUrl });
    expect(content.getOpportunityApplication).toHaveBeenCalledWith(
      expect.objectContaining({ userId: employee.userId }),
      "Bearer synthetic-token",
      opportunityId,
    );
  });

  it("keeps details private for content outside the caller's audience", async () => {
    const { app, content } = createTestApp();
    content.getAnnouncement.mockResolvedValueOnce(null);
    content.getOpportunity.mockResolvedValueOnce(null);

    await request(app)
      .get(`/api/v1/announcements/${announcementId}`)
      .set("Authorization", "Bearer synthetic-token")
      .expect(404);
    await request(app)
      .get(`/api/v1/opportunities/${opportunityId}`)
      .set("Authorization", "Bearer synthetic-token")
      .expect(404);
  });

  it("applies validated closing-date filters before returning opportunity feeds", async () => {
    const { app, content } = createTestApp();
    await request(app)
      .get("/api/v1/opportunities")
      .query({ closingFrom: "2026-11-01", closingTo: "2026-11-30" })
      .set("Authorization", "Bearer synthetic-token")
      .expect(200);
    expect(content.listOpportunities).toHaveBeenCalledWith(
      "Bearer synthetic-token",
      expect.objectContaining({
        closingFrom: "2026-11-01",
        closingTo: "2026-11-30",
      }),
    );
    await request(app)
      .get("/api/v1/opportunities")
      .query({ closingFrom: "2026-12-01", closingTo: "2026-11-30" })
      .set("Authorization", "Bearer synthetic-token")
      .expect(400);
  });
});
