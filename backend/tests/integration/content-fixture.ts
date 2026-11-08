import type { ContentService } from "../../src/content/types.js";

export function unusedContentService(): ContentService {
  return {
    getPublishingPermissions: async () => ({
      announcements: false,
      opportunities: false,
    }),
    listAnnouncements: async () => [],
    listAnnouncementDrafts: async () => [],
    getAnnouncement: async () => null,
    createAnnouncement: async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic draft",
      state: "draft",
    }),
    updateAnnouncementDraft: async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic draft",
      state: "draft",
    }),
    publishAnnouncementDraft: async () => ({
      id: "00000000-0000-4000-8000-000000000701",
      title: "Synthetic published notice",
      state: "published",
    }),
    listOpportunities: async () => [],
    listOpportunityDrafts: async () => [],
    getOpportunity: async () => null,
    createOpportunity: async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic draft",
      state: "draft",
    }),
    updateOpportunityDraft: async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic draft",
      state: "draft",
    }),
    publishOpportunityDraft: async () => ({
      id: "00000000-0000-4000-8000-000000000801",
      title: "Synthetic published opportunity",
      state: "published",
    }),
    getOpportunityApplication: async () => null,
  };
}
