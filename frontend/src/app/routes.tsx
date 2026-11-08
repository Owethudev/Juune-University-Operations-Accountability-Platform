import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.js";
import { AppShell } from "./AppShell.js";
import { AccessDeniedPage } from "../pages/AccessDeniedPage.js";
import { HomePage } from "../pages/HomePage.js";
import { ProfilePage } from "../pages/ProfilePage.js";
import { SignInPage } from "../pages/SignInPage.js";

function ProtectedShell({ page }: { page: "home" | "profile" }) {
  const { status, user } = useAuth();

  if (status !== "authenticated" || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <AppShell pageTitle={page === "home" ? "Home" : "Profile & Settings"}>
      {page === "home" ? <HomePage user={user} /> : <ProfilePage user={user} />}
    </AppShell>
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
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
