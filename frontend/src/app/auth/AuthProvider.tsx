import { useState, type PropsWithChildren } from "react";
import { AuthContext, type AuthState, type SessionUser } from "./AuthContext.js";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const value: AuthState = {
    status: user ? "authenticated" : "unauthenticated",
    user,
    signOut: async () => setUser(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
