import { useCallback, useEffect, useState, type PropsWithChildren } from "react";
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
  const demoModeConfigured = import.meta.env.VITE_DEMO_MODE === "true";
  const [demoAvailability, setDemoAvailability] = useState<
    "checking" | "enabled" | "disabled" | "unavailable"
  >(demoModeConfigured ? "enabled" : "checking");
  const [detectionAttempt, setDetectionAttempt] = useState(0);
  const demoMode = demoAvailability === "enabled";

  useEffect(() => {
    if (demoModeConfigured) return;

    let active = true;
    void fetch(`${apiBaseUrl()}/health`)
      .then(async (response) => {
        const payload: unknown = await responseJson(response);
        if (
          !response.ok ||
          !isRecord(payload) ||
          payload.status !== "ok"
        ) {
          throw new Error("Backend health check failed.");
        }
        if (active) {
          setDemoAvailability(payload.demoMode === true ? "enabled" : "disabled");
        }
      })
      .catch(() => {
        if (active) setDemoAvailability("unavailable");
      });

    return () => {
      active = false;
    };
  }, [demoModeConfigured, detectionAttempt]);

  const retryDemoDetection = useCallback(() => {
    setDemoAvailability("checking");
    setDetectionAttempt((attempt) => attempt + 1);
  }, []);

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
    demoAvailability,
    retryDemoDetection,
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
