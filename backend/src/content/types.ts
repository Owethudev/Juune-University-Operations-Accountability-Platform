import type { AuthPrincipal } from "../auth/types.js";

export type OpportunityType =
  | "vacancy"
  | "promotion"
  | "temporary_assignment"
  | "training"
  | "professional_development";

export interface ContentPublishingPermissions {
  announcements: boolean;
  opportunities: boolean;
}

export interface AnnouncementFilters {
  search?: string;
  departmentId?: string;
}

export interface OpportunityFilters extends AnnouncementFilters {
  type?: OpportunityType;
  closingFrom?: string;
  closingTo?: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audienceDepartmentIds: string[];
  expiresAt: string | null;
  publish: boolean;
}

export interface OpportunityInput {
  title: string;
  type: OpportunityType;
  description: string;
  audienceDepartmentIds: string[];
  opensAt: string | null;
  closesAt: string | null;
  applicationUrl: string | null;
  instructions: string | null;
  publish: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publisherName: string;
  publishedAt: string;
  expiresAt: string | null;
  audienceDepartmentNames: string[];
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  description: string;
  publisherName: string;
  departmentNames: string[];
  opensAt: string | null;
  closesAt: string | null;
  applicationUrl: string | null;
  instructions: string | null;
}

export interface CreatedContent {
  id: string;
  title: string;
  state: "draft" | "published";
}

export interface AnnouncementDraft {
  id: string;
  title: string;
  body: string;
  expiresAt: string | null;
  audienceDepartmentIds: string[];
}

export interface OpportunityDraft {
  id: string;
  title: string;
  type: OpportunityType;
  description: string;
  opensAt: string | null;
  closesAt: string | null;
  applicationUrl: string | null;
  instructions: string | null;
  audienceDepartmentIds: string[];
}

export interface ContentService {
  getPublishingPermissions(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<ContentPublishingPermissions>;
  listAnnouncements(
    authorizationHeader: string,
    filters: AnnouncementFilters,
  ): Promise<Announcement[]>;
  listAnnouncementDrafts(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<AnnouncementDraft[]>;
  getAnnouncement(
    authorizationHeader: string,
    announcementId: string,
  ): Promise<Announcement | null>;
  createAnnouncement(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: AnnouncementInput,
  ): Promise<CreatedContent>;
  updateAnnouncementDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
    input: AnnouncementInput,
  ): Promise<CreatedContent>;
  publishAnnouncementDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
  ): Promise<CreatedContent>;
  listOpportunities(
    authorizationHeader: string,
    filters: OpportunityFilters,
  ): Promise<Opportunity[]>;
  listOpportunityDrafts(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<OpportunityDraft[]>;
  getOpportunity(
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<Opportunity | null>;
  createOpportunity(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: OpportunityInput,
  ): Promise<CreatedContent>;
  updateOpportunityDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
    input: OpportunityInput,
  ): Promise<CreatedContent>;
  publishOpportunityDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<CreatedContent>;
  getOpportunityApplication(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ): Promise<string | null>;
}
