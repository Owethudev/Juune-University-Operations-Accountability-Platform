import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { useAuth } from "./auth/AuthContext.js";
import { loadNotifications } from "./notifications.js";
import { OfflineBanner } from "../components/OfflineBanner.js";
import { ResponsiveTopBar } from "../components/ResponsiveTopBar.js";
import { RoleNavigation } from "../components/RoleNavigation.js";

export function AppShell({
  children,
  pageTitle,
}: PropsWithChildren<{ pageTitle: string }>) {
  const { accessToken, user } = useAuth();
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refreshNotificationCount = useCallback(() => {
    void loadNotifications(accessToken)
      .then((page) => setUnreadCount(page.unreadCount))
      .catch(() => setUnreadCount(null));
  }, [accessToken]);

  useEffect(() => {
    const updateConnectivity = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);

    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  useEffect(() => {
    refreshNotificationCount();
    window.addEventListener(
      "juune-notifications-updated",
      refreshNotificationCount,
    );
    return () =>
      window.removeEventListener(
        "juune-notifications-updated",
        refreshNotificationCount,
      );
  }, [refreshNotificationCount]);

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell">
      <RoleNavigation role={user.role} />
      <div className="app-content">
        <ResponsiveTopBar
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          user={user}
        />
        {isOffline && <OfflineBanner />}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
