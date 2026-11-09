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
