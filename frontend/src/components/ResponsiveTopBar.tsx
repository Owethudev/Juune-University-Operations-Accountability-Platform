import { Link } from "react-router-dom";

export function ResponsiveTopBar({
  pageTitle,
  unreadCount,
  user,
}: {
  pageTitle: string;
  unreadCount: number;
  user: { name: string };
}) {
  const notificationLabel =
    unreadCount === 1
      ? "Notifications, 1 unread"
      : `Notifications, ${unreadCount} unread`;

  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <p className="eyebrow">Juune University Operations &amp; Accountability</p>
        <h1>{pageTitle}</h1>
      </div>
      <div className="top-bar-actions">
        <button
          className="notification-indicator"
          type="button"
          aria-label={notificationLabel}
          disabled
        >
          <span aria-hidden="true">Notifications</span>
          {unreadCount > 0 && (
            <span className="notification-count" aria-hidden="true">
              {unreadCount}
            </span>
          )}
        </button>
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
