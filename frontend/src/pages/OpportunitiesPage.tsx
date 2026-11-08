import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../app/auth/AuthContext.js";
import { isRecord } from "../app/api.js";
import {
  contentErrorMessage,
  fetchContentJson,
  parseDepartments,
  parseOpportunityDrafts,
  parseOpportunities,
  parsePublishingPermissions,
  type ContentDepartment,
  type Opportunity,
  type OpportunityDraft,
  type OpportunityType,
} from "../app/content.js";

interface OpportunityForm {
  title: string;
  type: OpportunityType;
  description: string;
  departmentIds: string[];
  opensOn: string;
  closesOn: string;
  applicationUrl: string;
  instructions: string;
}

const emptyForm: OpportunityForm = {
  title: "",
  type: "training",
  description: "",
  departmentIds: [],
  opensOn: "",
  closesOn: "",
  applicationUrl: "",
  instructions: "",
};

const opportunityLabels: Record<OpportunityType, string> = {
  vacancy: "Vacancy",
  promotion: "Promotion",
  temporary_assignment: "Temporary assignment",
  training: "Training",
  professional_development: "Professional development",
};

function formDate(value: string, endOfDay = false): string | null {
  return value
    ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`).toISOString()
    : null;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.hostname.includes(".") &&
      !url.hostname.endsWith(".localhost") &&
      !url.hostname.endsWith(".local") &&
      !url.hostname.endsWith(".internal")
    );
  } catch {
    return false;
  }
}

export function OpportunitiesPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [drafts, setDrafts] = useState<OpportunityDraft[]>([]);
  const [departments, setDepartments] = useState<ContentDepartment[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [closingFrom, setClosingFrom] = useState("");
  const [closingTo, setClosingTo] = useState("");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isOpeningApplication, setIsOpeningApplication] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (typeFilter) query.set("type", typeFilter);
      if (departmentId) query.set("departmentId", departmentId);
      if (closingFrom) query.set("closingFrom", closingFrom);
      if (closingTo) query.set("closingTo", closingTo);
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      const [feed, permissions, options, draftResponse] = await Promise.all([
        fetchContentJson(`/opportunities${suffix}`, accessToken),
        fetchContentJson("/content/publishing-permissions", accessToken),
        fetchContentJson("/requests/options", accessToken),
        fetchContentJson("/opportunities/drafts", accessToken),
      ]);
      const parsedItems = parseOpportunities(feed.body);
      const parsedPermissions = parsePublishingPermissions(permissions.body);
      const parsedDepartments = parseDepartments(options.body);
      const parsedDrafts = parseOpportunityDrafts(draftResponse.body);
      if (
        !feed.response.ok ||
        !permissions.response.ok ||
        !options.response.ok ||
        !draftResponse.response.ok ||
        !parsedItems ||
        !parsedPermissions ||
        !parsedDepartments ||
        !parsedDrafts
      ) {
        throw new Error("We couldn’t load opportunities. Try again.");
      }
      setItems(parsedItems);
      setCanPublish(parsedPermissions.opportunities);
      setDepartments(parsedDepartments);
      setDrafts(parsedDrafts);
    } catch {
      setError("We couldn’t load opportunities. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, closingFrom, closingTo, departmentId, search, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(item: Opportunity) {
    setSelected(null);
    setIsDetailLoading(true);
    try {
      const { response, body } = await fetchContentJson(
        `/opportunities/${item.id}`,
        accessToken,
      );
      if (!response.ok || !isRecord(body) || !isRecord(body.item)) {
        setError("We couldn’t open this opportunity. Try again.");
        return;
      }
      const detail = parseOpportunities({ items: [body.item] })?.[0];
      if (!detail) {
        setError("We couldn’t open this opportunity. Try again.");
        return;
      }
      setError(null);
      setSelected(detail);
    } catch {
      setError("We couldn’t open this opportunity. Try again.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsConfirmOpen(false);
    setDraftId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
    setFormStatus(null);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (form.title.trim().length < 5 || form.title.trim().length > 120) {
      errors.title = "Enter a title between 5 and 120 characters.";
    }
    if (
      form.description.trim().length < 10 ||
      form.description.trim().length > 5000
    ) {
      errors.description = "Enter a description between 10 and 5,000 characters.";
    }
    if (
      !form.applicationUrl.trim() &&
      form.instructions.trim().length < 10
    ) {
      errors.instructions = "Add application instructions or an HTTPS application link.";
    }
    if (
      form.applicationUrl.trim() &&
      (!isSafeExternalUrl(form.applicationUrl.trim()) ||
        form.instructions.trim().length > 0)
    ) {
      errors.applicationUrl =
        "Enter a safe HTTPS link and provide no separate instructions.";
    }
    if (
      form.instructions.trim() &&
      (form.instructions.trim().length < 10 ||
        form.instructions.trim().length > 5000 ||
        form.applicationUrl.trim().length > 0)
    ) {
      errors.instructions =
        "Enter 10–5,000 characters of instructions, or use an HTTPS application link.";
    }
    if (
      form.opensOn &&
      form.closesOn &&
      form.closesOn <= form.opensOn
    ) {
      errors.closesOn = "Choose a closing date after the opening date.";
    }
    if (
      form.closesOn &&
      new Date(`${form.closesOn}T23:59:59.999Z`).getTime() <= Date.now()
    ) {
      errors.closesOn = "Choose a future closing date.";
    }
    setFieldErrors(errors);
    setFormError(null);
    return Object.keys(errors).length === 0;
  }

  async function saveDraft(publishAfterSave: boolean) {
    if (!validateForm()) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim(),
        audienceDepartmentIds: form.departmentIds,
        opensAt: formDate(form.opensOn),
        closesAt: formDate(form.closesOn, true),
        applicationUrl: form.applicationUrl.trim() || null,
        instructions: form.instructions.trim() || null,
        publish: false,
      };
      const saved = await fetchContentJson(
        draftId ? `/opportunities/${draftId}` : "/opportunities",
        accessToken,
        {
          method: draftId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (
        !saved.response.ok ||
        !isRecord(saved.body) ||
        typeof saved.body.id !== "string"
      ) {
        setFormError(
          contentErrorMessage(
            saved.body,
            "We couldn’t save this opportunity. Try again.",
          ),
        );
        return;
      }
      const savedId = saved.body.id;
      setDraftId(savedId);
      setDrafts((current) => [
        {
          id: savedId,
          title: payload.title,
          type: payload.type,
          description: payload.description,
          opensAt: payload.opensAt,
          closesAt: payload.closesAt,
          applicationUrl: payload.applicationUrl,
          instructions: payload.instructions,
          audienceDepartmentIds: payload.audienceDepartmentIds,
        },
        ...current.filter((draft) => draft.id !== savedId),
      ]);
      if (!publishAfterSave) {
        setFormStatus("Draft saved. You can continue editing or publish it.");
        return;
      }

      const published = await fetchContentJson(
        `/opportunities/${savedId}/publish`,
        accessToken,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!published.response.ok) {
        setFormError(
          contentErrorMessage(
            published.body,
            "We couldn’t publish this opportunity. Your draft is saved.",
          ),
        );
        return;
      }
      closeForm();
      setSuccess("Opportunity published.");
      await load();
    } catch {
      setFormError("We couldn’t save this opportunity. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function openApplication() {
    if (!selected) return;
    const applicationWindow = window.open("about:blank", "_blank");
    if (!applicationWindow) {
      setError("Allow pop-ups to open the external application site.");
      return;
    }
    applicationWindow.opener = null;
    setIsOpeningApplication(true);
    setError(null);
    try {
      const { response, body } = await fetchContentJson(
        `/opportunities/${selected.id}/application`,
        accessToken,
      );
      if (
        !response.ok ||
        !isRecord(body) ||
        typeof body.applicationUrl !== "string" ||
        !isSafeExternalUrl(body.applicationUrl)
      ) {
        applicationWindow.close();
        setError(
          response.status === 404
            ? "This opportunity is no longer open."
            : "We couldn’t open the application site. Try again.",
        );
        return;
      }
      applicationWindow.location.replace(body.applicationUrl);
    } catch {
      applicationWindow.close();
      setError("We couldn’t open the application site. Try again.");
    } finally {
      setIsOpeningApplication(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  const formFields = (
    <>
      <label>
        Title
        <input
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? "opportunity-title-error" : undefined}
          maxLength={120}
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
        />
        {fieldErrors.title && <span id="opportunity-title-error" className="field-error">{fieldErrors.title}</span>}
      </label>
      <label>
        Type
        <select
          value={form.type}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              type: event.target.value as OpportunityType,
            }))
          }
        >
          {Object.entries(opportunityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={
            fieldErrors.description ? "opportunity-description-error" : undefined
          }
          maxLength={5000}
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />
        {fieldErrors.description && <span id="opportunity-description-error" className="field-error">{fieldErrors.description}</span>}
      </label>
      <label>
        Audience departments
        <select
          multiple
          value={form.departmentIds}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              departmentIds: Array.from(
                event.target.selectedOptions,
                (option) => option.value,
              ),
            }))
          }
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
        <span className="field-hint">Leave empty for an institution-wide opportunity.</span>
      </label>
      <label>
        Opens on (UTC, optional)
        <input
          type="date"
          value={form.opensOn}
          onChange={(event) =>
            setForm((current) => ({ ...current, opensOn: event.target.value }))
          }
        />
      </label>
      <label>
        Closes on (UTC, optional)
        <input
          type="date"
          aria-invalid={Boolean(fieldErrors.closesOn)}
          aria-describedby={fieldErrors.closesOn ? "opportunity-close-error" : undefined}
          value={form.closesOn}
          onChange={(event) =>
            setForm((current) => ({ ...current, closesOn: event.target.value }))
          }
        />
        {fieldErrors.closesOn && <span id="opportunity-close-error" className="field-error">{fieldErrors.closesOn}</span>}
      </label>
      <label>
        External application link (HTTPS)
        <input
          type="url"
          aria-invalid={Boolean(fieldErrors.applicationUrl)}
          aria-describedby={
            fieldErrors.applicationUrl ? "opportunity-link-error" : undefined
          }
          maxLength={2048}
          value={form.applicationUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, applicationUrl: event.target.value }))
          }
        />
        {fieldErrors.applicationUrl && <span id="opportunity-link-error" className="field-error">{fieldErrors.applicationUrl}</span>}
      </label>
      <label>
        Application/contact instructions
        <textarea
          aria-invalid={Boolean(fieldErrors.instructions)}
          aria-describedby={
            fieldErrors.instructions ? "opportunity-instructions-error" : undefined
          }
          maxLength={5000}
          value={form.instructions}
          onChange={(event) =>
            setForm((current) => ({ ...current, instructions: event.target.value }))
          }
        />
        {fieldErrors.instructions && <span id="opportunity-instructions-error" className="field-error">{fieldErrors.instructions}</span>}
        <span className="field-hint">Provide either a link or instructions, not both.</span>
      </label>
    </>
  );

  return (
    <div className="content-page">
      <section className="content-intro">
        <div>
          <p className="eyebrow">Internal opportunities</p>
          <h2>Opportunities and development</h2>
          <p>Browse current opportunities available to your audience.</p>
        </div>
        {canPublish && (
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setSuccess(null);
              setIsFormOpen(true);
            }}
          >
            Create opportunity
          </button>
        )}
      </section>

      {success && <p className="success-message" role="status">{success}</p>}

      <form className="content-filters" onSubmit={submitFilters}>
        <label>
          Search opportunities
          <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} />
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option>
            {Object.entries(opportunityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">All available audiences</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </label>
        <label>
          Closing from
          <input
            type="date"
            value={closingFrom}
            onChange={(event) => setClosingFrom(event.target.value)}
          />
        </label>
        <label>
          Closing through
          <input
            type="date"
            value={closingTo}
            onChange={(event) => setClosingTo(event.target.value)}
          />
        </label>
        <button className="button button-secondary" type="submit">Apply filters</button>
      </form>

      {canPublish && drafts.length > 0 && (
        <section className="content-drafts" aria-label="My opportunity drafts">
          <h3>My drafts</h3>
          <ul>
            {drafts.map((draft) => (
              <li key={draft.id}>
                <span>{draft.title}</span>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setDraftId(draft.id);
                    setForm({
                      title: draft.title,
                      type: draft.type,
                      description: draft.description,
                      departmentIds: draft.audienceDepartmentIds,
                      opensOn: draft.opensAt?.slice(0, 10) ?? "",
                      closesOn: draft.closesAt?.slice(0, 10) ?? "",
                      applicationUrl: draft.applicationUrl ?? "",
                      instructions: draft.instructions ?? "",
                    });
                    setFormStatus(null);
                    setFormError(null);
                    setIsFormOpen(true);
                  }}
                >
                  Edit draft: {draft.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="content-error" role="alert">
          <p>{error}</p>
          {error === "We couldn’t load opportunities. Try again." && (
            <button className="button button-secondary" type="button" onClick={() => void load()}>
              Try again
            </button>
          )}
        </div>
      )}
      {isLoading ? (
        <section className="content-loading" role="status" aria-label="Loading opportunities">
          <p>Loading opportunities…</p>
          <div className="content-skeleton" aria-hidden="true" />
          <div className="content-skeleton" aria-hidden="true" />
        </section>
      ) : items.length === 0 ? (
        <p className="content-empty">No opportunities are available right now.</p>
      ) : (
        <div className="content-layout">
          <section aria-label="Opportunity list" className="content-list">
            {items.map((item) => (
              <article className="content-card" key={item.id}>
                <p className="eyebrow">{opportunityLabels[item.type]}</p>
                <h3>{item.title}</h3>
                <p>{item.description.length > 180 ? `${item.description.slice(0, 180)}…` : item.description}</p>
                <div className="content-metadata">
                  <span>{item.departmentNames.length ? item.departmentNames.join(", ") : "Institution-wide"}</span>
                  {item.closesAt && (
                    <span>Closing date: <time dateTime={item.closesAt}>{dateLabel(item.closesAt)}</time></span>
                  )}
                  <span>{item.publisherName}</span>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void openDetail(item)}
                >
                  View opportunity details
                </button>
              </article>
            ))}
          </section>
          {isDetailLoading && <p className="content-state" role="status">Loading opportunity…</p>}
          {selected && (
            <article className="content-detail" aria-label="Opportunity details">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Close details
              </button>
              <p className="eyebrow">{opportunityLabels[selected.type]}</p>
              <h3>{selected.title}</h3>
              <p>{selected.description}</p>
              <dl className="content-metadata-list">
                <div><dt>Publisher</dt><dd>{selected.publisherName}</dd></div>
                <div>
                  <dt>Audience departments</dt>
                  <dd>{selected.departmentNames.length ? selected.departmentNames.join(", ") : "Institution-wide"}</dd>
                </div>
                {selected.opensAt && (
                  <div><dt>Opens</dt><dd><time dateTime={selected.opensAt}>{dateLabel(selected.opensAt)}</time></dd></div>
                )}
                {selected.closesAt && (
                  <div><dt>Closing date</dt><dd><time dateTime={selected.closesAt}>{dateLabel(selected.closesAt)}</time></dd></div>
                )}
              </dl>
              {selected.applicationUrl ? (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={isOpeningApplication}
                  onClick={() => void openApplication()}
                >
                  {isOpeningApplication ? "Checking opportunity…" : "Open external application"}
                </button>
              ) : (
                <section className="content-guidance">
                  <h4>Application/contact instructions</h4>
                  <p>{selected.instructions}</p>
                </section>
              )}
            </article>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="content-dialog-backdrop">
        <section className="content-dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-dialog-title">
          <h2 id="opportunity-dialog-title">
            {draftId ? "Edit opportunity draft" : "Create opportunity"}
          </h2>
          {formError && <p className="request-error" role="alert">{formError}</p>}
          {formStatus && <p className="success-message" role="status">{formStatus}</p>}
          <div className="content-form">{formFields}</div>
          <div className="request-form-actions">
            <button className="button button-secondary" type="button" onClick={closeForm}>Cancel</button>
            <button className="button button-secondary" type="button" disabled={isSaving} onClick={() => void saveDraft(false)}>
              Save draft
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (validateForm()) setIsConfirmOpen(true);
              }}
            >
              Review and publish
            </button>
          </div>
        </section>
        </div>
      )}

      {isConfirmOpen && (
        <div className="content-dialog-backdrop">
        <section className="content-dialog" role="dialog" aria-modal="true" aria-labelledby="opportunity-confirm-title">
          <h2 id="opportunity-confirm-title">Confirm publication</h2>
          <p>Publish “{form.title.trim()}” to the selected audience?</p>
          <div className="request-form-actions">
            <button className="button button-secondary" type="button" disabled={isSaving} onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsConfirmOpen(false);
                void saveDraft(true);
              }}
            >
              Confirm and publish
            </button>
          </div>
        </section>
        </div>
      )}
    </div>
  );
}
