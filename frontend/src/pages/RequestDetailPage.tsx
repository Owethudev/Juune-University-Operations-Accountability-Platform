import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
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

interface RequestEvent {
  id: string;
  eventType: string;
  actorName: string;
  message: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface RequestDetail {
  id: string;
  reference: string;
  categoryId: string;
  departmentId: string;
  summary: string;
  description: string;
  requester: { id: string; name: string };
  category: { id: string; name: string };
  department: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  status: RequestStatus;
  statusReason: string | null;
  createdAt: string;
  updatedAt: string;
  sensitivity: "standard" | "restricted";
  events: RequestEvent[];
  attachments: [];
}

const statusLabels: Record<RequestStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  waiting_for_requester: "Waiting for requester",
  on_hold: "On hold",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const transitions: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["acknowledged"],
  acknowledged: ["in_progress", "waiting_for_requester", "on_hold", "resolved"],
  in_progress: ["waiting_for_requester", "on_hold", "resolved"],
  waiting_for_requester: ["in_progress", "on_hold", "resolved"],
  on_hold: ["in_progress", "waiting_for_requester", "resolved"],
  resolved: ["reopened"],
  closed: [],
  reopened: ["in_progress", "on_hold", "resolved"],
};

function parseStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && Object.hasOwn(statusLabels, value);
}

function parseParticipant(
  value: unknown,
): { id: string; name: string } | null | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string"
  ) {
    return undefined;
  }
  return { id: value.id, name: value.name };
}

function parseDetail(value: unknown): RequestDetail | null {
  const assignedTo = isRecord(value) ? parseParticipant(value.assignedTo) : undefined;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.reference !== "string" ||
    typeof value.categoryId !== "string" ||
    typeof value.departmentId !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.description !== "string" ||
    !isRecord(value.requester) ||
    typeof value.requester.id !== "string" ||
    typeof value.requester.name !== "string" ||
    !isRecord(value.category) ||
    typeof value.category.id !== "string" ||
    typeof value.category.name !== "string" ||
    !isRecord(value.department) ||
    typeof value.department.id !== "string" ||
    typeof value.department.name !== "string" ||
    !parseStatus(value.status) ||
    assignedTo === undefined ||
    (value.statusReason !== null && typeof value.statusReason !== "string") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    (value.sensitivity !== "standard" && value.sensitivity !== "restricted") ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.attachments) ||
    value.attachments.length > 0
  ) {
    return null;
  }
  const events: RequestEvent[] = [];
  for (const event of value.events) {
    if (
      !isRecord(event) ||
      typeof event.id !== "string" ||
      typeof event.eventType !== "string" ||
      typeof event.actorName !== "string" ||
      (event.message !== null && typeof event.message !== "string") ||
      !isRecord(event.metadata) ||
      typeof event.createdAt !== "string"
    ) {
      return null;
    }
    events.push({
      id: event.id,
      eventType: event.eventType,
      actorName: event.actorName,
      message: event.message,
      metadata: event.metadata,
      createdAt: event.createdAt,
    });
  }
  return {
    id: value.id,
    reference: value.reference,
    categoryId: value.categoryId,
    departmentId: value.departmentId,
    summary: value.summary,
    description: value.description,
    requester: { id: value.requester.id, name: value.requester.name },
    category: { id: value.category.id, name: value.category.name },
    department: { id: value.department.id, name: value.department.name },
    assignedTo,
    status: value.status,
    statusReason: value.statusReason,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    sensitivity: value.sensitivity,
    events,
    attachments: [],
  };
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function eventTitle(event: RequestEvent): string {
  if (event.eventType === "created") return "Request created";
  if (event.eventType === "status_changed") {
    const status = event.metadata.new_status;
    return parseStatus(status)
      ? `Status changed to ${statusLabels[status]}`
      : "Status changed";
  }
  if (event.eventType === "assigned") return "Request assigned";
  if (event.eventType === "reopened") return "Request reopened";
  return event.eventType === "response" ? "Response" : "Request update";
}

async function loadRequest(
  requestId: string,
  accessToken: string | null | undefined,
  signal?: AbortSignal,
): Promise<RequestDetail | null> {
  const response = await fetch(`${apiBaseUrl()}/requests/${encodeURIComponent(requestId)}`, {
    headers: bearerHeaders(accessToken),
    signal,
  });
  if (response.status === 403 || response.status === 404) {
    throw new RequestAccessDeniedError();
  }
  if (!response.ok) throw new Error("Request data could not be loaded.");
  const parsed = parseDetail(await responseJson(response));
  if (!parsed) throw new Error("Request data could not be loaded.");
  return parsed;
}

class RequestAccessDeniedError extends Error {
  constructor() {
    super("Request access denied.");
    this.name = "RequestAccessDeniedError";
  }
}

export function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const { accessToken, user } = useAuth();
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"denied" | "retry" | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseError, setResponseError] = useState("");
  const [responseSuccess, setResponseSuccess] = useState("");
  const [canRetryResponse, setCanRetryResponse] = useState(false);
  const [statusTarget, setStatusTarget] = useState<RequestStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [savingAction, setSavingAction] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadRequest(requestId, accessToken, signal);
      if (!signal?.aborted) {
        setDetail(loaded);
        setLoadError(null);
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setDetail(null);
      setLoadError(
        caught instanceof RequestAccessDeniedError ? "denied" : "retry",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken, requestId]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const updateConnectivity = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  const events = useMemo(
    () =>
      [...(detail?.events ?? [])].sort(
        (left, right) =>
          new Date(left.createdAt).valueOf() - new Date(right.createdAt).valueOf(),
      ),
    [detail?.events],
  );

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResponseError("");
    setResponseSuccess("");
    setCanRetryResponse(false);
    const message = responseText.trim();
    if (!message || offline || !requestId) return;
    try {
      const response = await fetch(
        `${apiBaseUrl()}/requests/${encodeURIComponent(requestId)}/responses`,
        {
          method: "POST",
          headers: {
            ...bearerHeaders(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        },
      );
      if (!response.ok) {
        setResponseError("We couldn’t save your response. Try again.");
        return;
      }
      setResponseText("");
      setResponseSuccess("Your response was added.");
      await refresh();
    } catch {
      setResponseError(
        "We couldn’t save your response. Your text is still here; try again.",
      );
      setCanRetryResponse(true);
    }
  }

  async function assignToSelf() {
    if (!requestId || offline) return;
    setSavingAction(true);
    setActionError("");
    try {
      const response = await fetch(
        `${apiBaseUrl()}/requests/${encodeURIComponent(requestId)}/assignment`,
        {
          method: "POST",
          headers: {
            ...bearerHeaders(accessToken),
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );
      const updated = response.ok ? parseDetail(await responseJson(response)) : null;
      if (!updated) {
        setActionError("We couldn’t update this request. Try again.");
        return;
      }
      setDetail(updated);
    } catch {
      setActionError("We couldn’t update this request. Try again.");
    } finally {
      setSavingAction(false);
    }
  }

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId || !statusTarget || offline) return;
    setSavingAction(true);
    setActionError("");
    try {
      const response = await fetch(
        `${apiBaseUrl()}/requests/${encodeURIComponent(requestId)}/status`,
        {
          method: "PATCH",
          headers: {
            ...bearerHeaders(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusTarget,
            reason:
              statusTarget === "on_hold" || statusTarget === "resolved"
                ? statusReason.trim() || null
                : null,
          }),
        },
      );
      const updated = response.ok ? parseDetail(await responseJson(response)) : null;
      if (!updated) {
        setActionError("We couldn’t update this request. Try again.");
        return;
      }
      setDetail(updated);
      setStatusTarget("");
      setStatusReason("");
    } catch {
      setActionError("We couldn’t update this request. Try again.");
    } finally {
      setSavingAction(false);
    }
  }

  async function requestReopen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId || !reopenReason.trim() || offline) return;
    setSavingAction(true);
    setReopenError("");
    try {
      const response = await fetch(
        `${apiBaseUrl()}/requests/${encodeURIComponent(requestId)}/reopen-requests`,
        {
          method: "POST",
          headers: {
            ...bearerHeaders(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: reopenReason.trim() }),
        },
      );
      if (!response.ok) {
        setReopenError("We couldn’t submit the reopen request. Try again.");
        return;
      }
      setReopenReason("");
      setResponseSuccess("Your reopen request was sent to the responsible manager.");
      await refresh();
    } catch {
      setReopenError("We couldn’t submit the reopen request. Try again.");
    } finally {
      setSavingAction(false);
    }
  }

  if (loading) {
    return <section className="tracking-panel"><p role="status">Loading request…</p></section>;
  }
  if (loadError || !detail) {
    return (
      <section className="tracking-panel">
        {loadError === "denied" ? (
          <div className="request-error-panel">
            <h2>You don’t have permission to view this item.</h2>
            <Link className="button button-secondary" to="/requests">
              Back to My Requests
            </Link>
          </div>
        ) : loadError === "retry" ? (
          <div className="request-error-panel">
            <p className="request-error" role="alert">
              We couldn’t load request details. Try again.
            </p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </div>
        ) : (
          <p role="status">Loading request…</p>
        )}
      </section>
    );
  }

  const isRequester = detail.requester.id === user?.id;
  const isAssignedManager =
    user?.role === "department_manager" && detail.assignedTo?.id === user.id;
  const allowedStatuses = transitions[detail.status];

  return (
    <div className="tracking-page">
      <p className="eyebrow"><Link to="/requests">My Requests</Link> / Request detail</p>
      <section className="tracking-panel">
        <div className="tracking-detail-heading">
          <div>
            <p className="eyebrow">{detail.category.name} · {detail.department.name}</p>
            <h2>{detail.reference}</h2>
            <p>{detail.summary}</p>
          </div>
          <span className="status-pill status-pill-large">{statusLabels[detail.status]}</span>
        </div>
        <dl className="request-detail-list">
          <div><dt>Requester</dt><dd>{detail.requester.name}</dd></div>
          <div><dt>Responsible department</dt><dd>{detail.department.name}</dd></div>
          <div>
            <dt>Assigned owner</dt>
            <dd>{detail.assignedTo?.name ?? "Not assigned"}</dd>
          </div>
          <div><dt>Created</dt><dd>{formatTime(detail.createdAt)}</dd></div>
          <div>
            <dt>Estimated resolution</dt>
            <dd>A reliable resolution estimate isn’t available for this category yet.</dd>
          </div>
        </dl>
        <div className="request-description">
          <h3>Description</h3>
          <p>{detail.description}</p>
        </div>
        {detail.statusReason && (
          <p className="read-only-note">Latest status update: {detail.statusReason}</p>
        )}
      </section>

      <section className="tracking-panel" aria-labelledby="request-history-title">
        <div className="section-heading">
          <h2 id="request-history-title">Request history</h2>
        </div>
        <ol className="request-timeline">
          {events.map((event) => (
            <li key={event.id}>
              <div className="timeline-marker" aria-hidden="true" />
              <div>
                <h3>{eventTitle(event)}</h3>
                <p>{event.actorName} · {formatTime(event.createdAt)}</p>
                {event.message && <p>{event.message}</p>}
                {typeof event.metadata.status_reason === "string" && (
                  <p>{event.metadata.status_reason}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="tracking-panel" aria-labelledby="request-response-title">
        <div className="section-heading">
          <h2 id="request-response-title">Responses</h2>
        </div>
        {responseSuccess && <p className="feedback-success" role="status">{responseSuccess}</p>}
        {(isRequester || isAssignedManager) && detail.status !== "closed" && (
          <form className="tracking-action-form" onSubmit={(event) => void submitResponse(event)}>
            <FormField id="response-message" label="Response">
              <textarea
                rows={4}
                value={responseText}
                disabled={offline}
                onChange={(event) => setResponseText(event.target.value)}
              />
            </FormField>
            {responseError && <p className="request-error" role="alert">{responseError}</p>}
            <button
              className="button button-primary"
              type="submit"
              disabled={offline || !responseText.trim()}
            >
              Post response
            </button>
            {canRetryResponse && !offline && (
              <button
                className="button button-secondary"
                type="submit"
                onClick={() => setResponseError("")}
              >
                Try again
              </button>
            )}
          </form>
        )}
        {offline && <p className="read-only-note">Reconnect to send a response or update this request.</p>}
      </section>

      <section className="tracking-panel" aria-labelledby="request-evidence-title">
        <div className="section-heading"><h2 id="request-evidence-title">Evidence</h2></div>
        <p className="read-only-note">Evidence uploads are not available yet.</p>
      </section>

      <section className="tracking-panel" aria-labelledby="request-assistance-title">
        <div className="section-heading">
          <h2 id="request-assistance-title">Need assistance?</h2>
        </div>
        <p className="read-only-note">Lack-of-assistance flags are not available yet.</p>
      </section>

      {user?.role === "department_manager" && (
        <section className="tracking-panel" aria-labelledby="request-actions-title">
          <div className="section-heading"><h2 id="request-actions-title">Manager actions</h2></div>
          {!detail.assignedTo && (
            <button
              className="button button-secondary"
              type="button"
              disabled={offline || savingAction}
              onClick={() => void assignToSelf()}
            >
              Assign to me
            </button>
          )}
          {isAssignedManager && allowedStatuses.length > 0 && (
            <form className="tracking-action-form" onSubmit={(event) => void changeStatus(event)}>
              <FormField id="next-request-status" label="Update status">
                <select
                  value={statusTarget}
                  onChange={(event) =>
                    setStatusTarget(parseStatus(event.target.value) ? event.target.value : "")
                  }
                >
                  <option value="">Choose a status</option>
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
              </FormField>
              {(statusTarget === "on_hold" || statusTarget === "resolved") && (
                <FormField id="status-reason" label="Reason">
                  <textarea
                    rows={3}
                    value={statusReason}
                    onChange={(event) => setStatusReason(event.target.value)}
                  />
                </FormField>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={offline || savingAction || !statusTarget}
              >
                Save status
              </button>
            </form>
          )}
          {actionError && <p className="request-error" role="alert">{actionError}</p>}
        </section>
      )}

      {isRequester && detail.status === "resolved" && (
        <section className="tracking-panel" aria-labelledby="reopen-request-title">
          <div className="section-heading"><h2 id="reopen-request-title">Request more help</h2></div>
          <form className="tracking-action-form" onSubmit={(event) => void requestReopen(event)}>
            <FormField id="reopen-reason" label="Reason to reopen">
              <textarea
                rows={3}
                value={reopenReason}
                disabled={offline || savingAction}
                onChange={(event) => setReopenReason(event.target.value)}
              />
            </FormField>
            {reopenError && <p className="request-error" role="alert">{reopenError}</p>}
            <button
              className="button button-secondary"
              type="submit"
              disabled={offline || savingAction || !reopenReason.trim()}
            >
              Request reopen
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
