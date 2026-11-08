import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FormField } from "../components/FormField.js";
import { useAuth } from "../app/auth/AuthContext.js";

interface RequestCategoryOption {
  id: string;
  name: string;
  defaultDepartmentId: string;
}

interface RequestDepartmentOption {
  id: string;
  name: string;
}

interface RequestOptions {
  categories: RequestCategoryOption[];
  departments: RequestDepartmentOption[];
}

interface SubmittedRequest {
  id: string;
  reference: string;
  categoryId: string;
  departmentId: string;
  summary: string;
  description: string;
  status: "submitted";
  createdAt: string;
  replayed: boolean;
}

type RequestField = "categoryId" | "departmentId" | "summary" | "description";
type RequestErrors = Partial<Record<RequestField, string>>;

const fieldMessages: Record<RequestField, string> = {
  categoryId: "Choose a category.",
  departmentId: "Choose a destination department.",
  summary: "Enter a short summary.",
  description: "Enter a description.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRequestOptions(value: unknown): RequestOptions | null {
  if (!isRecord(value) || !Array.isArray(value.categories) || !Array.isArray(value.departments)) {
    return null;
  }

  const categories: RequestCategoryOption[] = [];
  for (const candidate of value.categories) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.defaultDepartmentId !== "string"
    ) {
      return null;
    }
    categories.push({
      id: candidate.id,
      name: candidate.name,
      defaultDepartmentId: candidate.defaultDepartmentId,
    });
  }

  const departments: RequestDepartmentOption[] = [];
  for (const candidate of value.departments) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string"
    ) {
      return null;
    }
    departments.push({ id: candidate.id, name: candidate.name });
  }

  return { categories, departments };
}

function parseSubmittedRequest(value: unknown): SubmittedRequest | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.reference !== "string" ||
    typeof value.categoryId !== "string" ||
    typeof value.departmentId !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.description !== "string" ||
    value.status !== "submitted" ||
    typeof value.createdAt !== "string" ||
    typeof value.replayed !== "boolean"
  ) {
    return null;
  }
  return {
    id: value.id,
    reference: value.reference,
    categoryId: value.categoryId,
    departmentId: value.departmentId,
    summary: value.summary,
    description: value.description,
    status: value.status,
    createdAt: value.createdAt,
    replayed: value.replayed,
  };
}

function apiBaseUrl(): string {
  const base = import.meta.env.DEV
    ? "/api/v1"
    : (import.meta.env.VITE_API_BASE_URL ?? "/api/v1");
  return base.replace(/\/$/, "");
}

function bearerHeaders(accessToken: string | null | undefined): HeadersInit {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
}

function validateFields(fields: {
  categoryId: string;
  departmentId: string;
  summary: string;
  description: string;
}): RequestErrors {
  const errors: RequestErrors = {};
  if (!fields.categoryId) errors.categoryId = fieldMessages.categoryId;
  if (!fields.departmentId) errors.departmentId = fieldMessages.departmentId;
  const summaryLength = fields.summary.trim().length;
  if (summaryLength < 5 || summaryLength > 120) {
    errors.summary = fieldMessages.summary;
  }
  const descriptionLength = fields.description.trim().length;
  if (descriptionLength < 10 || descriptionLength > 5000) {
    errors.description = fieldMessages.description;
  }
  return errors;
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function NewRequestPage() {
  const { accessToken } = useAuth();
  const [options, setOptions] = useState<RequestOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<RequestErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<SubmittedRequest | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const selectedCategory = options?.categories.find(
    (category) => category.id === categoryId,
  );
  const availableDepartments = useMemo(
    () =>
      selectedCategory
        ? (options?.departments.filter(
            (department) => department.id === selectedCategory.defaultDepartmentId,
          ) ?? [])
        : [],
    [options?.departments, selectedCategory],
  );

  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    setLoadingOptions(true);
    setOptionsError(false);
    try {
      const response = await fetch(`${apiBaseUrl()}/requests/options`, {
        headers: bearerHeaders(accessToken),
        signal,
      });
      if (!response.ok) {
        setOptionsError(true);
        return;
      }
      const parsed = parseRequestOptions(await responseJson(response));
      if (!parsed) {
        setOptionsError(true);
        return;
      }
      setOptions(parsed);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setOptionsError(true);
    } finally {
      if (!signal?.aborted) setLoadingOptions(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
  }, [loadOptions]);

  useEffect(() => {
    const updateConnectivity = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  function resetSubmissionKey() {
    setIdempotencyKey(null);
    setSubmitError("");
    setCanRetry(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setCanRetry(false);

    const nextErrors = validateFields({
      categoryId,
      departmentId,
      summary,
      description,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !options || isOffline) return;

    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl()}/requests`, {
        method: "POST",
        headers: {
          ...bearerHeaders(accessToken),
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          categoryId,
          departmentId,
          summary: summary.trim(),
          description: description.trim(),
        }),
      });
      const body = await responseJson(response);
      if (!response.ok) {
        if (isRecord(body) && isRecord(body.errors)) {
          const serverErrors: RequestErrors = {};
          for (const field of [
            "categoryId",
            "departmentId",
            "summary",
            "description",
          ] as const) {
            const message = body.errors[field];
            if (typeof message === "string") serverErrors[field] = message;
          }
          setErrors(serverErrors);
        }
        setSubmitError(
          isRecord(body) && typeof body.message === "string"
            ? body.message
            : "We couldn’t submit your request. Please try again.",
        );
        return;
      }

      const created = parseSubmittedRequest(body);
      if (!created) {
        setSubmitError("We couldn’t confirm your request. Please try again.");
        return;
      }
      setSubmittedRequest(created);
    } catch {
      setSubmitError(
        "We couldn’t submit your request. Your details are still here; try again.",
      );
      setCanRetry(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedRequest) {
    return (
      <section className="request-confirmation" aria-labelledby="request-confirmation-title">
        <p className="eyebrow">Confirmation</p>
        <h2 id="request-confirmation-title">Request submitted.</h2>
        <p>Your request reference is <strong>{submittedRequest.reference}</strong>.</p>
        <Link
          className="button button-primary"
          to={`/requests/${submittedRequest.id}`}
          state={{ request: submittedRequest }}
        >
          View request
        </Link>
      </section>
    );
  }

  if (loadingOptions) {
    return (
      <section className="request-form-panel">
        <p role="status">Loading request categories…</p>
      </section>
    );
  }

  if (optionsError || !options) {
    return (
      <section className="request-form-panel" aria-labelledby="request-options-error-title">
        <h2 id="request-options-error-title">Request options unavailable</h2>
        <p role="alert">We couldn’t load request options. Try again.</p>
        <button className="button button-secondary" onClick={() => void loadOptions()}>
          Try again
        </button>
      </section>
    );
  }

  if (options.categories.length === 0 || options.departments.length === 0) {
    return (
      <section className="request-form-panel" aria-labelledby="request-options-empty-title">
        <h2 id="request-options-empty-title">Request options unavailable</h2>
        <p>No active request categories or destination departments are available.</p>
      </section>
    );
  }

  return (
    <div className="request-page">
      <section className="request-intro">
        <p className="eyebrow">Operational requests</p>
        <h2>New Request</h2>
        <p>Submit an operational request for your university.</p>
      </section>

      <form
        className="request-form-panel"
        aria-label="New operational request"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="request-form-section">
          <div className="section-heading">
            <h3>Request details</h3>
          </div>
          <FormField
            id="request-category"
            label="Category"
            error={errors.categoryId}
          >
            <select
              value={categoryId}
              disabled={isSubmitting}
              onChange={(event) => {
                const nextCategory = options.categories.find(
                  (category) => category.id === event.target.value,
                );
                setCategoryId(event.target.value);
                setDepartmentId(nextCategory?.defaultDepartmentId ?? "");
                setErrors((current) => ({ ...current, categoryId: undefined, departmentId: undefined }));
                resetSubmissionKey();
              }}
            >
              <option value="">Select a category</option>
              {options.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <p className="routing-placeholder">
            Routing recommendation is based on the selected category.
          </p>

          <FormField
            id="request-department"
            label="Destination department"
            error={errors.departmentId}
          >
            <select
              value={departmentId}
              disabled={!categoryId || isSubmitting}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setErrors((current) => ({ ...current, departmentId: undefined }));
                resetSubmissionKey();
              }}
            >
              <option value="">Choose a destination department</option>
              {availableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="request-form-section">
          <div className="section-heading">
            <h3>Request summary and description</h3>
          </div>
          <FormField
            id="request-summary"
            label="Summary"
            hint="5–120 characters"
            error={errors.summary}
          >
            <input
              type="text"
              maxLength={120}
              value={summary}
              disabled={isSubmitting}
              onChange={(event) => {
                setSummary(event.target.value);
                setErrors((current) => ({ ...current, summary: undefined }));
                resetSubmissionKey();
              }}
            />
          </FormField>
          <FormField
            id="request-description"
            label="Description"
            hint="10–5,000 characters"
            error={errors.description}
          >
            <textarea
              rows={7}
              maxLength={5000}
              value={description}
              disabled={isSubmitting}
              onChange={(event) => {
                setDescription(event.target.value);
                setErrors((current) => ({ ...current, description: undefined }));
                resetSubmissionKey();
              }}
            />
          </FormField>
        </div>

        {isOffline && (
          <p className="request-error" role="alert">
            You’re offline. Reconnect before submitting your request.
          </p>
        )}
        {submitError && (
          <div className="request-error-panel">
            <p className="request-error" role="alert">{submitError}</p>
            {canRetry && !isOffline && (
              <button
                type="submit"
                className="button button-secondary"
                disabled={isSubmitting}
              >
                Try again
              </button>
            )}
          </div>
        )}

        <div className="request-form-actions">
          <Link className="button button-secondary" to="/">
            Cancel
          </Link>
          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting || isOffline}
          >
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RequestDetailPage() {
  const { requestId } = useParams();
  const location = useLocation();
  const state: unknown = location.state;
  const request = isRecord(state) ? parseSubmittedRequest(state.request) : null;

  if (!request || request.id !== requestId) {
    return (
      <section className="request-confirmation" aria-labelledby="request-detail-unavailable-title">
        <h2 id="request-detail-unavailable-title">Request details unavailable</h2>
        <p>Open a request after it has been submitted.</p>
        <Link className="button button-primary" to="/">
          Return home
        </Link>
      </section>
    );
  }

  return (
    <section className="request-confirmation" aria-labelledby="request-detail-title">
      <p className="eyebrow">Submitted request</p>
      <h2 id="request-detail-title">Request {request.reference}</h2>
      <dl className="request-detail-list">
        <div>
          <dt>Status</dt>
          <dd>Submitted</dd>
        </div>
        <div>
          <dt>Summary</dt>
          <dd>{request.summary}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{request.description}</dd>
        </div>
      </dl>
      <Link className="button button-secondary" to="/">
        Return home
      </Link>
    </section>
  );
}
