import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/auth/AuthContext.js";
import {
  loadNotifications,
  markNotificationRead,
  type NotificationItem,
} from "../app/notifications.js";

function notificationTitle(eventType: string): string {
  switch (eventType) {
    case "request_created":
      return "New request assigned for review";
    case "request_status_changed":
      return "Request status updated";
    case "request_assigned":
      return "Request assigned";
    case "request_response":
      return "New request response";
    case "request_reopened":
      return "Request reopened";
    case "request_escalation":
    case "escalation":
      return "Request flagged for review";
    default:
      return "Request update";
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function hasRelatedRequest(item: NotificationItem): boolean {
  return (
    item.relatedEntityType === "request" &&
    typeof item.relatedEntityId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      item.relatedEntityId,
    )
  );
}

export function NotificationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const loaded = await loadNotifications(accessToken, 1, signal);
      if (!signal?.aborted) {
        setItems(loaded.items);
        setUnreadCount(loaded.unreadCount);
        setHasMore(loaded.hasMore);
        setPage(1);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!signal?.aborted) setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "unread" ? !item.isRead : item.isRead);
      const matchesSearch =
        !term || notificationTitle(item.eventType).toLocaleLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  async function markRead(item: NotificationItem) {
    if (item.isRead || savingId) return;
    setSavingId(item.id);
    setActionError("");
    try {
      await markNotificationRead(accessToken, item.id);
      const currentPage = await loadNotifications(accessToken, 1);
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      setUnreadCount(currentPage.unreadCount);
      window.dispatchEvent(new Event("juune-notifications-updated"));
    } catch {
      setActionError("We couldn’t update this notification. Try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function loadOlder() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const nextPage = page + 1;
      const loaded = await loadNotifications(accessToken, nextPage);
      setItems((current) => [
        ...current,
        ...loaded.items.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setUnreadCount(loaded.unreadCount);
      setHasMore(loaded.hasMore);
      setPage(nextPage);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return <section className="tracking-panel"><p role="status">Loading notifications…</p></section>;
  }
  if (loadError) {
    return (
      <section className="tracking-panel">
        <p role="alert">We couldn’t load notifications. Try again.</p>
        <button className="button button-secondary" type="button" onClick={() => void refresh()}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="tracking-page">
      <section className="tracking-panel" aria-labelledby="notifications-title">
        <div className="section-heading">
          <div>
            <h2 id="notifications-title">Notifications</h2>
            <p>{unreadCount} unread</p>
          </div>
        </div>
        <div className="notification-filters">
          <label htmlFor="notification-status">Show</label>
          <select
            id="notification-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <label htmlFor="notification-search">Search notifications</label>
          <input
            id="notification-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {actionError && <p className="request-error" role="alert">{actionError}</p>}
        {loadMoreError && (
          <p className="request-error" role="alert">
            We couldn’t load older notifications. Try again.
          </p>
        )}
        {visibleItems.length === 0 ? (
          <p className="read-only-note">
            {items.length === 0 ? "You’re all caught up." : "No notifications match these filters."}
          </p>
        ) : (
          <ol className="notification-list">
            {visibleItems.map((item) => (
              <li className="notification-item" key={item.id}>
                <div>
                  <h3>{notificationTitle(item.eventType)}</h3>
                  <p>{formatTime(item.createdAt)}</p>
                  {!item.isRead && <span className="notification-unread-label">Unread</span>}
                </div>
                <div className="notification-item-actions">
                  {hasRelatedRequest(item) && (
                    <Link
                      className="button button-secondary"
                      to={`/requests/${item.relatedEntityId}`}
                    >
                      Review related request
                    </Link>
                  )}
                  {!item.isRead && (
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => void markRead(item)}
                    >
                      {savingId === item.id ? "Saving…" : "Mark as read"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {hasMore && (
          <button
            className="button button-secondary"
            type="button"
            disabled={loadingMore}
            onClick={() => void loadOlder()}
          >
            {loadingMore ? "Loading…" : "Load older notifications"}
          </button>
        )}
      </section>
    </div>
  );
}
