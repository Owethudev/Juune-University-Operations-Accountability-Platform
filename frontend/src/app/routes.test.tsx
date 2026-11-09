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
const admin: SessionUser = {
  ...employee,
  id: "synthetic-admin-1",
  role: "platform_admin",
};

function TestAuthProvider({
  children,
  initialUser,
  demoMode = false,
}: PropsWithChildren<{ initialUser: SessionUser | null; demoMode?: boolean }>) {
  const [user, setUser] = useState(initialUser);
  const value: AuthState = {
    status: user ? "authenticated" : "unauthenticated",
    user,
    demoMode,
    signInDemo: demoMode
      ? async (role) => {
          setUser({
            id: `synthetic-${role}`,
            name: role === "employee" ? "Alex Demo" : "Sam Manager",
            email: "demo@example.invalid",
            department: "Information Technology",
            role,
          });
        }
      : undefined,
    signOut: async () => setUser(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function renderRoutes(
  path: string,
  initialUser: SessionUser | null,
  demoMode = false,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TestAuthProvider initialUser={initialUser} demoMode={demoMode}>
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

  it("offers a clearly labeled synthetic demo role and enters the selected workspace", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/dashboard")
        ? Response.json({ rows: [], recentRequests: [] })
        : Response.json({ items: [], unreadCount: 0, hasMore: false }),
    );
    renderRoutes("/sign-in", null, true);

    expect(screen.getByText(/UI preview uses a synthetic account only/i))
      .toBeVisible();
    fireEvent.change(screen.getByLabelText("Demo role"), {
      target: { value: "department_manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to demo" }));

    expect(
      await screen.findByRole("heading", { name: "Department dashboard" }),
    ).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/notifications"),
      expect.objectContaining({ headers: expect.any(Object) }),
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

  it("T-SEC-11b denies non-admin access to S9 and lets a platform admin open configuration", async () => {
    renderRoutes("/admin", employee);
    expect(
      screen.getByRole("heading", {
        name: "You don’t have permission to view this item.",
      }),
    ).toBeVisible();

    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        departments: [],
        categories: [],
        roles: [],
        rolePermissions: [],
        permissions: [],
        users: [],
        escalation: {
          trigger: "third_flag",
          recipientConfigurationEnabled: false,
        },
      }),
    );
    renderRoutes("/admin", admin);
    expect(
      await screen.findByRole("heading", {
        name: "System Configuration & Operational Governance",
      }),
    ).toBeVisible();
  });

  it("S10 provides a read-only audit view and lets the API enforce reviewer permission", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/audit-events")
        ? Response.json({
            items: [{
              id: "synthetic-audit-1",
              actorId: "synthetic-actor-1",
              actorName: "Synthetic Administrator",
              action: "request_categories.insert",
              targetType: "request_categories",
              targetId: "synthetic-category-1",
              createdAt: "2026-11-08T10:00:00.000Z",
              outcome: "success",
            }],
          })
        : Response.json({ items: [], unreadCount: 0, hasMore: false }),
    );
    renderRoutes("/audit-log", employee);

    expect(await screen.findByText("Synthetic Administrator")).toBeVisible();
    expect(
      screen.getAllByRole("heading", { name: "Audit Log" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/audit-events"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
