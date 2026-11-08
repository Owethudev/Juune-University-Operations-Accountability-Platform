import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField.js";

describe("FormField", () => {
  it("T-C-9 associates its label, hint and validation error with the control", () => {
    render(
      <FormField
        id="display-name"
        label="Display name"
        hint="Shown to authorised colleagues."
        error="Enter a display name."
      >
        <input id="display-name" />
      </FormField>,
    );

    const input = screen.getByRole("textbox", { name: "Display name" });
    expect(input).toHaveAccessibleDescription(
      "Shown to authorised colleagues. Enter a display name.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a display name.");
  });
});
