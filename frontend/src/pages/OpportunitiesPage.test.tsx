import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "../app/auth/AuthContext.js";
import { OpportunitiesPage } from "./OpportunitiesPage.js";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000201",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};
const opportunity = {
  id: "00000000-0000-4000-8000-000000000802",
  title: "Synthetic published opportunity",
  type: "training",
  description: "Synthetic published opportunity for audience policy tests.",
  publisherName: "Synthetic Publisher",
  departmentNames: ["IT"],
  opensAt: "2026-01-01T00:00:00.000Z",
  closesAt: "2099-01-01T00:00:00.000Z",
  applicationUrl: null,
  instructions: "Contact the designated synthetic test coordinator.",
};
const draft = {
  id: "00000000-0000-4000-8000-000000000803",
  title: "Synthetic saved opportunity draft",
  type: "training",
  description: "Synthetic draft description with sufficient detail.",
  opensAt: null,
  closesAt: null,
  applicationUrl: null,
  instructions: "Synthetic instructions for the draft.",
  audienceDepartmentIds: [],
};

function renderPage() {
  const authState: AuthState = {
    status: "authenticated",
    user,
    accessToken: "synthetic-verified-token",
    signOut: async () => undefined,
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authState}>
        <OpportunitiesPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("S7 Opportunities", () => {
  it("shows required current opportunity fields and the helpful empty state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/content/publishing-permissions")) {
        return Response.json({ announcements: false, opportunities: false });
      }
      if (String(input).includes("/requests/options")) {
        return Response.json({
          categories: [],
          departments: [{ id: "00000000-0000-4000-8000-000000000101", name: "IT" }],
        });
      }
      if (String(input).includes("/opportunities/drafts")) {
        return Response.json({ items: [] });
      }
      if (String(input).includes("/opportunities/")) {
        return Response.json({ item: opportunity });
      }
      return Response.json({ items: [opportunity] });
    });
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Synthetic published opportunity",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Training").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IT").length).toBeGreaterThan(0);
    expect(screen.getByText(/closing date/i)).toBeVisible();
    expect(screen.getByLabelText("Closing from")).toBeVisible();
    expect(screen.getByLabelText("Closing through")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /view opportunity details/i }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /view opportunity details/i }));
    expect(
      await screen.findByText("Contact the designated synthetic test coordinator."),
    ).toBeVisible();

    cleanup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/content/publishing-permissions")) {
        return Response.json({ announcements: false, opportunities: false });
      }
      if (String(input).includes("/requests/options")) {
        return Response.json({ categories: [], departments: [] });
      }
      if (String(input).includes("/opportunities/drafts")) {
        return Response.json({ items: [] });
      }
      return Response.json({ items: [] });
    });
    renderPage();
    expect(
      await screen.findByText("No opportunities are available right now."),
    ).toBeVisible();
  });

  it("lets a publisher reopen an opportunity draft to continue editing", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/content/publishing-permissions")) {
        return Response.json({ announcements: false, opportunities: true });
      }
      if (url.includes("/requests/options")) {
        return Response.json({
          categories: [],
          departments: [{ id: "00000000-0000-4000-8000-000000000101", name: "IT" }],
        });
      }
      if (url.includes("/opportunities/drafts")) {
        return Response.json({ items: [draft] });
      }
      return Response.json({ items: [] });
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", {
      name: "Edit draft: Synthetic saved opportunity draft",
    }));
    expect(screen.getByRole("heading", { name: "Edit opportunity draft" })).toBeVisible();
    expect(screen.getByLabelText("Title")).toHaveValue(
      "Synthetic saved opportunity draft",
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Synthetic draft description with sufficient detail.",
    );
  });
});
