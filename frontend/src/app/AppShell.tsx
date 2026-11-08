import { useEffect, useState, type PropsWithChildren } from "react";
import { useAuth } from "./auth/AuthContext.js";
import { OfflineBanner } from "../components/OfflineBanner.js";
import { ResponsiveTopBar } from "../components/ResponsiveTopBar.js";
import { RoleNavigation } from "../components/RoleNavigation.js";

export function AppShell({
  children,
  pageTitle,
}: PropsWithChildren<{ pageTitle: string }>) {
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const updateConnectivity = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);

    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell">
      <RoleNavigation role={user.role} />
      <div className="app-content">
        <ResponsiveTopBar pageTitle={pageTitle} unreadCount={0} user={user} />
        {isOffline && <OfflineBanner />}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
