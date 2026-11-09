import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes.js";
import { AuthProvider } from "./AuthProvider.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("demo authentication provider", () => {
  it("detects demo mode from the backend health endpoint without a frontend flag", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return Response.json({ status: "ok", demoMode: true });
      }
      if (url.endsWith("/auth/demo/start")) {
        return Response.json({
          accessToken: "demo-token-employee",
          user: {
            id: "00000000-0000-4000-8000-000000000201",
            name: "Alex Demo",
            email: "alex.employee@example.invalid",
            department: "Information Technology",
            role: "employee",
          },
        });
      }
      return Response.json({ items: [], unreadCount: 0, hasMore: false });
    });

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText("Demo role")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue to demo" }));
    expect(await screen.findByRole("heading", { name: "Welcome, Alex Demo" })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("explains backend or CORS connection failures instead of showing the institutional sign-in error", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/verify the backend URL and its CORS settings/i);
    expect(screen.queryByRole("button", { name: "Sign in with your institution" }))
      .not.toBeInTheDocument();
  });

  it("exchanges the selected demo role for a bearer session", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/demo/start")) {
        return Response.json({
          accessToken: "demo-token-department_manager",
          user: {
            id: "00000000-0000-4000-8000-000000000202",
            name: "Sam Manager",
            email: "sam.manager@example.invalid",
            department: "Information Technology",
            role: "department_manager",
          },
        });
      }
      if (url.includes("/dashboard")) {
        return Response.json({ rows: [], recentRequests: [] });
      }
      return Response.json({ items: [], unreadCount: 0, hasMore: false });
    });

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Demo role"), {
      target: { value: "department_manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to demo" }));

    expect(
      await screen.findByRole("heading", { name: "Department dashboard" }),
    ).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/demo\/start$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role: "department_manager" }),
      }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard"),
      expect.objectContaining({
        headers: { Authorization: "Bearer demo-token-department_manager" },
      }),
    );
  });
});
