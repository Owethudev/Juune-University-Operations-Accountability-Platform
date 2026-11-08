import type { ContentService } from "../../src/content/types.js";
import type { GovernanceService } from "../../src/governance/types.js";

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

export function unusedGovernanceService(): GovernanceService {
  return {
    getConfiguration: async () => ({
      departments: [],
      categories: [],
      roles: [],
      rolePermissions: [],
      permissions: [],
      users: [],
      escalation: {
        trigger: "third_flag",
        recipientConfigurationEnabled: false,
      },
    }),
    saveCategory: async (_principal, _authorizationHeader, input) => ({
      id: input.id ?? "00000000-0000-4000-8000-000000000902",
      name: input.name,
      description: input.description,
      defaultDepartmentId: input.defaultDepartmentId,
      sensitivityDefault: input.sensitivityDefault,
      active: input.active,
    }),
    setUserRole: async () => undefined,
    setRolePermission: async () => undefined,
    deactivateDepartment: async () => ({
      reassignedRequests: 0,
      reassignedUsers: 0,
    }),
    listAuditEvents: async () => [],
  };
}
