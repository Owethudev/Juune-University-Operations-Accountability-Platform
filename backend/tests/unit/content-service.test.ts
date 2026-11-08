import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/auth/types.js";
import { ContentActionError, ContentManagementService } from "../../src/content/service.js";
import type { ContentService } from "../../src/content/types.js";

const principal: AuthPrincipal = {
  userId: "00000000-0000-4000-8000-000000000204",
  institutionId: "00000000-0000-4000-8000-000000000001",
  departmentId: "00000000-0000-4000-8000-000000000101",
  role: "platform_admin",
};

function createRepository({
  permissions = { announcements: true, opportunities: true },
  applicationUrl = "https://careers.example.invalid/apply",
}: {
  permissions?: { announcements: boolean; opportunities: boolean };
  applicationUrl?: string | null;
} = {}) {
  const repository = {
    getPublishingPermissions: vi.fn(async () => permissions),
    listAnnouncements: vi.fn(async () => []),
    listAnnouncementDrafts: vi.fn(async () => []),
    getAnnouncement: vi.fn(async () => null),
    createAnnouncement: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic announcement",
      state: "published" as const,
    })),
    updateAnnouncementDraft: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic announcement",
      state: "draft" as const,
    })),
    publishAnnouncementDraft: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic announcement",
      state: "published" as const,
    })),
    listOpportunities: vi.fn(async () => []),
    listOpportunityDrafts: vi.fn(async () => []),
    getOpportunity: vi.fn(async () => null),
    createOpportunity: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic opportunity",
      state: "published" as const,
    })),
    updateOpportunityDraft: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic opportunity",
      state: "draft" as const,
    })),
    publishOpportunityDraft: vi.fn(async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic opportunity",
      state: "published" as const,
    })),
    getOpportunityApplication: vi.fn(async () => applicationUrl),
  } satisfies ContentService;
  return repository;
}

const opportunityInput = {
  title: "Synthetic training opportunity",
  type: "training" as const,
  description: "Synthetic opportunity description for validation.",
  audienceDepartmentIds: [],
  opensAt: null,
  closesAt: null,
  applicationUrl: "https://careers.example.invalid/apply",
  instructions: null,
  publish: true,
};

describe("Phase 7 content management service", () => {
  it("denies announcement publishing without the explicit publisher grant", async () => {
    const repository = createRepository({
      permissions: { announcements: false, opportunities: false },
    });
    const service = new ContentManagementService(repository);

    await expect(
      service.createAnnouncement(principal, "Bearer synthetic-token", {
        title: "Synthetic campus notice",
        body: "Synthetic announcement details for the audience feed.",
        audienceDepartmentIds: [],
        expiresAt: null,
        publish: true,
      }),
    ).rejects.toMatchObject<Partial<ContentActionError>>({ kind: "denied" });
    expect(repository.createAnnouncement).not.toHaveBeenCalled();
  });

  it.each([
    "javascript:alert(1)",
    "http://careers.example.invalid/apply",
    "https://localhost/apply",
    "https://127.0.0.1/apply",
    "https://user:password@careers.example.invalid/apply",
    "/relative-application",
  ])("rejects unsafe opportunity link %s", async (applicationUrl) => {
    const repository = createRepository();
    const service = new ContentManagementService(repository);

    await expect(
      service.createOpportunity(principal, "Bearer synthetic-token", {
        ...opportunityInput,
        applicationUrl,
      }),
    ).rejects.toMatchObject<Partial<ContentActionError>>({ kind: "invalid" });
    expect(repository.createOpportunity).not.toHaveBeenCalled();
  });

  it("allows a safe HTTPS application link and rechecks it through the repository", async () => {
    const repository = createRepository();
    const service = new ContentManagementService(repository);

    await expect(
      service.createOpportunity(
        principal,
        "Bearer synthetic-token",
        opportunityInput,
      ),
    ).resolves.toMatchObject({ state: "published" });
    await expect(
      service.getOpportunityApplication(
        principal,
        "Bearer synthetic-token",
        "00000000-0000-4000-8000-000000000801",
      ),
    ).resolves.toBe("https://careers.example.invalid/apply");
    expect(repository.getOpportunityApplication).toHaveBeenCalledOnce();
  });

  it("does not return an expired listing's application URL", async () => {
    const repository = createRepository({ applicationUrl: null });
    const service = new ContentManagementService(repository);

    await expect(
      service.getOpportunityApplication(
        principal,
        "Bearer synthetic-token",
        "00000000-0000-4000-8000-000000000801",
      ),
    ).resolves.toBeNull();
  });
});
