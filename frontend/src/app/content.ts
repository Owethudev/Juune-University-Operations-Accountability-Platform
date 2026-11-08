import { apiBaseUrl, bearerHeaders, isRecord, responseJson } from "./api.js";

export type OpportunityType =
  | "vacancy"
  | "promotion"
  | "temporary_assignment"
  | "training"
  | "professional_development";

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

export interface ContentDepartment {
  id: string;
  name: string;
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

const opportunityTypes: OpportunityType[] = [
  "vacancy",
  "promotion",
  "temporary_assignment",
  "training",
  "professional_development",
];

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function parseAnnouncement(value: unknown): Announcement | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.body !== "string" ||
    typeof value.publisherName !== "string" ||
    typeof value.publishedAt !== "string" ||
    !(typeof value.expiresAt === "string" || value.expiresAt === null) ||
    !stringArray(value.audienceDepartmentNames)
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    publisherName: value.publisherName,
    publishedAt: value.publishedAt,
    expiresAt: value.expiresAt,
    audienceDepartmentNames: value.audienceDepartmentNames,
  };
}

function parseOpportunity(value: unknown): Opportunity | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.type !== "string" ||
    !opportunityTypes.includes(value.type as OpportunityType) ||
    typeof value.description !== "string" ||
    typeof value.publisherName !== "string" ||
    !stringArray(value.departmentNames) ||
    !(typeof value.opensAt === "string" || value.opensAt === null) ||
    !(typeof value.closesAt === "string" || value.closesAt === null) ||
    !(typeof value.applicationUrl === "string" || value.applicationUrl === null) ||
    !(typeof value.instructions === "string" || value.instructions === null)
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    type: value.type as OpportunityType,
    description: value.description,
    publisherName: value.publisherName,
    departmentNames: value.departmentNames,
    opensAt: value.opensAt,
    closesAt: value.closesAt,
    applicationUrl: value.applicationUrl,
    instructions: value.instructions,
  };
}

function parseAnnouncementDraft(value: unknown): AnnouncementDraft | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.body !== "string" ||
    !(typeof value.expiresAt === "string" || value.expiresAt === null) ||
    !stringArray(value.audienceDepartmentIds)
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    expiresAt: value.expiresAt,
    audienceDepartmentIds: value.audienceDepartmentIds,
  };
}

function parseOpportunityDraft(value: unknown): OpportunityDraft | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.type !== "string" ||
    !opportunityTypes.includes(value.type as OpportunityType) ||
    typeof value.description !== "string" ||
    !(typeof value.opensAt === "string" || value.opensAt === null) ||
    !(typeof value.closesAt === "string" || value.closesAt === null) ||
    !(typeof value.applicationUrl === "string" || value.applicationUrl === null) ||
    !(typeof value.instructions === "string" || value.instructions === null) ||
    !stringArray(value.audienceDepartmentIds)
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    type: value.type as OpportunityType,
    description: value.description,
    opensAt: value.opensAt,
    closesAt: value.closesAt,
    applicationUrl: value.applicationUrl,
    instructions: value.instructions,
    audienceDepartmentIds: value.audienceDepartmentIds,
  };
}

function parseItems<T>(
  value: unknown,
  parseItem: (candidate: unknown) => T | null,
): T[] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items: T[] = [];
  for (const candidate of value.items) {
    const item = parseItem(candidate);
    if (item === null) return null;
    items.push(item);
  }
  return items;
}

export function parseAnnouncements(value: unknown): Announcement[] | null {
  return parseItems(value, parseAnnouncement);
}

export function parseOpportunities(value: unknown): Opportunity[] | null {
  return parseItems(value, parseOpportunity);
}

export function parseAnnouncementDrafts(
  value: unknown,
): AnnouncementDraft[] | null {
  return parseItems(value, parseAnnouncementDraft);
}

export function parseOpportunityDrafts(value: unknown): OpportunityDraft[] | null {
  return parseItems(value, parseOpportunityDraft);
}

export function parseDepartments(value: unknown): ContentDepartment[] | null {
  if (!isRecord(value) || !Array.isArray(value.departments)) return null;
  const departments: ContentDepartment[] = [];
  for (const candidate of value.departments) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string"
    ) {
      return null;
    }
    departments.push({ id: candidate.id, name: candidate.name });
  }
  return departments;
}

export function parsePublishingPermissions(
  value: unknown,
): { announcements: boolean; opportunities: boolean } | null {
  if (
    !isRecord(value) ||
    typeof value.announcements !== "boolean" ||
    typeof value.opportunities !== "boolean"
  ) {
    return null;
  }
  return {
    announcements: value.announcements,
    opportunities: value.opportunities,
  };
}

export async function fetchContentJson(
  path: string,
  accessToken: string | null | undefined,
  options?: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...bearerHeaders(accessToken),
      ...(options?.headers ?? {}),
    },
  });
  return { response, body: await responseJson(response) };
}

export function contentErrorMessage(body: unknown, fallback: string): string {
  return isRecord(body) && typeof body.message === "string"
    ? body.message
    : fallback;
}
