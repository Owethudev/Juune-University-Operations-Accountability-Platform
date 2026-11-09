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
  const [previewMode, setPreviewMode] = useState(false);
  const demoModeConfigured = import.meta.env.VITE_DEMO_MODE === "true";
  const [demoAvailability, setDemoAvailability] = useState<
    "checking" | "enabled" | "disabled" | "unavailable"
  >(demoModeConfigured ? "enabled" : "checking");
  const [detectionAttempt, setDetectionAttempt] = useState(0);
  const demoMode = demoAvailability === "enabled" || previewMode;

  useEffect(() => {
    if (demoModeConfigured) return;

    let active = true;
    void fetch(`${apiBaseUrl()}/health`, { method: "GET" })
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
    const accounts: Record<UserRole, SessionUser> = {
      employee: {
        id: "00000000-0000-4000-8000-000000000201",
        name: "Alex Demo",
        email: "alex.employee@example.invalid",
        department: "Information Technology",
        role: "employee",
      },
      department_manager: {
        id: "00000000-0000-4000-8000-000000000202",
        name: "Sam Manager",
        email: "sam.manager@example.invalid",
        department: "Information Technology",
        role: "department_manager",
      },
      senior_leadership: {
        id: "00000000-0000-4000-8000-000000000203",
        name: "Taylor Leadership",
        email: "taylor.leadership@example.invalid",
        department: null,
        role: "senior_leadership",
      },
      platform_admin: {
        id: "00000000-0000-4000-8000-000000000204",
        name: "Jordan Administrator",
        email: "jordan.admin@example.invalid",
        department: null,
        role: "platform_admin",
      },
    };
    setUser({
      ...accounts[role],
    });
    setAccessToken(`demo-token-${role}`);
    setPreviewMode(true);
  }

  const value: AuthState = {
    status: user ? "authenticated" : "unauthenticated",
    user,
    accessToken,
    demoMode,
    demoAvailability,
    retryDemoDetection,
    signInDemo,
    signOut: async () => {
      setUser(null);
      setAccessToken(null);
      setPreviewMode(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
