import { useState, type PropsWithChildren } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "./auth/AuthContext.js";
import { AppRoutes } from "./routes.js";

const employee: SessionUser = {
  id: "synthetic-employee-1",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};

const manager: SessionUser = {
  ...employee,
  id: "synthetic-manager-1",
  role: "department_manager",
};

function TestAuthProvider({
  children,
  initialUser,
}: PropsWithChildren<{ initialUser: SessionUser | null }>) {
  const [user, setUser] = useState(initialUser);
  const value: AuthState = {
    status: user ? "authenticated" : "unauthenticated",
    user,
    signOut: async () => setUser(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function renderRoutes(path: string, initialUser: SessionUser | null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TestAuthProvider initialUser={initialUser}>
        <AppRoutes />
      </TestAuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("application routes", () => {
  it("T-SETUP-2 keeps protected content out of the logged-out shell", () => {
    renderRoutes("/profile", null);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeVisible();
    expect(screen.queryByText("Synthetic Employee")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /workspace/i })).not.toBeInTheDocument();
  });

  it("T-NAV-1 guards protected routes and returns to sign-in after sign-out", async () => {
    renderRoutes("/profile", employee);

    expect(
      screen.getByRole("heading", { name: "Profile & Settings" }),
    ).toBeVisible();
    expect(screen.getByText("Synthetic Employee", { selector: "dd" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeVisible();
    expect(screen.queryByText("Synthetic Employee")).not.toBeInTheDocument();
  });

  it("T-SEC-1b denies non-employees access to the new-request route", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderRoutes("/requests/new", manager);

    expect(
      screen.getByRole("heading", {
        name: "You don’t have permission to view this item.",
      }),
    ).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes authenticated staff to the notification history", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Response.json({ items: [], unreadCount: 0, hasMore: false }),
      );
    renderRoutes("/notifications", employee);

    expect(
      await screen.findByRole("heading", { name: "Notifications" }),
    ).toBeVisible();
    expect(await screen.findByText("You’re all caught up.")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/notifications"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("S1 reports the approved safe error when institutional sign-in is unavailable", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 503 }));
    renderRoutes("/sign-in", null);

    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with your institution" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t sign you in. Check your institutional account or contact your university support team.",
    );
    const apiBaseUrl = import.meta.env.DEV
      ? "/api/v1"
      : (import.meta.env.VITE_API_BASE_URL ?? "/api/v1");
    expect(fetchSpy).toHaveBeenCalledWith(
      `${apiBaseUrl.replace(/\/$/, "")}/auth/start`,
      {
      method: "POST",
      },
    );
  });

  it("S1 explains that connectivity is required while offline", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderRoutes("/sign-in", null);

    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with your institution" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "A connection is required to sign in. Reconnect and try again.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
