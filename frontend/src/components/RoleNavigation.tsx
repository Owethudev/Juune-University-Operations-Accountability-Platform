import { Link, NavLink } from "react-router-dom";
import type { UserRole } from "../app/auth/AuthContext.js";

export interface NavigationItem {
  label: string;
  to: string;
  roles: readonly UserRole[];
}

const phaseOneNavigation: NavigationItem[] = [
  {
    label: "Home",
    to: "/",
    roles: ["employee", "department_manager", "senior_leadership", "platform_admin"],
  },
  {
    label: "New Request",
    to: "/requests/new",
    roles: ["employee"],
  },
  {
    label: "Profile & Settings",
    to: "/profile",
    roles: ["employee", "department_manager", "senior_leadership", "platform_admin"],
  },
];

export function RoleNavigation({
  role,
  items = phaseOneNavigation,
}: {
  role: UserRole;
  items?: NavigationItem[];
}) {
  const visibleItems = items.filter((item) => item.roles.includes(role));

  return (
    <nav className="workspace-navigation" aria-label="Workspace">
      <Link className="brand" to="/" aria-label="Juune home">
        <span className="brand-mark" aria-hidden="true">
          J
        </span>
        <span>Juune</span>
      </Link>
      <div className="navigation-links">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "navigation-link active" : "navigation-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
