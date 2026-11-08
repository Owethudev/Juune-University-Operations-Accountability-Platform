import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.js";
import { AppShell } from "./AppShell.js";
import { AccessDeniedPage } from "../pages/AccessDeniedPage.js";
import { HomePage } from "../pages/HomePage.js";
import { ProfilePage } from "../pages/ProfilePage.js";
import { NewRequestPage } from "../pages/NewRequestPage.js";
import { RequestDetailPage } from "../pages/RequestDetailPage.js";
import { RequestsPage } from "../pages/RequestsPage.js";
import { SignInPage } from "../pages/SignInPage.js";
import { NotificationsPage } from "../pages/NotificationsPage.js";
import { AnnouncementsPage } from "../pages/AnnouncementsPage.js";
import { OpportunitiesPage } from "../pages/OpportunitiesPage.js";
import { GovernancePage } from "../pages/GovernancePage.js";
import { AuditLogPage } from "../pages/AuditLogPage.js";

type ProtectedPage =
  | "home"
  | "profile"
  | "new-request"
  | "requests"
  | "request-detail"
  | "notifications"
  | "announcements"
  | "opportunities"
  | "governance"
  | "audit-log";


function ProtectedShell({ page }: { page: ProtectedPage }) {
  const { status, user } = useAuth();

  if (status !== "authenticated" || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (page === "new-request" && user.role !== "employee") {
    return <Navigate to="/access-denied" replace />;
  }
  if (page === "governance" && user.role !== "platform_admin") {
    return <Navigate to="/access-denied" replace />;
  }

  const pageTitle = {
    home: "Home",
    profile: "Profile & Settings",
    "new-request": "New Request",
    requests: "My Requests",
    "request-detail": "Request",
    notifications: "Notifications",
    announcements: "Announcements",
    opportunities: "Opportunities",
    governance: "Admin Console",
    "audit-log": "Audit Log",
  }[page];
  const content = {
    home: <HomePage user={user} />,
    profile: <ProfilePage user={user} />,
    "new-request": <NewRequestPage />,
    requests: <RequestsPage />,
    "request-detail": <RequestDetailPage />,
    notifications: <NotificationsPage />,
    announcements: <AnnouncementsPage />,
    opportunities: <OpportunitiesPage />,
    governance: <GovernancePage />,
    "audit-log": <AuditLogPage />,
  }[page];

  return (
    <AppShell pageTitle={pageTitle}>{content}</AppShell>
  );
}

function SignInRoute() {
  const { status } = useAuth();
  return status === "authenticated" ? (
    <Navigate to="/" replace />
  ) : (
    <SignInPage />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInRoute />} />
      <Route path="/" element={<ProtectedShell page="home" />} />
      <Route path="/profile" element={<ProtectedShell page="profile" />} />
      <Route
        path="/requests/new"
        element={<ProtectedShell page="new-request" />}
      />
      <Route
        path="/requests"
        element={<ProtectedShell page="requests" />}
      />
      <Route
        path="/requests/:requestId"
        element={<ProtectedShell page="request-detail" />}
      />
      <Route
        path="/notifications"
        element={<ProtectedShell page="notifications" />}
      />
      <Route
        path="/announcements"
        element={<ProtectedShell page="announcements" />}
      />
      <Route
        path="/opportunities"
        element={<ProtectedShell page="opportunities" />}
      />
      <Route
        path="/admin"
        element={<ProtectedShell page="governance" />}
      />
      <Route
        path="/audit-log"
        element={<ProtectedShell page="audit-log" />}
      />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
