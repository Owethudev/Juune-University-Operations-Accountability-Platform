import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../app/auth/AuthContext.js";
import {
  fetchGovernanceJson,
  parseAuditEvents,
  type AuditEvent,
} from "../app/governance.js";

interface AuditForm {
  from: string;
  to: string;
  actorId: string;
  action: string;
  targetId: string;
}

const emptyFilters: AuditForm = {
  from: "",
  to: "",
  actorId: "",
  action: "",
  targetId: "",
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuditLogPage() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(appliedFilters)) {
        if (value) query.set(key, value);
      }
      query.set("page", String(page));
      const { response, body } = await fetchGovernanceJson(
        `/audit-events${query.size ? `?${query.toString()}` : ""}`,
        accessToken,
      );
      const parsed = parseAuditEvents(body);
      if (!response.ok || !parsed) {
        setItems([]);
        setError(
          response.status === 403
            ? "You don’t have permission to view this item."
            : "We couldn’t load audit events. Try again.",
        );
        return;
      }
      setItems(parsed);
    } catch {
      setItems([]);
      setError("We couldn’t load audit events. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, appliedFilters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  return (
    <section className="audit-page" aria-labelledby="audit-title">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Governance &amp; Oversight</p>
          <h1 id="audit-title">Audit Log</h1>
          <p>Read-only record of permitted security and operational changes.</p>
        </div>
      </header>
      <form className="audit-filters" onSubmit={applyFilters}>
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
        <label>
          Actor ID
          <input
            maxLength={36}
            value={filters.actorId}
            onChange={(event) => setFilters({ ...filters, actorId: event.target.value })}
          />
        </label>
        <label>
          Action
          <input
            maxLength={120}
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value })}
          />
        </label>
        <label>
          Record reference
          <input
            maxLength={120}
            value={filters.targetId}
            onChange={(event) => setFilters({ ...filters, targetId: event.target.value })}
          />
        </label>
        <div className="audit-filter-actions">
          <button type="submit">Apply Filters</button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setFilters(emptyFilters);
              setPage(1);
              setAppliedFilters(emptyFilters);
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          {!isLoading && <button type="button" onClick={() => void load()}>Retry</button>}
        </div>
      )}
      {isLoading && <p role="status">Loading audit events…</p>}
      {!isLoading && !error && items.length === 0 && (
        <p className="empty-state">No audit events match these filters.</p>
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className="governance-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date &amp; time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Record</th>
                <th>Outcome</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatTimestamp(item.createdAt)}</td>
                  <td>{item.actorName}</td>
                  <td>{item.action}</td>
                  <td>{item.targetType}</td>
                  <td>{item.outcome}</td>
                  <td>
                    <details>
                      <summary>View record reference</summary>
                      <span>Actor ID: {item.actorId ?? "System"}</span>
                      <code>{item.targetId}</code>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="audit-filter-actions" aria-label="Audit pagination">
            <button
              type="button"
              className="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              className="secondary"
              disabled={items.length < 25}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
