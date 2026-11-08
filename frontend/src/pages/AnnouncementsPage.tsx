import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../app/auth/AuthContext.js";
import {
  contentErrorMessage,
  fetchContentJson,
  parseAnnouncements,
  parseAnnouncementDrafts,
  parseDepartments,
  parsePublishingPermissions,
  type Announcement,
  type AnnouncementDraft,
  type ContentDepartment,
} from "../app/content.js";
import { isRecord } from "../app/api.js";

interface AnnouncementForm {
  title: string;
  body: string;
  departmentIds: string[];
  expiresOn: string;
}

const emptyForm: AnnouncementForm = {
  title: "",
  body: "",
  departmentIds: [],
  expiresOn: "",
};

function announcementPayload(form: AnnouncementForm) {
  return {
    title: form.title.trim(),
    body: form.body.trim(),
    audienceDepartmentIds: form.departmentIds,
    expiresAt: form.expiresOn
      ? new Date(`${form.expiresOn}T23:59:59.999Z`).toISOString()
      : null,
    publish: false,
  };
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function AnnouncementsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [drafts, setDrafts] = useState<AnnouncementDraft[]>([]);
  const [departments, setDepartments] = useState<ContentDepartment[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
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
      if (departmentId) query.set("departmentId", departmentId);
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      const [feed, permissions, options, draftResponse] = await Promise.all([
        fetchContentJson(`/announcements${suffix}`, accessToken),
        fetchContentJson("/content/publishing-permissions", accessToken),
        fetchContentJson("/requests/options", accessToken),
        fetchContentJson("/announcements/drafts", accessToken),
      ]);
      const parsedItems = parseAnnouncements(feed.body);
      const parsedPermissions = parsePublishingPermissions(permissions.body);
      const parsedDepartments = parseDepartments(options.body);
      const parsedDrafts = parseAnnouncementDrafts(draftResponse.body);
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
        throw new Error("We couldn’t load announcements. Try again.");
      }
      setItems(parsedItems);
      setCanPublish(parsedPermissions.announcements);
      setDepartments(parsedDepartments);
      setDrafts(parsedDrafts);
    } catch {
      setError("We couldn’t load announcements. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, departmentId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(item: Announcement) {
    setSelected(null);
    setIsDetailLoading(true);
    try {
      const { response, body } = await fetchContentJson(
        `/announcements/${item.id}`,
        accessToken,
      );
      if (!response.ok || !isRecord(body) || !isRecord(body.item)) {
        setError("We couldn’t open this announcement. Try again.");
        return;
      }
      const detail = parseAnnouncements({ items: [body.item] })?.[0];
      if (!detail) {
        setError("We couldn’t open this announcement. Try again.");
        return;
      }
      setError(null);
      setSelected(detail);
    } catch {
      setError("We couldn’t open this announcement. Try again.");
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
    if (form.body.trim().length < 10 || form.body.trim().length > 5000) {
      errors.body = "Enter a message between 10 and 5,000 characters.";
    }
    if (
      form.expiresOn &&
      new Date(`${form.expiresOn}T23:59:59.999Z`).getTime() <= Date.now()
    ) {
      errors.expiresOn = "Choose a future expiry date.";
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
      const payload = announcementPayload(form);
      const saved = await fetchContentJson(
        draftId ? `/announcements/${draftId}` : "/announcements",
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
            "We couldn’t save this announcement. Try again.",
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
          body: payload.body,
          expiresAt: payload.expiresAt,
          audienceDepartmentIds: payload.audienceDepartmentIds,
        },
        ...current.filter((draft) => draft.id !== savedId),
      ]);
      if (!publishAfterSave) {
        setFormStatus("Draft saved. You can continue editing or publish it.");
        return;
      }

      const published = await fetchContentJson(
        `/announcements/${savedId}/publish`,
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
            "We couldn’t publish this announcement. Your draft is saved.",
          ),
        );
        return;
      }
      closeForm();
      setSuccess("Announcement published.");
      await load();
    } catch {
      setFormError("We couldn’t save this announcement. Try again.");
    } finally {
      setIsSaving(false);
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
          aria-describedby={fieldErrors.title ? "announcement-title-error" : undefined}
          maxLength={120}
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
        />
        {fieldErrors.title && (
          <span id="announcement-title-error" className="field-error">
            {fieldErrors.title}
          </span>
        )}
      </label>
      <label>
        Body
        <textarea
          aria-invalid={Boolean(fieldErrors.body)}
          aria-describedby={fieldErrors.body ? "announcement-body-error" : undefined}
          maxLength={5000}
          value={form.body}
          onChange={(event) =>
            setForm((current) => ({ ...current, body: event.target.value }))
          }
        />
        {fieldErrors.body && (
          <span id="announcement-body-error" className="field-error">
            {fieldErrors.body}
          </span>
        )}
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
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <span className="field-hint">
          Leave empty for an institution-wide announcement.
        </span>
      </label>
      <label>
        Expires on (UTC, optional)
        <input
          type="date"
          aria-invalid={Boolean(fieldErrors.expiresOn)}
          aria-describedby={
            fieldErrors.expiresOn ? "announcement-expiry-error" : undefined
          }
          value={form.expiresOn}
          onChange={(event) =>
            setForm((current) => ({ ...current, expiresOn: event.target.value }))
          }
        />
        {fieldErrors.expiresOn && (
          <span id="announcement-expiry-error" className="field-error">
            {fieldErrors.expiresOn}
          </span>
        )}
      </label>
    </>
  );

  return (
    <div className="content-page">
      <section className="content-intro">
        <div>
          <p className="eyebrow">Campus communications</p>
          <h2>Institutional announcements</h2>
          <p>Official updates for your audience.</p>
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
            Create announcement
          </button>
        )}
      </section>

      {success && <p className="success-message" role="status">{success}</p>}

      <form className="content-filters" onSubmit={submitFilters}>
        <label>
          Search announcements
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={80}
          />
        </label>
        <label>
          Department
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">All available audiences</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          Apply filters
        </button>
      </form>

      {canPublish && drafts.length > 0 && (
        <section className="content-drafts" aria-label="My announcement drafts">
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
                      body: draft.body,
                      departmentIds: draft.audienceDepartmentIds,
                      expiresOn: draft.expiresAt?.slice(0, 10) ?? "",
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
          <button className="button button-secondary" type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {isLoading ? (
        <section className="content-loading" role="status" aria-label="Loading announcements">
          <p>Loading announcements…</p>
          <div className="content-skeleton" aria-hidden="true" />
          <div className="content-skeleton" aria-hidden="true" />
        </section>
      ) : items.length === 0 ? (
        <p className="content-empty">There are no announcements for this audience yet.</p>
      ) : (
        <div className="content-layout">
          <section aria-label="Announcement feed" className="content-list">
            {items.map((item) => (
              <article className="content-card" key={item.id}>
                <p className="eyebrow">
                  {item.audienceDepartmentNames.length
                    ? `Audience: ${item.audienceDepartmentNames.join(", ")}`
                    : "Institution-wide"}
                </p>
                <h3>{item.title}</h3>
                <p>{item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body}</p>
                <div className="content-metadata">
                  <span>{item.publisherName}</span>
                  <time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void openDetail(item)}
                >
                  Read announcement: {item.title}
                </button>
              </article>
            ))}
          </section>
          {isDetailLoading && (
            <p className="content-state" role="status">Loading announcement…</p>
          )}
          {selected && (
            <article className="content-detail" aria-label="Announcement details">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Close details
              </button>
              <h3>{selected.title}</h3>
              <p>{selected.body}</p>
              <dl className="content-metadata-list">
                <div><dt>Publisher</dt><dd>{selected.publisherName}</dd></div>
                <div>
                  <dt>Published</dt>
                  <dd><time dateTime={selected.publishedAt}>{dateLabel(selected.publishedAt)}</time></dd>
                </div>
                <div>
                  <dt>Audience</dt>
                  <dd>{selected.audienceDepartmentNames.length
                    ? selected.audienceDepartmentNames.join(", ")
                    : "Institution-wide"}</dd>
                </div>
                {selected.expiresAt && (
                  <div>
                    <dt>Expires</dt>
                    <dd><time dateTime={selected.expiresAt}>{dateLabel(selected.expiresAt)}</time></dd>
                  </div>
                )}
              </dl>
            </article>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="content-dialog-backdrop">
        <section className="content-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-dialog-title">
          <h2 id="announcement-dialog-title">
            {draftId ? "Edit announcement draft" : "Create announcement"}
          </h2>
          {formError && <p className="request-error" role="alert">{formError}</p>}
          {formStatus && <p className="success-message" role="status">{formStatus}</p>}
          <div className="content-form">{formFields}</div>
          <div className="request-form-actions">
            <button className="button button-secondary" type="button" onClick={closeForm}>
              Cancel
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={isSaving}
              onClick={() => void saveDraft(false)}
            >
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
        <section className="content-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-confirm-title">
          <h2 id="announcement-confirm-title">Confirm publication</h2>
          <p>
            Publish “{form.title.trim()}” to{" "}
            {form.departmentIds.length
              ? "the selected departments"
              : "the whole institution"}?
          </p>
          <div className="request-form-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={isSaving}
              onClick={() => setIsConfirmOpen(false)}
            >
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
