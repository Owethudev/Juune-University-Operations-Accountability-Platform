import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfflineBanner } from "./OfflineBanner.js";

describe("OfflineBanner", () => {
  it("T-C-8 uses the approved offline copy without claiming work was saved", () => {
    render(<OfflineBanner />);

    expect(
      screen.getByRole("status", {
        name: "You’re offline. Reconnect to load the latest information.",
      }),
    ).toBeVisible();
    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });
});
