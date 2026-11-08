import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/auth/AuthContext.js";
import {
  fetchGovernanceJson,
  governanceErrorMessage,
  parseGovernanceChangeResult,
  parseGovernanceConfiguration,
  type GovernanceCategory,
  type GovernanceConfiguration,
} from "../app/governance.js";

type ConfigurationSection = "departments" | "categories" | "roles" | "escalation";

interface CategoryForm {
  id?: string;
  name: string;
  description: string;
  defaultDepartmentId: string;
  sensitivityDefault: "standard" | "restricted";
  active: boolean;
}

const emptyCategory: CategoryForm = {
  name: "",
  description: "",
  defaultDepartmentId: "",
  sensitivityDefault: "standard",
  active: true,
};

const sections: { id: ConfigurationSection; label: string }[] = [
  { id: "departments", label: "Departments & Units" },
  { id: "categories", label: "Request Categories & Routing" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "escalation", label: "Escalation" },
];

export function GovernancePage() {
  const { accessToken, user } = useAuth();
  const [configuration, setConfiguration] = useState<GovernanceConfiguration | null>(null);
  const [section, setSection] = useState<ConfigurationSection>("departments");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isCategoryConfirmationOpen, setIsCategoryConfirmationOpen] = useState(false);
  const [deactivation, setDeactivation] = useState<{
    departmentId: string;
    replacementDepartmentId: string;
    confirmed: boolean;
  } | null>(null);
  const [userRoleForm, setUserRoleForm] = useState({
    userId: "",
    roleCode: "employee",
  });
  const [permissionForm, setPermissionForm] = useState({
    roleCode: "employee",
    permissionCode: "",
  });
  const [pendingAccessChange, setPendingAccessChange] = useState<{
    kind: "role" | "permission";
    userId?: string;
    roleCode: string;
    permissionCode?: string;
    granted: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { response, body } = await fetchGovernanceJson(
        "/admin/configuration",
        accessToken,
      );
      const parsed = parseGovernanceConfiguration(body);
      if (!response.ok || !parsed) {
        setError(
          response.status === 403
            ? "You don’t have permission to view this item."
            : "We couldn’t load configuration. Try again.",
        );
        return;
      }
      setConfiguration(parsed);
    } catch {
      setError(
        "We couldn’t load configuration. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function editCategory(category: GovernanceCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      defaultDepartmentId: category.defaultDepartmentId,
      sensitivityDefault: category.sensitivityDefault,
      active: category.active,
    });
    setIsCategoryFormOpen(true);
    setSuccess(null);
    setError(null);
  }

  async function saveCategory() {
    setError(null);
    setSuccess(null);
    try {
      const { response, body } = await fetchGovernanceJson(
        "/admin/configuration/categories",
        accessToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...categoryForm,
            description: categoryForm.description.trim() || null,
          }),
        },
      );
      if (!response.ok) {
        setError(governanceErrorMessage(body, "We couldn’t save settings. Try again."));
        setIsCategoryConfirmationOpen(false);
        return;
      }
    } catch {
      setError("We couldn’t save settings. Check your connection and try again.");
      setIsCategoryConfirmationOpen(false);
      return;
    }
    setIsCategoryConfirmationOpen(false);
    setIsCategoryFormOpen(false);
    setCategoryForm(emptyCategory);
    setSuccess("Settings saved.");
    await load();
  }

  async function deactivateDepartment() {
    if (!deactivation) return;
    setError(null);
    setSuccess(null);
    try {
      const { response, body } = await fetchGovernanceJson(
        `/admin/configuration/departments/${deactivation.departmentId}/deactivate`,
        accessToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            replacementDepartmentId: deactivation.replacementDepartmentId,
          }),
        },
      );
      if (!response.ok) {
        setError(
          governanceErrorMessage(
            body,
            "We couldn’t reassign this department. Try again.",
          ),
        );
        setDeactivation(null);
        return;
      }
    } catch {
      setError(
        "We couldn’t reassign this department. Check your connection and try again.",
      );
      setDeactivation(null);
      return;
    }
    setDeactivation(null);
    setSuccess("Department deactivated and related work reassigned.");
    await load();
  }

  async function saveAccessChange() {
    if (!pendingAccessChange) return;
    const change = pendingAccessChange;
    const path =
      change.kind === "role"
        ? "/admin/configuration/user-roles"
        : "/admin/configuration/role-permissions";
    const body =
      change.kind === "role"
        ? {
            userId: change.userId,
            roleCode: change.roleCode,
            granted: change.granted,
          }
        : {
            roleCode: change.roleCode,
            permissionCode: change.permissionCode,
            granted: change.granted,
          };
    try {
      const { response, body: result } = await fetchGovernanceJson(
        path,
        accessToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok || !parseGovernanceChangeResult(result)) {
        setError(
          governanceErrorMessage(
            result,
            "We couldn’t save this access change. Try again.",
          ),
        );
        setPendingAccessChange(null);
        return;
      }
    } catch {
      setError("We couldn’t save this access change. Check your connection and try again.");
      setPendingAccessChange(null);
      return;
    }
    setPendingAccessChange(null);
    setSuccess("Access settings saved.");
    await load();
  }

  const activeDepartments =
    configuration?.departments.filter((department) => department.status === "active") ?? [];
  const activeUsers =
    configuration?.users.filter((item) => item.status === "active") ?? [];
  const editableRoles =
    configuration?.roles.filter((role) => role.code !== "platform_admin") ?? [];
  const editablePermissions =
    configuration?.permissions.filter(
      (permission) => !["SEC11", "SEC12", "SEC13"].includes(permission.code),
    ) ?? [];

  return (
    <section className="governance-page" aria-labelledby="governance-title">
      <header className="page-heading governance-heading">
        <div>
          <p className="eyebrow">Governance &amp; Oversight</p>
          <h1 id="governance-title">System Configuration &amp; Operational Governance</h1>
          <p>
            Manage the approved pilot departments, request routing and access
            boundaries. Configuration changes are audited.
          </p>
        </div>
        <Link className="button secondary" to="/audit-log">
          Audit Change Ledger
        </Link>
      </header>

      <section className="governance-pilot" aria-label="Pilot configuration scope">
        Pilot scope: IT Operations, Facilities/Maintenance and Administration.
        No additional departments can be activated without approved expansion.
      </section>

      <nav className="governance-tabs" aria-label="Configuration sections">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? "active" : ""}
            aria-pressed={section === item.id}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          {!isLoading && <button type="button" onClick={() => void load()}>Retry</button>}
        </div>
      )}
      {success && <p className="success-message" role="status">{success}</p>}
      {isLoading && <p role="status">Loading configuration…</p>}

      {!isLoading && configuration && section === "departments" && (
        <section className="governance-panel" aria-labelledby="departments-title">
          <h2 id="departments-title">Departments &amp; Units</h2>
          <p>Only the three approved pilot departments are available for routing.</p>
          <div className="governance-table-wrap">
            <table>
              <thead>
                <tr><th>Department</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {configuration.departments.map((department) => (
                  <tr key={department.id}>
                    <td>{department.name}</td>
                    <td>{department.status}</td>
                    <td>
                      {department.status === "active" &&
                      activeDepartments.length > 1 ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            const replacement = activeDepartments.find(
                              (item) => item.id !== department.id,
                            );
                            if (replacement) {
                              setDeactivation({
                                departmentId: department.id,
                                replacementDepartmentId: replacement.id,
                                confirmed: false,
                              });
                            }
                          }}
                        >
                          Deactivate
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && configuration && section === "categories" && (
        <section className="governance-panel" aria-labelledby="categories-title">
          <div className="governance-panel-heading">
            <div>
              <h2 id="categories-title">Request Categories &amp; Routing</h2>
              <p>Each active category routes to an active pilot department.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategoryForm({
                  ...emptyCategory,
                  defaultDepartmentId: activeDepartments[0]?.id ?? "",
                });
                setIsCategoryFormOpen(true);
              }}
            >
              Add Request Category
            </button>
          </div>
          <div className="governance-table-wrap">
            <table>
              <thead>
                <tr><th>Category</th><th>Default destination</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {configuration.categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>
                      {configuration.departments.find(
                        (department) => department.id === category.defaultDepartmentId,
                      )?.name ?? "Unavailable"}
                    </td>
                    <td>{category.active ? "Active" : "Inactive"}</td>
                    <td>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => editCategory(category)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {configuration.categories.length === 0 && (
                  <tr><td colSpan={4}>No request categories are configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {isCategoryFormOpen && (
            <form
              className="governance-form"
              onSubmit={(event) => {
                event.preventDefault();
                setIsCategoryConfirmationOpen(true);
              }}
            >
              <h3>{categoryForm.id ? "Edit request category" : "New request category"}</h3>
              <label>
                Name
                <input
                  required
                  maxLength={120}
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm({ ...categoryForm, name: event.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={1000}
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm({ ...categoryForm, description: event.target.value })
                  }
                />
              </label>
              <label>
                Default routing destination
                <select
                  required
                  value={categoryForm.defaultDepartmentId}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      defaultDepartmentId: event.target.value,
                    })
                  }
                >
                  {activeDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sensitivity default
                <select
                  value={categoryForm.sensitivityDefault}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      sensitivityDefault: event.target.value as "standard" | "restricted",
                    })
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="restricted">Restricted</option>
                </select>
              </label>
              <label className="governance-checkbox">
                <input
                  type="checkbox"
                  checked={categoryForm.active}
                  onChange={(event) =>
                    setCategoryForm({ ...categoryForm, active: event.target.checked })
                  }
                />
                Active
              </label>
              <div className="governance-actions">
                <button type="submit">Save Settings</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsCategoryFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {!isLoading && configuration && section === "roles" && (
        <section className="governance-panel" aria-labelledby="roles-title">
          <h2 id="roles-title">Roles &amp; Permissions</h2>
          <p role="note">
            Administrator grants and sensitive permission changes remain blocked
            until the institution names the designated second approvers (Q11).
          </p>
          <div className="governance-table-wrap">
            <table>
              <thead>
                <tr><th>Role</th><th>Permission</th><th>Description</th></tr>
              </thead>
              <tbody>
                {configuration.rolePermissions.map((permission) => (
                  <tr key={`${permission.roleCode}-${permission.permissionCode}`}>
                    <td>{configuration.roles.find((role) => role.code === permission.roleCode)?.displayName ?? permission.roleCode}</td>
                    <td>{permission.permissionCode}</td>
                    <td>{permission.description}</td>
                  </tr>
                ))}
                {configuration.rolePermissions.length === 0 && (
                  <tr><td colSpan={3}>Role permission details are not available to this account.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="governance-access-editor">
            <form
              className="governance-form"
              onSubmit={(event) => {
                event.preventDefault();
                setPendingAccessChange({
                  kind: "role",
                  userId: userRoleForm.userId,
                  roleCode: userRoleForm.roleCode,
                  granted: true,
                });
              }}
            >
              <h3>Assign a role</h3>
              <label>
                Active staff member
                <select
                  required
                  value={userRoleForm.userId}
                  onChange={(event) =>
                    setUserRoleForm({ ...userRoleForm, userId: event.target.value })
                  }
                >
                  <option value="">Choose staff member</option>
                  {activeUsers
                    .filter((item) => item.id !== user?.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}{item.department ? ` — ${item.department}` : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Role
                <select
                  value={userRoleForm.roleCode}
                  onChange={(event) =>
                    setUserRoleForm({ ...userRoleForm, roleCode: event.target.value })
                  }
                >
                  {editableRoles.map((role) => (
                    <option key={role.code} value={role.code}>{role.displayName}</option>
                  ))}
                </select>
              </label>
              <div className="governance-actions">
                <button type="submit" disabled={!userRoleForm.userId}>Grant Role</button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!userRoleForm.userId}
                  onClick={() =>
                    setPendingAccessChange({
                      kind: "role",
                      userId: userRoleForm.userId,
                      roleCode: userRoleForm.roleCode,
                      granted: false,
                    })
                  }
                >
                  Remove Role
                </button>
              </div>
            </form>

            <form
              className="governance-form"
              onSubmit={(event) => {
                event.preventDefault();
                setPendingAccessChange({
                  kind: "permission",
                  roleCode: permissionForm.roleCode,
                  permissionCode: permissionForm.permissionCode,
                  granted: true,
                });
              }}
            >
              <h3>Change role permission</h3>
              <label>
                Role
                <select
                  value={permissionForm.roleCode}
                  onChange={(event) =>
                    setPermissionForm({ ...permissionForm, roleCode: event.target.value })
                  }
                >
                  {editableRoles.map((role) => (
                    <option key={role.code} value={role.code}>{role.displayName}</option>
                  ))}
                </select>
              </label>
              <label>
                Permission
                <select
                  required
                  value={permissionForm.permissionCode}
                  onChange={(event) =>
                    setPermissionForm({
                      ...permissionForm,
                      permissionCode: event.target.value,
                    })
                  }
                >
                  <option value="">Choose permission</option>
                  {editablePermissions.map((permission) => (
                    <option key={permission.code} value={permission.code}>
                      {permission.code} — {permission.description}
                    </option>
                  ))}
                </select>
              </label>
              <div className="governance-actions">
                <button
                  type="submit"
                  disabled={!permissionForm.permissionCode}
                >
                  Grant Permission
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!permissionForm.permissionCode}
                  onClick={() =>
                    setPendingAccessChange({
                      kind: "permission",
                      roleCode: permissionForm.roleCode,
                      permissionCode: permissionForm.permissionCode,
                      granted: false,
                    })
                  }
                >
                  Remove Permission
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {!isLoading && configuration && section === "escalation" && (
        <section className="governance-panel" aria-labelledby="escalation-title">
          <h2 id="escalation-title">Escalation Path</h2>
          <p>
            The approved third-flag escalation trigger is active. Recipient,
            fallback and reminder configuration remains disabled until the
            institution approves those rules (Q5).
          </p>
          <dl className="governance-summary">
            <div><dt>Trigger</dt><dd>{configuration.escalation.trigger.replace("_", " ")}</dd></div>
            <div><dt>Recipient configuration</dt><dd>Disabled pending approval</dd></div>
          </dl>
        </section>
      )}

      {deactivation && configuration && (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivation-title"
          >
            <h2 id="deactivation-title">Reassign and deactivate department?</h2>
            <p>
              Open requests, category routing, staff and manager assignments will
              move to the selected active pilot department. Every change is audited.
            </p>
            <label>
              Replacement department
              <select
                value={deactivation.replacementDepartmentId}
                onChange={(event) =>
                  setDeactivation({
                    ...deactivation,
                    replacementDepartmentId: event.target.value,
                  })
                }
              >
                {activeDepartments
                  .filter((department) => department.id !== deactivation.departmentId)
                  .map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="governance-actions">
              <button
                type="button"
                onClick={() => {
                  if (deactivation.confirmed) {
                    void deactivateDepartment();
                  } else {
                    setDeactivation({ ...deactivation, confirmed: true });
                  }
                }}
              >
                {deactivation.confirmed ? "Confirm Reassignment" : "Review Impact"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setDeactivation(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
      {isCategoryConfirmationOpen && (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-confirmation-title"
          >
            <h2 id="category-confirmation-title">Confirm configuration change</h2>
            <p>
              Saving this category may change request routing or sensitivity.
              The change will be recorded in the audit log.
            </p>
            <div className="governance-actions">
              <button type="button" onClick={() => void saveCategory()}>
                Confirm and Save
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsCategoryConfirmationOpen(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
      {pendingAccessChange && (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-change-title"
          >
            <h2 id="access-change-title">Confirm access change</h2>
            <p>
              This audited change will {pendingAccessChange.granted ? "grant" : "remove"}{" "}
              {pendingAccessChange.kind === "role"
                ? `the ${pendingAccessChange.roleCode} role`
                : `${pendingAccessChange.permissionCode} permission for the ${pendingAccessChange.roleCode} role`}.
              Administrator access and sensitive permissions remain unavailable
              until the second-approver process is approved.
            </p>
            <div className="governance-actions">
              <button type="button" onClick={() => void saveAccessChange()}>
                Confirm Change
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setPendingAccessChange(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
