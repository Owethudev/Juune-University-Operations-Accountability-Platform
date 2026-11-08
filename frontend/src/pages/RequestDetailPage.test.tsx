import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "../app/auth/AuthContext.js";
import { RequestDetailPage } from "./RequestDetailPage.js";

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
const detail = {
  id: "00000000-0000-4000-8000-000000000401",
  reference: "JU-ABCDEFGH",
  categoryId: "00000000-0000-4000-8000-000000000301",
  departmentId: "00000000-0000-4000-8000-000000000101",
  summary: "A synthetic request",
  description: "A synthetic description for this request.",
  category: { id: "00000000-0000-4000-8000-000000000301", name: "IT support" },
  department: { id: "00000000-0000-4000-8000-000000000101", name: "IT" },
  requester: { id: user.id, name: "Synthetic Employee" },
  assignedTo: { id: "00000000-0000-4000-8000-000000000202", name: "Synthetic Manager" },
  status: "in_progress",
  statusReason: null,
  createdAt: "2026-11-08T12:00:00.000Z",
  updatedAt: "2026-11-08T12:30:00.000Z",
  sensitivity: "standard",
  events: [
    {
      id: "00000000-0000-4000-8000-000000000501",
      eventType: "created",
      actorName: "Synthetic Employee",
      message: null,
      metadata: {},
      createdAt: "2026-11-08T12:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000502",
      eventType: "response",
      actorName: "Synthetic Manager",
      message: "Work is underway.",
      metadata: {},
      createdAt: "2026-11-08T12:15:00.000Z",
    },
  ],
  attachments: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/requests/00000000-0000-4000-8000-000000000401"]}>
      <AuthContext.Provider value={authState}>
        <Routes>
          <Route path="/requests/:requestId" element={<RequestDetailPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("S4 Request Detail", () => {
  it("shows loading, status, responsible parties, and permitted history chronologically", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRequest = resolve;
        }),
    );
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Loading request…");
    finishRequest?.(Response.json(detail));

    expect(await screen.findByRole("heading", { name: "JU-ABCDEFGH" })).toBeVisible();
    expect(screen.getByText("Synthetic Manager")).toBeVisible();
    expect(screen.getByText("In progress")).toBeVisible();
    const events = screen.getAllByRole("listitem");
    expect(events[0]).toHaveTextContent("Request created");
    expect(events[1]).toHaveTextContent("Work is underway.");
    expect(screen.getByText("A reliable resolution estimate isn’t available for this category yet.")).toBeVisible();
  });

  it("T-SEC-2b renders generic denial and never exposes inaccessible detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { message: "You don’t have permission to view this item." },
        { status: 404 },
      ),
    );
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "You don’t have permission to view this item.",
      }),
    ).toBeVisible();
    expect(screen.queryByText("A synthetic description for this request.")).not.toBeInTheDocument();
  });

  it("posts a permitted response and retains text on network error for safe retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(detail))
      .mockRejectedValueOnce(new TypeError("Network unavailable."))
      .mockResolvedValueOnce(Response.json({ event: detail.events[1] }, { status: 201 }))
      .mockResolvedValueOnce(Response.json(detail));
    renderPage();
    await screen.findByRole("heading", { name: "JU-ABCDEFGH" });

    fireEvent.change(screen.getByRole("textbox", { name: "Response" }), {
      target: { value: "I can provide more details." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post response" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t save your response. Your text is still here; try again.",
    );
    expect(screen.getByRole("textbox", { name: "Response" })).toHaveValue(
      "I can provide more details.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
    expect(fetchSpy.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(fetchSpy.mock.calls[3]?.[0]).toContain("/requests/");
  });

  it("keeps attachment upload unavailable and never renders storage paths", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(detail));
    renderPage();

    expect(await screen.findByRole("heading", { name: "JU-ABCDEFGH" })).toBeVisible();
    expect(screen.getByText("Evidence uploads are not available yet.")).toBeVisible();
    expect(screen.queryByLabelText(/attachment|upload/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/storage_key|bucket|supabase\.co/i)).not.toBeInTheDocument();
  });

  it("records a flag only after confirmation and uses neutral third-flag language", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(detail))
      .mockResolvedValueOnce(Response.json({ flagCount: 3, reviewTriggered: true }))
      .mockResolvedValueOnce(Response.json(detail));
    renderPage();
    await screen.findByRole("heading", { name: "JU-ABCDEFGH" });

    fireEvent.click(screen.getByRole("button", { name: "Flag lack of assistance" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Three flags on the same request create a review event.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm flag" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your concern was recorded. This request is flagged for review.",
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toContain(
      "/requests/00000000-0000-4000-8000-000000000401/flags",
    );
    expect(fetchSpy.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(
      screen.getByText("A reliable resolution estimate isn’t available for this category yet."),
    ).toBeVisible();
  });
});
