import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState.js";

describe("LoadingState", () => {
  it("T-C-10 labels loading progress for assistive technology", () => {
    render(<LoadingState label="Loading profile" />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
