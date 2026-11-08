import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "../app/auth/AuthContext.js";
import { RequestsPage } from "./RequestsPage.js";

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
const page = {
  items: [
    {
      id: "00000000-0000-4000-8000-000000000401",
      reference: "JU-ABCDEFGH",
      summary: "A synthetic request",
      categoryId: "00000000-0000-4000-8000-000000000301",
      categoryName: "IT support",
      departmentId: "00000000-0000-4000-8000-000000000101",
      departmentName: "IT",
      status: "in_progress",
      updatedAt: "2026-11-08T12:30:00.000Z",
    },
  ],
  page: 1,
  pageSize: 10,
  total: 21,
};
const options = {
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      name: "IT support",
      defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
      sensitivityDefault: "standard",
    },
  ],
  departments: [
    { id: "00000000-0000-4000-8000-000000000101", name: "IT" },
    { id: "00000000-0000-4000-8000-000000000102", name: "Facilities/Maintenance" },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authState}>
        <RequestsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("S3 My Requests / Request Queue", () => {
  it("shows loading and empty states without inventing request content", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).includes("/requests/options")) {
        return Promise.resolve(Response.json(options));
      }
      return new Promise((resolve) => {
        finishRequest = resolve;
      });
    });
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Loading requests…");
    finishRequest?.(
      Response.json({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    expect(
      await screen.findByText("No requests match these filters."),
    ).toBeVisible();
  });

  it("renders a scoped request row and applies filters, pagination, and clear", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json(options))
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json(page));
    renderPage();

    expect(await screen.findByText("JU-ABCDEFGH")).toBeVisible();
    expect(screen.getByText("A synthetic request")).toBeVisible();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search requests" }), {
      target: { value: "JU-ABCD" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    expect(String(fetchSpy.mock.calls[2]?.[0])).toContain("search=JU-ABCD");
    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
    expect(String(fetchSpy.mock.calls[3]?.[0])).toContain("page=2");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(5));
    expect(String(fetchSpy.mock.calls[4]?.[0])).not.toContain("search=");
  });

  it("loads request options for category and department filters", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json(options));
    renderPage();

    await screen.findByText("JU-ABCDEFGH");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("option", { name: "IT support" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Facilities/Maintenance" }),
    ).toBeInTheDocument();
  });

  it("shows a retry action when requests cannot be loaded", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json(options))
      .mockResolvedValueOnce(Response.json(page));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t load requests. Try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("JU-ABCDEFGH")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
