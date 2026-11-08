import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "../app/auth/AuthContext.js";
import { AnnouncementsPage } from "./AnnouncementsPage.js";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000201",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};
const announcement = {
  id: "00000000-0000-4000-8000-000000000702",
  title: "Synthetic published announcement",
  body: "Synthetic published content for audience policy tests.",
  publisherName: "Synthetic Publisher",
  publishedAt: "2026-11-08T10:00:00.000Z",
  expiresAt: null,
  audienceDepartmentNames: ["IT"],
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
        <AnnouncementsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function mockAnnouncementFetch({
  items = [announcement],
  canPublish = false,
  drafts = [],
}: {
  items?: typeof announcement[];
  canPublish?: boolean;
  drafts?: {
    id: string;
    title: string;
    body: string;
    expiresAt: string | null;
    audienceDepartmentIds: string[];
  }[];
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const url = String(input);
    if (url.includes("/content/publishing-permissions")) {
      return Response.json({ announcements: canPublish, opportunities: false });
    }
    if (url.includes("/requests/options")) {
      return Response.json({
        categories: [],
        departments: [{ id: "00000000-0000-4000-8000-000000000101", name: "IT" }],
      });
    }
    if (url.includes("/announcements/drafts")) {
      return Response.json({ items: drafts });
    }
    if (url.includes("/publish")) {
      return Response.json({
        id: "00000000-0000-4000-8000-000000000701",
        title: "Synthetic campus notice",
        state: "published",
      });
    }
    if (url.includes("/announcements/")) {
      return Response.json({ item: announcement });
    }
    if (url.includes("/announcements")) {
      if (options?.method === "POST" || options?.method === "PATCH") {
        return Response.json({
          id: "00000000-0000-4000-8000-000000000701",
          title: "Synthetic campus notice",
          state: "draft",
        });
      }
      return Response.json({ items });
    }
    return Response.json({}, { status: 404 });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("S6 Announcements", () => {
  it("shows loading, audience-scoped feed details, and the approved empty state", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).includes("/content/publishing-permissions")) {
        return Promise.resolve(
          Response.json({ announcements: false, opportunities: false }),
        );
      }
      if (String(input).includes("/requests/options")) {
        return Promise.resolve(Response.json({ categories: [], departments: [] }));
      }
      if (String(input).includes("/announcements/drafts")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return new Promise((resolve) => {
        finishRequest = resolve;
      });
    });
    const mounted = renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading announcements…",
    );
    finishRequest?.(Response.json({ items: [announcement] }));
    expect(
      await screen.findByRole("heading", {
        name: "Synthetic published announcement",
      }),
    ).toBeVisible();
    expect(screen.getByText("Synthetic Publisher")).toBeVisible();
    expect(screen.getByText("Audience: IT")).toBeVisible();
    expect(screen.queryByText(/comments|discussion/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Read announcement: Synthetic published announcement",
      }),
    );
    expect(
      await screen.findByText("Synthetic published content for audience policy tests."),
    ).toBeVisible();

    mounted.unmount();
    mockAnnouncementFetch({ items: [] });
    renderPage();
    expect(
      await screen.findByText("There are no announcements for this audience yet."),
    ).toBeVisible();
  });

  it("requires explicit confirmation before publishing and denies publisher controls when unauthorized", async () => {
    const fetchSpy = mockAnnouncementFetch({ canPublish: true });
    const mounted = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Create announcement" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Synthetic campus notice" },
    });
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "Synthetic announcement details for the audience feed." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review and publish" }));

    expect(screen.getByRole("dialog", { name: "Confirm publication" })).toBeVisible();
    expect(fetchSpy.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and publish" }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/announcements"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    mounted.unmount();
    mockAnnouncementFetch({ canPublish: false });
    renderPage();
    await screen.findByRole("heading", {
      name: "Synthetic published announcement",
    });
    expect(
      screen.queryByRole("button", { name: "Create announcement" }),
    ).not.toBeInTheDocument();
  });

  it("allows an authorized publisher to reopen a saved draft for editing", async () => {
    mockAnnouncementFetch({
      canPublish: true,
      drafts: [
        {
          id: "00000000-0000-4000-8000-000000000703",
          title: "Synthetic saved draft",
          body: "Synthetic draft body with enough detail.",
          expiresAt: null,
          audienceDepartmentIds: [],
        },
      ],
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", {
      name: "Edit draft: Synthetic saved draft",
    }));
    expect(screen.getByRole("heading", { name: "Edit announcement draft" })).toBeVisible();
    expect(screen.getByLabelText("Title")).toHaveValue("Synthetic saved draft");
    expect(screen.getByLabelText("Body")).toHaveValue(
      "Synthetic draft body with enough detail.",
    );
  });
});
