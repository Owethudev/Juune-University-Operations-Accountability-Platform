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

  it("opens a UI-only demo even when the backend health check fails", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Continue to demo" }))
      .toBeEnabled();
    expect(await screen.findByText(/UI preview uses a synthetic account only/i))
      .toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue to demo" }));
    expect(await screen.findByRole("heading", { name: "Welcome, Alex Demo" }))
      .toBeVisible();
  });

  it("opens the selected role immediately using a local synthetic session", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
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
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/demo\/start$/),
      expect.anything(),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard"),
      expect.objectContaining({
        headers: { Authorization: "Bearer demo-token-department_manager" },
      }),
    );
  });
});
