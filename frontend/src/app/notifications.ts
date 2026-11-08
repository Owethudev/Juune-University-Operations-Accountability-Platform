import { apiBaseUrl, bearerHeaders, isRecord, responseJson } from "./api.js";

export interface NotificationItem {
  id: string;
  eventType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
}

export async function loadNotifications(
  accessToken: string | null | undefined,
  page = 1,
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const response = await fetch(`${apiBaseUrl()}/notifications?page=${page}`, {
    headers: bearerHeaders(accessToken),
    signal,
  });
  if (!response.ok) {
    throw new Error("Notifications could not be loaded.");
  }
  const payload = await responseJson(response);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !Number.isInteger(payload.unreadCount) ||
    typeof payload.unreadCount !== "number" ||
    payload.unreadCount < 0 ||
    typeof payload.hasMore !== "boolean"
  ) {
    throw new Error("Notifications could not be loaded.");
  }

  const items: NotificationItem[] = [];
  for (const value of payload.items) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      typeof value.eventType !== "string" ||
      (value.relatedEntityType !== null &&
        typeof value.relatedEntityType !== "string") ||
      (value.relatedEntityId !== null &&
        typeof value.relatedEntityId !== "string") ||
      typeof value.createdAt !== "string" ||
      typeof value.isRead !== "boolean"
    ) {
      throw new Error("Notifications could not be loaded.");
    }
    items.push({
      id: value.id,
      eventType: value.eventType,
      relatedEntityType: value.relatedEntityType,
      relatedEntityId: value.relatedEntityId,
      createdAt: value.createdAt,
      isRead: value.isRead,
    });
  }
  return {
    items,
    unreadCount: payload.unreadCount,
    hasMore: payload.hasMore,
  };
}

export async function markNotificationRead(
  accessToken: string | null | undefined,
  notificationId: string,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl()}/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
      headers: bearerHeaders(accessToken),
    },
  );
  if (!response.ok) {
    throw new Error("Notification could not be marked as read.");
  }
}
