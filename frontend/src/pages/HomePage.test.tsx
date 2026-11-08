import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthState,
  type SessionUser,
} from "../app/auth/AuthContext.js";
import { HomePage } from "./HomePage.js";

const manager: SessionUser = {
  id: "00000000-0000-4000-8000-000000000202",
  name: "Synthetic Manager",
  email: "manager@example.invalid",
  department: "IT",
  role: "department_manager",
};
const employee: SessionUser = {
  ...manager,
  id: "00000000-0000-4000-8000-000000000201",
  role: "employee",
};
const rows = [
  {
    departmentId: "00000000-0000-4000-8000-000000000101",
    departmentName: "IT",
    status: "in_progress",
    requestCount: 2,
    assignedCount: 1,
  },
  {
    departmentId: "00000000-0000-4000-8000-000000000101",
    departmentName: "IT",
    status: "resolved",
    requestCount: 1,
    assignedCount: 1,
  },
];
const recentRequests = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    reference: "JU-ABCDEFGH",
    departmentName: "IT",
    status: "in_progress",
    updatedAt: "2026-11-08T12:30:00.000Z",
  },
];

function renderHome(user: SessionUser) {
  const authState: AuthState = {
    status: "authenticated",
    user,
    accessToken: "synthetic-verified-token",
    signOut: async () => undefined,
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authState}>
        <HomePage user={user} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("S2 role dashboard", () => {
  it("shows loading and role-scoped standard-request aggregates", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRequest = resolve;
        }),
    );
    renderHome(manager);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your dashboard…",
    );
    finishRequest?.(Response.json({ rows, recentRequests }));

    expect(
      await screen.findByRole("heading", { name: "Outstanding requests" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Outstanding requests" }).parentElement,
    ).toHaveTextContent("2");
    expect(screen.getByText("Outstanding requests")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Requests with an assignee" }).parentElement,
    ).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "View request queue" })).toHaveAttribute(
      "href",
      "/requests",
    );
    expect(fetchSpy.mock.calls[0]?.[0]).toContain("/dashboard");
    expect(await screen.findByRole("link", { name: "JU-ABCDEFGH" })).toHaveAttribute(
      "href",
      "/requests/00000000-0000-4000-8000-000000000401",
    );
    expect(screen.queryByText("A synthetic request summary")).not.toBeInTheDocument();
  });

  it("clears filter controls when no summaries match", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ rows, recentRequests }))
      .mockResolvedValueOnce(Response.json({ rows: [], recentRequests: [] }))
      .mockResolvedValueOnce(Response.json({ rows, recentRequests }));
    renderHome(manager);
    await screen.findByText("Outstanding requests");

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "closed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(
      await screen.findByText("No dashboard results match these filters."),
    ).toBeVisible();
    expect(fetchSpy.mock.calls[1]?.[0]).toContain("status=closed");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Outstanding requests")).toBeVisible();
    expect(fetchSpy.mock.calls[2]?.[0]).not.toContain("status=");
  });

  it("keeps employee home personal and does not request manager dashboard data", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderHome(employee);

    expect(screen.getByRole("link", { name: "New Request" })).toHaveAttribute(
      "href",
      "/requests/new",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("offers a retry when dashboard data cannot be loaded", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ rows: [], recentRequests: [] }));
    renderHome(manager);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t load your dashboard. Try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Nothing needs your attention right now.")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
