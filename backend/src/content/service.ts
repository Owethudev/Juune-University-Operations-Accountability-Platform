import { isIP } from "node:net";
import type { AuthPrincipal } from "../auth/types.js";
import type {
  AnnouncementFilters,
  AnnouncementInput,
  AnnouncementDraft,
  ContentService,
  OpportunityFilters,
  OpportunityInput,
  OpportunityDraft,
} from "./types.js";

export class ContentActionError extends Error {
  constructor(
    readonly kind: "denied" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "ContentActionError";
  }
}

function isSafeExternalUrl(value: string | null): boolean {
  if (value === null) return true;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      hostname.includes(".") &&
      !hostname.endsWith(".localhost") &&
      !hostname.endsWith(".local") &&
      !hostname.endsWith(".internal") &&
      isIP(hostname) === 0
    );
  } catch {
    return false;
  }
}

export class ContentManagementService implements ContentService {
  constructor(private readonly repository: ContentService) {}

  getPublishingPermissions(principal: AuthPrincipal, authorizationHeader: string) {
    return this.repository.getPublishingPermissions(principal, authorizationHeader);
  }

  listAnnouncements(authorizationHeader: string, filters: AnnouncementFilters) {
    return this.repository.listAnnouncements(authorizationHeader, filters);
  }

  listAnnouncementDrafts(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<AnnouncementDraft[]> {
    return this.repository.listAnnouncementDrafts(principal, authorizationHeader);
  }

  getAnnouncement(authorizationHeader: string, announcementId: string) {
    return this.repository.getAnnouncement(authorizationHeader, announcementId);
  }

  async createAnnouncement(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: AnnouncementInput,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.announcements) {
      throw new ContentActionError("denied", "Announcement publishing is not permitted.");
    }
    return this.repository.createAnnouncement(principal, authorizationHeader, input);
  }

  async updateAnnouncementDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
    input: AnnouncementInput,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.announcements) {
      throw new ContentActionError("denied", "Announcement editing is not permitted.");
    }
    return this.repository.updateAnnouncementDraft(
      principal,
      authorizationHeader,
      announcementId,
      input,
    );
  }

  async publishAnnouncementDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    announcementId: string,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.announcements) {
      throw new ContentActionError("denied", "Announcement publishing is not permitted.");
    }
    return this.repository.publishAnnouncementDraft(
      principal,
      authorizationHeader,
      announcementId,
    );
  }

  listOpportunities(authorizationHeader: string, filters: OpportunityFilters) {
    return this.repository.listOpportunities(authorizationHeader, filters);
  }

  listOpportunityDrafts(
    principal: AuthPrincipal,
    authorizationHeader: string,
  ): Promise<OpportunityDraft[]> {
    return this.repository.listOpportunityDrafts(principal, authorizationHeader);
  }

  getOpportunity(authorizationHeader: string, opportunityId: string) {
    return this.repository.getOpportunity(authorizationHeader, opportunityId);
  }

  async createOpportunity(
    principal: AuthPrincipal,
    authorizationHeader: string,
    input: OpportunityInput,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.opportunities) {
      throw new ContentActionError("denied", "Opportunity publishing is not permitted.");
    }
    if (!isSafeExternalUrl(input.applicationUrl)) {
      throw new ContentActionError(
        "invalid",
        "Enter a valid HTTPS application link.",
      );
    }
    return this.repository.createOpportunity(principal, authorizationHeader, input);
  }

  async updateOpportunityDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
    input: OpportunityInput,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.opportunities) {
      throw new ContentActionError("denied", "Opportunity editing is not permitted.");
    }
    if (!isSafeExternalUrl(input.applicationUrl)) {
      throw new ContentActionError(
        "invalid",
        "Enter a valid HTTPS application link.",
      );
    }
    return this.repository.updateOpportunityDraft(
      principal,
      authorizationHeader,
      opportunityId,
      input,
    );
  }

  async publishOpportunityDraft(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ) {
    const permissions = await this.repository.getPublishingPermissions(
      principal,
      authorizationHeader,
    );
    if (!permissions.opportunities) {
      throw new ContentActionError("denied", "Opportunity publishing is not permitted.");
    }
    return this.repository.publishOpportunityDraft(
      principal,
      authorizationHeader,
      opportunityId,
    );
  }

  getOpportunityApplication(
    principal: AuthPrincipal,
    authorizationHeader: string,
    opportunityId: string,
  ) {
    return this.repository
      .getOpportunityApplication(
      principal,
      authorizationHeader,
      opportunityId,
      )
      .then((url) => (isSafeExternalUrl(url) ? url : null));
  }
}
