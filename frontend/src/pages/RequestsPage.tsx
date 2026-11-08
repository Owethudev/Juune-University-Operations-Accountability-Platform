import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth/AuthContext.js";
import { apiBaseUrl, bearerHeaders, isRecord, responseJson } from "../app/api.js";
import { FormField } from "../components/FormField.js";

type RequestStatus =
  | "submitted"
  | "acknowledged"
  | "in_progress"
  | "waiting_for_requester"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

interface RequestListItem {
  id: string;
  reference: string;
  summary: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  departmentName: string;
  status: RequestStatus;
  updatedAt: string;
}

interface RequestListPageData {
  items: RequestListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface FilterOptions {
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

interface RequestFilters {
  search: string;
  status: string;
  categoryId: string;
  departmentId: string;
  from: string;
  to: string;
}

const emptyFilters: RequestFilters = {
  search: "",
  status: "",
  categoryId: "",
  departmentId: "",
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
  { value: "reopened", label: "Reopened" },
  { value: "closed", label: "Closed" },
];

function parseList(value: unknown): RequestListPageData | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize) ||
    !Number.isInteger(value.total)
  ) {
    return null;
  }
  const items: RequestListItem[] = [];
  for (const candidate of value.items) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.reference !== "string" ||
      typeof candidate.summary !== "string" ||
      typeof candidate.categoryId !== "string" ||
      typeof candidate.categoryName !== "string" ||
      typeof candidate.departmentId !== "string" ||
      typeof candidate.departmentName !== "string" ||
      typeof candidate.status !== "string" ||
      typeof candidate.updatedAt !== "string"
    ) {
      return null;
    }
    const status = statuses.find(
      (candidateStatus) => candidateStatus.value === candidate.status,
    )?.value;
    if (!status) return null;
    items.push({
      id: candidate.id,
      reference: candidate.reference,
      summary: candidate.summary,
      categoryId: candidate.categoryId,
      categoryName: candidate.categoryName,
      departmentId: candidate.departmentId,
      departmentName: candidate.departmentName,
      status,
      updatedAt: candidate.updatedAt,
    });
  }
  return {
    items,
    page: value.page as number,
    pageSize: value.pageSize as number,
    total: value.total as number,
  };
}

function parseOptions(value: unknown): FilterOptions | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.departments)
  ) {
    return null;
  }
  const parseNames = (entries: unknown[]): { id: string; name: string }[] | null => {
    const parsed: { id: string; name: string }[] = [];
    for (const entry of entries) {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        typeof entry.name !== "string"
      ) {
        return null;
      }
      parsed.push({ id: entry.id, name: entry.name });
    }
    return parsed;
  };
  const categories = parseNames(value.categories);
  const departments = parseNames(value.departments);
  return categories && departments ? { categories, departments } : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function statusLabel(status: RequestStatus): string {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

export function RequestsPage() {
  const { accessToken, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialFilters = useMemo(() => {
    const status = searchParams.get("status") ?? "";
    return {
      ...emptyFilters,
      departmentId: searchParams.get("departmentId") ?? "",
      status: statuses.some((item) => item.value === status) ? status : "",
    };
  }, [searchParams]);
  const [filters, setFilters] = useState<RequestFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<RequestFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RequestListPageData | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterError, setFilterError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    for (const [key, value] of Object.entries(appliedFilters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [appliedFilters, page]);

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`${apiBaseUrl()}/requests?${query}`, {
        headers: bearerHeaders(accessToken),
        signal,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const parsed = parseList(await responseJson(response));
      if (!parsed) {
        setError(true);
        return;
      }
      setResult(parsed);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [accessToken, query]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRequests(controller.signal);
    return () => controller.abort();
  }, [loadRequests]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/requests/options`, {
          headers: bearerHeaders(accessToken),
          signal: controller.signal,
        });
        if (response.ok) {
          const parsed = parseOptions(await responseJson(response));
          setOptions(parsed);
          setOptionsError(!parsed);
        } else {
          setOptionsError(true);
        }
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setOptions(null);
          setOptionsError(true);
        }
      }
    })();
    return () => controller.abort();
  }, [accessToken]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setFilterError("Choose a start date on or before the end date.");
      return;
    }
    setFilterError("");
    setPage(1);
    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilterError("");
    setPage(1);
  }

  const pageCount = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;

  return (
    <div className="tracking-page">
      <section className="tracking-intro">
        <p className="eyebrow">Operational requests</p>
        <h2>My Requests</h2>
        <p>
          {user?.role === "employee"
            ? "Review the status and history of requests you are authorised to access."
            : "Review requests available to your role and department."}
        </p>
        {user?.role === "employee" && (
          <Link className="button button-primary" to="/requests/new">
            New Request
          </Link>
        )}
      </section>

      <form className="tracking-filters" onSubmit={applyFilters}>
        <FormField id="request-search" label="Search requests">
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
        </FormField>
        <FormField id="request-status" label="Status">
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="request-category" label="Category">
          <select
            value={filters.categoryId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, categoryId: event.target.value }))
            }
          >
            <option value="">All categories</option>
            {options?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        {optionsError && (
          <p className="read-only-note" role="status">
            Category and department filters are unavailable.
          </p>
        )}
        <FormField id="request-department" label="Department">
          <select
            value={filters.departmentId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                departmentId: event.target.value,
              }))
            }
          >
            <option value="">All departments</option>
            {options?.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="request-from" label="From">
          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, from: event.target.value }))
            }
          />
        </FormField>
        <FormField id="request-to" label="To">
          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, to: event.target.value }))
            }
          />
        </FormField>
        {filterError && <p className="request-error" role="alert">{filterError}</p>}
        <div className="tracking-filter-actions">
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
          <button className="button button-secondary" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </form>

      <section className="tracking-results" aria-label="Request results">
        {isLoading ? (
          <p role="status">Loading requests…</p>
        ) : error ? (
          <div className="request-error-panel">
            <p className="request-error" role="alert">
              We couldn’t load requests. Try again.
            </p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void loadRequests()}
            >
              Try again
            </button>
          </div>
        ) : result?.items.length === 0 ? (
          <p className="tracking-empty">No requests match these filters.</p>
        ) : (
          <>
            <div className="tracking-table-wrap">
              <table className="tracking-table">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Summary</th>
                    <th scope="col">Category</th>
                    <th scope="col">Department</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.items.map((item) => (
                    <tr key={item.id}>
                      <td><Link to={`/requests/${item.id}`}>{item.reference}</Link></td>
                      <td>{item.summary}</td>
                      <td>{item.categoryName}</td>
                      <td>{item.departmentName}</td>
                      <td><span className="status-pill">{statusLabel(item.status)}</span></td>
                      <td>{formatDate(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="tracking-pagination" aria-label="Request pages">
              <button
                type="button"
                className="button button-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous page
              </button>
              <span>
                Page {page} of {pageCount} · {result?.total ?? 0} requests
              </span>
              <button
                type="button"
                className="button button-secondary"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Next page
              </button>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
