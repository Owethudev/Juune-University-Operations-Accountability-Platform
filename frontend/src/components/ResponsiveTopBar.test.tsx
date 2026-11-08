import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ResponsiveTopBar } from "./ResponsiveTopBar.js";

describe("ResponsiveTopBar", () => {
  it("T-C-1 renders the page title, notifications and profile access", () => {
    render(
      <MemoryRouter>
        <ResponsiveTopBar
          pageTitle="Home"
          unreadCount={2}
          user={{ name: "Synthetic Employee" }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /notifications.*2/i }),
    ).toBeDisabled();
    expect(screen.getByRole("link", { name: /profile/i })).toBeVisible();
  });
});
