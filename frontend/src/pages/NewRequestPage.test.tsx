import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, type SessionUser } from "../app/auth/AuthContext.js";
import { NewRequestPage, RequestDetailPage } from "./NewRequestPage.js";

const user: SessionUser = {
  id: "00000000-0000-4000-8000-000000000201",
  name: "Synthetic Employee",
  email: "employee@example.invalid",
  department: "IT",
  role: "employee",
};

const options = {
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      name: "IT support",
      defaultDepartmentId: "00000000-0000-4000-8000-000000000101",
    },
  ],
  departments: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      name: "IT",
    },
  ],
};

const created = {
  id: "00000000-0000-4000-8000-000000000401",
  reference: "JU-ABCDEFGH",
  categoryId: options.categories[0]!.id,
  departmentId: options.departments[0]!.id,
  summary: "A synthetic IT request",
  description: "A synthetic description for this test request.",
  status: "submitted",
  createdAt: "2026-11-08T12:00:00.000Z",
  replayed: false,
};

const authState: AuthState = {
  status: "authenticated",
  user,
  accessToken: "synthetic-verified-token",
  signOut: async () => undefined,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/requests/new"]}>
      <AuthContext.Provider value={authState}>
        <Routes>
          <Route path="/requests/new" element={<NewRequestPage />} />
          <Route
            path="/requests/:requestId"
            element={<RequestDetailPage />}
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

async function fillValidRequest() {
  await screen.findByRole("option", { name: "IT support" });
  fireEvent.change(screen.getByRole("combobox", { name: "Category" }), {
    target: { value: options.categories[0]!.id },
  });
  fireEvent.change(
    screen.getByRole("combobox", { name: "Destination department" }),
    { target: { value: options.departments[0]!.id } },
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Summary" }), {
    target: { value: created.summary },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
    target: { value: created.description },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("S5 New Request", () => {
  it("shows loading and empty request-option states", async () => {
    let finishOptionsRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOptionsRequest = resolve;
        }),
    );
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading request categories…",
    );
    finishOptionsRequest?.(
      Response.json({ categories: [], departments: [] }, { status: 200 }),
    );

    expect(
      await screen.findByText(
        "No active request categories or destination departments are available.",
      ),
    ).toBeVisible();
  });

  it("shows an options error and allows retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json(options, { status: 200 }));
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Request options unavailable" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("option", { name: "IT support" })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("blocks submission while offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(options, { status: 200 }),
    );
    renderPage();
    await screen.findByRole("option", { name: "IT support" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You’re offline. Reconnect before submitting your request.",
    );
    expect(
      screen.getByRole("button", { name: "Submit Request" }),
    ).toBeDisabled();
  });

  it("T-C-9 and T-US1-2 show accessible exact field guidance without submitting invalid data", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(options, { status: 200 }));
    renderPage();
    await screen.findByRole("option", { name: "IT support" });

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(await screen.findAllByRole("alert")).toHaveLength(4);
    expect(screen.getByText("Choose a category.")).toBeVisible();
    expect(screen.getByText("Choose a destination department.")).toBeVisible();
    expect(screen.getByText("Enter a short summary.")).toBeVisible();
    expect(screen.getByText("Enter a description.")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/evidence|attachment|upload/i)).not.toBeInTheDocument();
  });

  it("T-US1-1 and T-US1-3 confirm creation and open the submitted request detail", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(options, { status: 200 }))
      .mockResolvedValueOnce(Response.json(created, { status: 201 }));
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000501",
    );
    renderPage();
    await fillValidRequest();

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(await screen.findByText("Request submitted.")).toBeVisible();
    expect(screen.getByText("JU-ABCDEFGH")).toBeVisible();
    const [, submitOptions] = fetchSpy.mock.calls[1]!;
    expect(submitOptions?.method).toBe("POST");
    expect(new Headers(submitOptions?.headers).get("Idempotency-Key")).toBe(
      "00000000-0000-4000-8000-000000000501",
    );
    expect(new Headers(submitOptions?.headers).get("Authorization")).toBe(
      "Bearer synthetic-verified-token",
    );

    fireEvent.click(screen.getByRole("link", { name: "View request" }));
    expect(
      await screen.findByRole("heading", { name: "Request JU-ABCDEFGH" }),
    ).toBeVisible();
    expect(screen.getByText("A synthetic IT request")).toBeVisible();
    expect(screen.getByText("Submitted")).toBeVisible();
  });

  it("T-EDGE-3 retains request details and reuses the idempotency key after a network error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(options, { status: 200 }))
      .mockRejectedValueOnce(new TypeError("Network unavailable."))
      .mockResolvedValueOnce(
        Response.json({ ...created, replayed: true }, { status: 200 }),
      );
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000502",
    );
    renderPage();
    await fillValidRequest();

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t submit your request. Your details are still here; try again.",
    );
    expect(screen.getByRole("textbox", { name: "Summary" })).toHaveValue(
      created.summary,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Request submitted.");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    const firstKey = new Headers(fetchSpy.mock.calls[1]?.[1]?.headers).get(
      "Idempotency-Key",
    );
    const retryKey = new Headers(fetchSpy.mock.calls[2]?.[1]?.headers).get(
      "Idempotency-Key",
    );
    expect(firstKey).toBe("00000000-0000-4000-8000-000000000502");
    expect(retryKey).toBe(firstKey);
  });
});
