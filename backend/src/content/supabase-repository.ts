import { z } from "zod";
import type { AuthPrincipal } from "../auth/types.js";
import { createDatabaseClient } from "../config/database.js";
import type { AppConfig } from "../config/environment.js";
import { ContentActionError } from "./service.js";
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementFilters,
  AnnouncementInput,
  ContentPublishingPermissions,
  ContentService,
  CreatedContent,
  Opportunity,
  OpportunityDraft,
  OpportunityFilters,
  OpportunityInput,
} from "./types.js";

const permissionsSchema = z.array(
  z.object({ permission_code: z.string() }),
);
const announcementRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  publisher_name: z.string(),
  published_at: z.string(),
  expires_at: z.string().nullable(),
  audience_department_names: z.array(z.string()),
});
const opportunityRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum([
    "vacancy",
    "promotion",
    "temporary_assignment",
    "training",
    "professional_development",
  ]),
  description: z.string(),
  publisher_name: z.string(),
  department_names: z.array(z.string()),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  application_url: z.string().nullable(),
  instructions: z.string().nullable(),
});
const announcementDraftRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  expires_at: z.string().nullable(),
  audience_department_ids: z.array(z.string().uuid()),
});
const opportunityDraftRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum([
    "vacancy",
    "promotion",
    "temporary_assignment",
    "training",
    "professional_development",
  ]),
  description: z.string(),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  application_url: z.string().nullable(),
  instructions: z.string().nullable(),
  audience_department_ids: z.array(z.string().uuid()),
});
const createdContentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  state: z.enum(["draft", "published"]),
});
const applicationRowSchema = z.object({ application_url: z.string().url() });

export class ContentRepositoryError extends Error {
  constructor() {
    super("Content repository operation failed.");
    this.name = "ContentRepositoryError";
  }
}

function handleWriteError(error: { code?: string }): never {
  if (error.code === "42501") {
    throw new ContentActionError("denied", "This content action is not permitted.");
  }
  if (error.code === "22023" || error.code === "23514" || error.code === "22P02") {
    throw new ContentActionError(
      "invalid",
      "Check the content details, audience and dates.",
    );
  }
  throw new ContentRepositoryError();
}

function mapAnnouncement(value: unknown): Announcement {
  const parsed = announcementRowSchema.safeParse(value);
  if (!parsed.success) throw new ContentRepositoryError();
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    body: parsed.data.body,
    publisherName: parsed.data.publisher_name,
    publishedAt: parsed.data.published_at,
    expiresAt: parsed.data.expires_at,
    audienceDepartmentNames: parsed.data.audience_department_names,
  };
}

function mapOpportunity(value: unknown): Opportunity {
  const parsed = opportunityRowSchema.safeParse(value);
  if (!parsed.success) throw new ContentRepositoryError();
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    type: parsed.data.type,
    description: parsed.data.description,
    publisherName: parsed.data.publisher_name,
    departmentNames: parsed.data.department_names,
    opensAt: parsed.data.opens_at,
    closesAt: parsed.data.closes_at,
    applicationUrl: parsed.data.application_url,
    instructions: parsed.data.instructions,
  };
}

function mapAnnouncementDraft(value: unknown): AnnouncementDraft {
  const parsed = announcementDraftRowSchema.safeParse(value);
  if (!parsed.success) throw new ContentRepositoryError();
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    body: parsed.data.body,
    expiresAt: parsed.data.expires_at,
    audienceDepartmentIds: parsed.data.audience_department_ids,
  };
}

function mapOpportunityDraft(value: unknown): OpportunityDraft {
  const parsed = opportunityDraftRowSchema.safeParse(value);
  if (!parsed.success) throw new ContentRepositoryError();
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    type: parsed.data.type,
    description: parsed.data.description,
    opensAt: parsed.data.opens_at,
    closesAt: parsed.data.closes_at,
    applicationUrl: parsed.data.application_url,
    instructions: parsed.data.instructions,
    audienceDepartmentIds: parsed.data.audience_department_ids,
  };
}

function mapCreatedContent(value: unknown): CreatedContent {
  const parsed = createdContentSchema.safeParse(value);
  if (!parsed.success) throw new ContentRepositoryError();
  return parsed.data;
}

export class SupabaseContentRepository implements ContentService {
  constructor(private readonly config: AppConfig) {}

  async getPublishingPermissions(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<ContentPublishingPermissions> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    )
      .from("user_permissions")
      .select("permission_code")
      .eq("user_id", principal.userId)
      .eq("institution_id", principal.institutionId);
    if (error) throw new ContentRepositoryError();
    const parsed = permissionsSchema.safeParse(data);
    if (!parsed.success) throw new ContentRepositoryError();
    const granted = new Set(parsed.data.map((row) => row.permission_code));
    return {
      announcements: granted.has("SEC8"),
      opportunities: granted.has("SEC10"),
    };
  }

  async listAnnouncements(
    authorizationHeader: string,
    filters: AnnouncementFilters,
  ): Promise<Announcement[]> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("list_current_announcements", {
      required_search: filters.search ?? null,
      required_department_id: filters.departmentId ?? null,
    });
    if (error || !Array.isArray(data)) throw new ContentRepositoryError();
    return data.map(mapAnnouncement);
  }

  async listAnnouncementDrafts(
    _principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<AnnouncementDraft[]> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("list_my_announcement_drafts");
    if (error || !Array.isArray(data)) throw new ContentRepositoryError();
    return data.map(mapAnnouncementDraft);
  }

  async getAnnouncement(
    authorizationHeader: string,
    announcementId: string,
  ): Promise<Announcement | null> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("read_current_announcement", {
      required_announcement_id: announcementId,
    });
    if (error) throw new ContentRepositoryError();
    if (data === null) return null;
    if (!Array.isArray(data) || data.length > 1) {
      throw new ContentRepositoryError();
    }
    return data.length === 0 ? null : mapAnnouncement(data[0]);
  }

  async createAnnouncement(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    input: AnnouncementInput,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("create_announcement", {
      required_title: input.title,
      required_body: input.body,
      required_department_ids: input.audienceDepartmentIds,
      required_expires_at: input.expiresAt,
      publish_now: input.publish,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async updateAnnouncementDraft(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
    input: AnnouncementInput,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("update_announcement_draft", {
      required_announcement_id: announcementId,
      required_title: input.title,
      required_body: input.body,
      required_department_ids: input.audienceDepartmentIds,
      required_expires_at: input.expiresAt,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async publishAnnouncementDraft(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("publish_announcement_draft", {
      required_announcement_id: announcementId,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async listOpportunities(
    authorizationHeader: string,
    filters: OpportunityFilters,
  ): Promise<Opportunity[]> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("list_current_opportunities", {
      required_search: filters.search ?? null,
      required_department_id: filters.departmentId ?? null,
      required_type: filters.type ?? null,
      required_closing_from: filters.closingFrom ?? null,
      required_closing_to: filters.closingTo ?? null,
    });
    if (error || !Array.isArray(data)) throw new ContentRepositoryError();
    return data.map(mapOpportunity);
  }

  async listOpportunityDrafts(
    _principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<OpportunityDraft[]> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("list_my_opportunity_drafts");
    if (error || !Array.isArray(data)) throw new ContentRepositoryError();
    return data.map(mapOpportunityDraft);
  }

  async getOpportunity(
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<Opportunity | null> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("read_current_opportunity", {
      required_opportunity_id: opportunityId,
    });
    if (error) throw new ContentRepositoryError();
    if (data === null) return null;
    if (!Array.isArray(data) || data.length > 1) {
      throw new ContentRepositoryError();
    }
    return data.length === 0 ? null : mapOpportunity(data[0]);
  }

  async createOpportunity(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    input: OpportunityInput,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("create_opportunity", {
      required_title: input.title,
      required_type: input.type,
      required_description: input.description,
      required_department_ids: input.audienceDepartmentIds,
      required_opens_at: input.opensAt,
      required_closes_at: input.closesAt,
      required_application_url: input.applicationUrl,
      required_instructions: input.instructions,
      publish_now: input.publish,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async updateOpportunityDraft(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
    input: OpportunityInput,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("update_opportunity_draft", {
      required_opportunity_id: opportunityId,
      required_title: input.title,
      required_type: input.type,
      required_description: input.description,
      required_department_ids: input.audienceDepartmentIds,
      required_opens_at: input.opensAt,
      required_closes_at: input.closesAt,
      required_application_url: input.applicationUrl,
      required_instructions: input.instructions,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async publishOpportunityDraft(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<CreatedContent> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("publish_opportunity_draft", {
      required_opportunity_id: opportunityId,
    });
    if (error) handleWriteError(error);
    return mapCreatedContent(data);
  }

  async getOpportunityApplication(
    _principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<string | null> {
    const { data, error } = await createDatabaseClient(
      this.config,
      authorizationHeader,
    ).rpc("get_current_opportunity_application", {
      required_opportunity_id: opportunityId,
    });
    if (error) throw new ContentRepositoryError();
    if (!Array.isArray(data) || data.length > 1) {
      throw new ContentRepositoryError();
    }
    if (data.length === 0) return null;
    const parsed = applicationRowSchema.safeParse(data[0]);
    if (!parsed.success) throw new ContentRepositoryError();
    return parsed.data.application_url;
  }
}
