import { createContext, useContext } from "react";

export type UserRole =
  | "employee"
  | "department_manager"
  | "senior_leadership"
  | "platform_admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: UserRole;
};

export interface AuthState {
  status: "authenticated" | "unauthenticated";
  user: SessionUser | null;
  accessToken?: string | null;
  demoMode?: boolean;
  demoAvailability?: "checking" | "enabled" | "disabled" | "unavailable";
  signInDemo?: (role: UserRole) => Promise<void>;
  retryDemoDetection?: () => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  status: "unauthenticated",
  user: null,
  signOut: async () => undefined,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
