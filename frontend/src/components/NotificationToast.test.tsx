import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationToast } from "./NotificationToast.js";

describe("NotificationToast", () => {
  it("T-C-5 announces success feedback", () => {
    render(<NotificationToast message="Request submitted." variant="success" />);

    expect(screen.getByRole("status")).toHaveTextContent("Request submitted.");
  });

  it("T-C-5 also renders persistent errors inline", () => {
    render(
      <NotificationToast
        message="Something went wrong. Please try again."
        variant="error"
        persistent
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(screen.getByText("Something went wrong. Please try again.")).toBeVisible();
  });
});
