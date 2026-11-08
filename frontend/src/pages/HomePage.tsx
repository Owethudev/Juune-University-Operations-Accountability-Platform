import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, type SessionUser } from "../app/auth/AuthContext.js";
import { apiBaseUrl, bearerHeaders, isRecord, responseJson } from "../app/api.js";

type RequestStatus =
  | "submitted"
  | "acknowledged"
  | "in_progress"
  | "waiting_for_requester"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

interface DashboardRow {
  departmentId: string;
  departmentName: string;
  status: RequestStatus;
  requestCount: number;
  assignedCount: number;
}

interface DashboardRecentRequest {
  id: string;
  reference: string;
  departmentName: string;
  status: RequestStatus;
  updatedAt: string;
}

interface DashboardFilters {
  departmentId: string;
  status: string;
  from: string;
  to: string;
}

const emptyFilters: DashboardFilters = {
  departmentId: "",
  status: "",
  from: "",
  to: "",
};

const statuses: { value: RequestStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_for_requester", label: "Waiting for requester" },
  { value: "on_hold", label: "On hold" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

function isRequestStatus(value: unknown): value is RequestStatus {
  return statuses.some((status) => status.value === value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function parseDashboard(
  value: unknown,
): { rows: DashboardRow[]; recentRequests: DashboardRecentRequest[] } | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.rows) ||
    !Array.isArray(value.recentRequests)
  ) {
    return null;
  }
  const rows: DashboardRow[] = [];
  for (const candidate of value.rows) {
    if (
      !isRecord(candidate) ||
      typeof candidate.departmentId !== "string" ||
      typeof candidate.departmentName !== "string" ||
      !isRequestStatus(candidate.status) ||
      !isNonNegativeInteger(candidate.requestCount) ||
      !isNonNegativeInteger(candidate.assignedCount) ||
      candidate.assignedCount > candidate.requestCount
    ) {
      return null;
    }
    rows.push({
      departmentId: candidate.departmentId,
      departmentName: candidate.departmentName,
      status: candidate.status,
      requestCount: candidate.requestCount,
      assignedCount: candidate.assignedCount,
    });
  }
  const recentRequests: DashboardRecentRequest[] = [];
  for (const candidate of value.recentRequests) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.reference !== "string" ||
      typeof candidate.departmentName !== "string" ||
      !isRequestStatus(candidate.status) ||
      typeof candidate.updatedAt !== "string" ||
      Number.isNaN(Date.parse(candidate.updatedAt))
    ) {
      return null;
    }
    recentRequests.push({
      id: candidate.id,
      reference: candidate.reference,
      departmentName: candidate.departmentName,
      status: candidate.status,
      updatedAt: candidate.updatedAt,
    });
  }
  return { rows, recentRequests };
}

function statusLabel(status: RequestStatus): string {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HomePage({ user }: { user: SessionUser }) {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [recentRequests, setRecentRequests] = useState<
    DashboardRecentRequest[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<DashboardFilters>(emptyFilters);
  const [filterError, setFilterError] = useState("");
  const [loading, setLoading] = useState(
    user.role === "department_manager" || user.role === "senior_leadership",
  );
  const [loadError, setLoadError] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(appliedFilters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [appliedFilters]);

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError(false);
      try {
        const response = await fetch(
          `${apiBaseUrl()}/dashboard${query ? `?${query}` : ""}`,
          { headers: bearerHeaders(accessToken), signal },
        );
        if (!response.ok) {
          if (!signal?.aborted) setLoadError(true);
          return;
        }
        const parsed = parseDashboard(await responseJson(response));
        if (!parsed) {
          if (!signal?.aborted) setLoadError(true);
          return;
        }
        if (!signal?.aborted) {
          setRows(parsed.rows);
          setRecentRequests(parsed.recentRequests);
          setDepartments((current) => {
            const next = new Map(current.map((item) => [item.id, item.name]));
            for (const row of parsed.rows) {
              next.set(row.departmentId, row.departmentName);
            }
            return [...next].map(([id, name]) => ({ id, name }));
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!signal?.aborted) setLoadError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, query],
  );

  useEffect(() => {
    if (user.role !== "department_manager" && user.role !== "senior_leadership") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, user.role]);

  function applyFilters() {
    if (filters.from && filters.to && filters.from > filters.to) {
      setFilterError("Choose a start date on or before the end date.");
      return;
    }
    setFilterError("");
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilterError("");
  }

  if (loading) {
    return <section className="tracking-panel"><p role="status">Loading your dashboard…</p></section>;
  }

  if (loadError) {
    return (
      <section className="tracking-panel request-error-panel">
        <p role="alert">We couldn’t load your dashboard. Try again.</p>
        <button className="button button-secondary" type="button" onClick={() => void loadDashboard()}>
          Try again
        </button>
      </section>
    );
  }

  if (user.role !== "department_manager" && user.role !== "senior_leadership") {
    return (
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <p className="eyebrow">Your workspace</p>
        <h2 id="welcome-title">Welcome, {user.name}</h2>
        <p>Your role and access are managed by your institution.</p>
        {user.role === "employee" && (
          <Link className="button button-primary" to="/requests/new">
            New Request
          </Link>
        )}
      </section>
    );
  }

  const total = rows.reduce((sum, row) => sum + row.requestCount, 0);
  const outstanding = rows.reduce(
    (sum, row) =>
      sum + (row.status === "resolved" || row.status === "closed" ? 0 : row.requestCount),
    0,
  );
  const assigned = rows.reduce((sum, row) => sum + row.assignedCount, 0);
  const hasFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <div className="dashboard-page">
      <section className="tracking-intro">
        <p className="eyebrow">Operational overview</p>
        <h2>{user.role === "senior_leadership" ? "Institution dashboard" : "Department dashboard"}</h2>
        <p>Counts include standard-sensitivity requests within your authorised scope.</p>
        <p className="read-only-note">
          Date filters use the request creation date and include both selected dates. Overdue and resolution-trend reporting is withheld until the institution approves its thresholds and metric windows.
        </p>
        <Link className="button button-primary" to="/requests">View request queue</Link>
      </section>

      <section className="dashboard-filters tracking-filters" aria-label="Dashboard filters">
        <div className="dashboard-filter-grid">
          <label>
            Department
            <select
              value={filters.departmentId}
              onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}
            >
              <option value="">All permitted departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </label>
        </div>
        {filterError && <p className="request-error" role="alert">{filterError}</p>}
        <div className="request-form-actions">
          <button className="button button-primary" type="button" onClick={applyFilters}>Apply filters</button>
          <button className="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="tracking-panel">
          <p className="read-only-note">
            {hasFilters ? "No dashboard results match these filters." : "Nothing needs your attention right now."}
          </p>
        </section>
      ) : (
        <>
          <section className="dashboard-metrics" aria-label="Operational request summary">
            <article className="dashboard-metric">
              <h3>Outstanding requests</h3>
              <p>{outstanding}</p>
            </article>
            <article className="dashboard-metric">
              <h3>Requests with an assignee</h3>
              <p>{assigned}</p>
            </article>
            <article className="dashboard-metric">
              <h3>Requests shown</h3>
              <p>{total}</p>
            </article>
          </section>
          <section className="tracking-results" aria-labelledby="dashboard-table-title">
            <div className="section-heading">
              <h2 id="dashboard-table-title">Requests by department and status</h2>
            </div>
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr><th scope="col">Department</th><th scope="col">Status</th><th scope="col">Requests</th><th scope="col">Assigned</th><th scope="col">Queue</th></tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const params = new URLSearchParams({
                      departmentId: row.departmentId,
                      status: row.status,
                    });
                    return (
                      <tr key={`${row.departmentId}-${row.status}`}>
                        <th scope="row">{row.departmentName}</th>
                        <td>{statusLabel(row.status)}</td>
                        <td>{row.requestCount}</td>
                        <td>{row.assignedCount}</td>
                        <td><Link to={`/requests?${params}`}>View requests</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="tracking-panel" aria-labelledby="dashboard-recent-title">
            <div className="section-heading">
              <h2 id="dashboard-recent-title">Recent requests you can access</h2>
            </div>
            {recentRequests.length === 0 ? (
              <p className="read-only-note">No recent requests are available in this scope.</p>
            ) : (
              <ol className="dashboard-recent-list">
                {recentRequests.map((item) => (
                  <li key={item.id}>
                    <div>
                      <Link to={`/requests/${item.id}`}>{item.reference}</Link>
                      <p>{item.departmentName} · {statusLabel(item.status)}</p>
                    </div>
                    <time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
