import { useState, type PropsWithChildren } from "react";
import { apiBaseUrl, isRecord, responseJson } from "../api.js";
import {
  AuthContext,
  type AuthState,
  type SessionUser,
  type UserRole,
} from "./AuthContext.js";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

  async function signInDemo(role: UserRole): Promise<void> {
    const response = await fetch(`${apiBaseUrl()}/auth/demo/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload: unknown = await responseJson(response);
    if (
      !response.ok ||
      !isRecord(payload) ||
      typeof payload.accessToken !== "string" ||
      !isRecord(payload.user)
    ) {
      throw new Error("Demo sign-in is unavailable.");
    }

    const candidate = payload.user;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.email !== "string" ||
      (typeof candidate.department !== "string" &&
        candidate.department !== null) ||
      !isUserRole(candidate.role)
    ) {
      throw new Error("Demo sign-in returned an invalid account.");
    }
    setUser({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      department: candidate.department,
      role: candidate.role,
    });
    setAccessToken(payload.accessToken);
  }

  const value: AuthState = {
    status: user ? "authenticated" : "unauthenticated",
    user,
    accessToken,
    demoMode,
    ...(demoMode ? { signInDemo } : {}),
    signOut: async () => {
      setUser(null);
      setAccessToken(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "employee" ||
    value === "department_manager" ||
    value === "senior_leadership" ||
    value === "platform_admin"
  );
}
