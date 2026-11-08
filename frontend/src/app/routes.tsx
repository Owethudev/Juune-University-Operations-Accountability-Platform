import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.js";
import { AppShell } from "./AppShell.js";
import { AccessDeniedPage } from "../pages/AccessDeniedPage.js";
import { HomePage } from "../pages/HomePage.js";
import { ProfilePage } from "../pages/ProfilePage.js";
import {
  NewRequestPage,
  RequestDetailPage,
} from "../pages/NewRequestPage.js";
import { SignInPage } from "../pages/SignInPage.js";

type ProtectedPage = "home" | "profile" | "new-request" | "request-detail";

function ProtectedShell({ page }: { page: ProtectedPage }) {
  const { status, user } = useAuth();

  if (status !== "authenticated" || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (page === "new-request" && user.role !== "employee") {
    return <Navigate to="/access-denied" replace />;
  }

  const pageTitle = {
    home: "Home",
    profile: "Profile & Settings",
    "new-request": "New Request",
    "request-detail": "Request",
  }[page];
  const content = {
    home: <HomePage user={user} />,
    profile: <ProfilePage user={user} />,
    "new-request": <NewRequestPage />,
    "request-detail": <RequestDetailPage />,
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
        path="/requests/:requestId"
        element={<ProtectedShell page="request-detail" />}
      />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
