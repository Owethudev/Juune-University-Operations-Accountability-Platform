import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RoleNavigation } from "./RoleNavigation.js";

const items = [
  {
    label: "Home",
    to: "/",
    roles: ["employee", "platform_admin"] as const,
  },
  {
    label: "Profile & Settings",
    to: "/profile",
    roles: ["employee", "platform_admin"] as const,
  },
  {
    label: "Admin Console",
    to: "/admin",
    roles: ["platform_admin"] as const,
  },
  {
    label: "Audit Log",
    to: "/admin/audit",
    roles: ["platform_admin"] as const,
  },
];

describe("RoleNavigation", () => {
  it("T-C-2 exposes links available to the current role only", () => {
    render(
      <MemoryRouter>
        <RoleNavigation role="employee" items={[...items]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Profile & Settings" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Admin Console" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Audit Log" })).not.toBeInTheDocument();
  });

  it("shows administrator links only for platform administrators", () => {
    render(
      <MemoryRouter>
        <RoleNavigation role="platform_admin" items={[...items]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Admin Console" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Audit Log" })).toBeVisible();
  });
});
