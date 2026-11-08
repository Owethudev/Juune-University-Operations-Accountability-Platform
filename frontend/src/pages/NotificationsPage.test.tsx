import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthState,
  type SessionUser,
} from "../app/auth/AuthContext.js";
import { NotificationsPage } from "./NotificationsPage.js";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000201",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};
const authState: AuthState = {
  status: "authenticated",
  user,
  accessToken: "synthetic-verified-token",
  signOut: async () => undefined,
};
const notification = {
  id: "00000000-0000-4000-8000-000000000601",
  eventType: "escalation",
  relatedEntityType: "request",
  relatedEntityId: "00000000-0000-4000-8000-000000000401",
  createdAt: "2026-11-08T12:30:00.000Z",
  isRead: false,
};
const page = { items: [notification], unreadCount: 1, hasMore: false };

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authState}>
        <NotificationsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("S8 Notifications", () => {
  it("shows loading and empty states without inventing notification content", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRequest = resolve;
        }),
    );
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading notifications…",
    );
    finishRequest?.(
      Response.json({ items: [], unreadCount: 0, hasMore: false }),
    );
    expect(
      await screen.findByText("You’re all caught up."),
    ).toBeVisible();
  });

  it("lists scoped in-app notifications and marks an item as read", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(
        Response.json({
          items: [{ ...notification, isRead: true }],
          unreadCount: 0,
          hasMore: false,
        }),
      );
    renderPage();

    expect(await screen.findByText("Request flagged for review")).toBeVisible();
    expect(screen.getByText("1 unread")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Review related request" }),
    ).toHaveAttribute("href", "/requests/00000000-0000-4000-8000-000000000401");
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    expect(fetchSpy.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(fetchSpy.mock.calls[1]?.[0]).toContain(
      "/notifications/00000000-0000-4000-8000-000000000601/read",
    );
    expect(await screen.findByText("0 unread")).toBeVisible();
  });

  it("shows a safe retry state on a notification service failure", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ items: [], unreadCount: 0, hasMore: false }),
      );
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t load notifications. Try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("You’re all caught up.");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("loads older notification history without losing the unread count", async () => {
    const olderNotification = {
      ...notification,
      id: "00000000-0000-4000-8000-000000000602",
      eventType: "request_status_changed",
      createdAt: "2026-11-07T12:30:00.000Z",
      isRead: true,
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ ...page, hasMore: true }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [olderNotification],
          unreadCount: 1,
          hasMore: false,
        }),
      );
    renderPage();
    await screen.findByText("Request flagged for review");
    fireEvent.click(screen.getByRole("button", { name: "Load older notifications" }));

    expect(await screen.findByText("Request status updated")).toBeVisible();
    expect(screen.getByText("1 unread")).toBeVisible();
    expect(fetchSpy.mock.calls[1]?.[0]).toContain("/notifications?page=2");
  });
});
