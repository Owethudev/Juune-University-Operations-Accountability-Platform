import { Link } from "react-router-dom";

export function ResponsiveTopBar({
  pageTitle,
  unreadCount,
  user,
}: {
  pageTitle: string;
  unreadCount: number | null;
  user: { name: string };
}) {
  const notificationLabel =
    unreadCount === null
      ? "Notifications, unread count unavailable"
      : unreadCount === 1
        ? "Notifications, 1 unread"
        : `Notifications, ${unreadCount} unread`;

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <p className="eyebrow">Juune University Operations &amp; Accountability</p>
        <h1>{pageTitle}</h1>
      </div>
      <div className="top-bar-actions">
        <Link
          className="notification-indicator"
          to="/notifications"
          aria-label={notificationLabel}
        >
          <span aria-hidden="true">Notifications</span>
          {unreadCount !== null && unreadCount > 0 && (
            <span className="notification-count" aria-hidden="true">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link className="profile-shortcut" to="/profile" aria-label={`Profile for ${user.name}`}>
          <span className="avatar" aria-hidden="true">
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="profile-shortcut-name">{user.name}</span>
        </Link>
      </div>
    </header>
  );
}
