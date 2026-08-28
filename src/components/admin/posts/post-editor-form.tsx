"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ADMIN_POST_AUTOSAVE_INTERVAL_MS } from "@/contracts/post-admin";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { PostTaxonomyOptions } from "@/components/admin/taxonomy/taxonomy-options";

import { LanguagesIcon } from "lucide-react";

import { PostCoverPicker, type CoverPreview } from "./post-cover-picker";
import { PostGalleryPicker } from "./post-gallery-picker";
import { RichTextField } from "./post-rich-text-field";
import { translatePostDraft } from "./post-translate-server-action";
import { FIELD_SCOPED_FAILURES, failureMessageKey, isFailureCode } from "./post-editor-errors";
import {
  buildAutosavePayload,
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,
  type PostEditorDraft,
  type PostEditorType,
  type PostEditorLocale,
} from "./post-editor-payload";

type PostEditorFormProps = {
  mode: "create" | "edit";
  postType?: PostEditorType;
  listHref: string;
  initialDraft?: PostEditorDraft;
  /** Present only in edit mode; drives optimistic locking. */
  postId?: string;
  expectedVersion?: number;
  taxonomyOptions?: PostTaxonomyOptions;
  /** Current cover (edit mode) so the picker shows it without a refetch. */
  initialCover?: CoverPreview | null;
  /** Previews for already-attached gallery images (edit mode) so they render without a refetch. */
  initialGalleryPreviews?: Record<string, CoverPreview>;
  uploadPublicUrl: string;
  mutationBusy?: boolean;
  beginMutation?: () => { token: number; version: number } | null;
  finishMutation?: (token: number, nextVersion?: number) => void;
};

type AutosaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "conflict" }
  | { status: "error" };

const EMPTY_TAXONOMY_OPTIONS: PostTaxonomyOptions = {categories: [], tags: []};

/** Bordered panel used for every block of the two-column editor layout. */
function EditorCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-4 sm:p-5", className)}>
      {title ? (
        <h2 className="mb-3 font-display text-sm font-semibold text-slate-700">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function PostEditorForm({
  mode,
  postType = "BERITA",
  listHref,
  initialDraft,
  postId,
  expectedVersion,
  taxonomyOptions = EMPTY_TAXONOMY_OPTIONS,
  initialCover = null,
  initialGalleryPreviews = {},
  uploadPublicUrl,
  mutationBusy = false,
  beginMutation,
  finishMutation,
}: PostEditorFormProps) {
  // Resolve strings on the client. This form is a Client Component, so it cannot receive functions
  // (e.g. a label formatter) across the server/client boundary — doing so crashes the page render.
  const t = useTranslations("AdminPostEditor");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<PostEditorDraft>(() => initialDraft ?? emptyDraft(postType));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveState>({ status: "idle" });

  // Everything the autosave timer needs, read through a ref so the interval always sees the latest
  // draft/version without being torn down and rebuilt on every keystroke.
  const latest = useRef({ draft, submitting });
  useEffect(() => {
    latest.current = { draft, submitting };
  });
  // Serialised snapshot of the last persisted draft; a mismatch means "dirty, worth autosaving".
  const savedSnapshotRef = useRef(JSON.stringify(initialDraft ?? emptyDraft()));
  // Once a conflict is seen, stop autosaving — the local version can no longer be trusted.
  const stoppedRef = useRef(false);

  const runAutosave = useCallback(async () => {
    if (
      mode !== "edit"
      || !postId
      || stoppedRef.current
      || !beginMutation
      || !finishMutation
    ) return;
    const { draft: current, submitting: busy } = latest.current;
    // Never autosave over an in-flight manual submit, and skip when nothing changed.
    if (busy) return;
    const snapshot = JSON.stringify(current);
    if (snapshot === savedSnapshotRef.current) return;

    const lease = beginMutation();
    if (!lease) return;

    const parsed = buildAutosavePayload(
      current,
      postId,
      lease.version,
    );
    // An invalid draft is not an autosave error; the manual save surfaces the field messages.
    if (!parsed.success) {
      finishMutation(lease.token);
      return;
    }

    setAutosave({ status: "saving" });
    let released = false;
    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: current.type === "KOLOM" ? "AUTOSAVE_COLUMN" : "AUTOSAVE",
          payload: parsed.data,
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        savedSnapshotRef.current = snapshot;
        const nextVersion = (result as { version?: unknown }).version;
        finishMutation(
          lease.token,
          typeof nextVersion === "number" ? nextVersion : undefined,
        );
        released = true;
        setAutosave({ status: "saved", at: Date.now() });
        return;
      }
      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      if (code === "VERSION_CONFLICT") {
        stoppedRef.current = true;
        setAutosave({ status: "conflict" });
      } else {
        setAutosave({ status: "error" });
      }
    } catch {
      setAutosave({ status: "error" });
    } finally {
      if (!released) finishMutation(lease.token);
    }
  }, [mode, postId, beginMutation, finishMutation]);

  useEffect(() => {
    if (mode !== "edit") return;
    const id = window.setInterval(() => void runAutosave(), ADMIN_POST_AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [mode, runAutosave]);

  function updateTranslation(
    locale: PostEditorLocale,
    key: "title" | "excerpt" | "content",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...current.translations[locale], [key]: value },
      },
    }));
  }

  const [translateStatus, setTranslateStatus] = useState<Record<"en" | "ar", "idle" | "loading" | "done" | "error">>({
    en: "idle", ar: "idle",
  });
  const [translateError, setTranslateError] = useState<Record<"en" | "ar", string | null>>({ en: null, ar: null });

  async function handleTranslate(locale: "en" | "ar") {
    setTranslateStatus((current) => ({ ...current, [locale]: "loading" }));
    setTranslateError((current) => ({ ...current, [locale]: null }));

    const result = await translatePostDraft(locale, {
      title: draft.translations.id.title,
      excerpt: draft.translations.id.excerpt,
      content: draft.translations.id.content,
    });

    if (result.ok) {
      setDraft((current) => ({
        ...current,
        translations: {
          ...current.translations,
          [locale]: { title: result.title, excerpt: result.excerpt, content: result.content },
        },
      }));
      setTranslateStatus((current) => ({ ...current, [locale]: "done" }));
    } else {
      setTranslateStatus((current) => ({ ...current, [locale]: "error" }));
      setTranslateError((current) => ({
        ...current,
        [locale]: t(`translateErrors.${result.code}`, { fallback: result.code }),
      }));
    }
  }

  function toggleTag(tagId: string, selected: boolean) {
    setDraft((current) => ({
      ...current,
      tagIds: selected
        ? [...new Set([...current.tagIds, tagId])]
        : current.tagIds.filter((id) => id !== tagId),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || mutationBusy) return;
    setFieldErrors({});
    setFormError(null);

    const lease = mode === "edit" && beginMutation ? beginMutation() : null;
    if (mode === "edit" && beginMutation && !lease) return;
    const mutationVersion = lease?.version ?? expectedVersion ?? 0;
    const parsed = mode === "create"
      ? buildCreatePayload(draft)
      : buildUpdatePayload(draft, postId ?? "", mutationVersion);

    if (!parsed.success) {
      if (lease && finishMutation) finishMutation(lease.token);
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      setFormError(t("error.VALIDATION_FAILED"));
      return;
    }

    setSubmitting(true);
    let released = false;
    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Same-origin so the server's CSRF origin check passes; credentials ride the session cookie.
        credentials: "same-origin",
        body: JSON.stringify({
          action: draft.type === "KOLOM"
            ? mode === "create" ? "CREATE_COLUMN" : "UPDATE_COLUMN"
            : mode === "create" ? "CREATE" : "UPDATE",
          payload: parsed.data,
        }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        const nextVersion = (result as { version?: unknown }).version;
        if (lease && finishMutation) {
          finishMutation(
            lease.token,
            typeof nextVersion === "number" ? nextVersion : undefined,
          );
          released = true;
        }
        router.push(listHref);
        router.refresh();
        return;
      }

      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      const messageKey = failureMessageKey(isFailureCode(code) ? code : "UNAVAILABLE");
      const message = t(messageKey);
      const scopedField = isFailureCode(code) ? FIELD_SCOPED_FAILURES[code] : undefined;
      if (scopedField) {
        setFieldErrors({ [scopedField]: message });
      } else {
        setFormError(message);
      }
    } catch {
      // Network/parse failure must read like the generic unavailable state, never a stack.
      setFormError(t("error.UNAVAILABLE"));
    } finally {
      if (lease && finishMutation && !released) finishMutation(lease.token);
      setSubmitting(false);
    }
  }

  const autosaveNotice =
    autosave.status === "saving"
      ? t("autosave.saving")
      : autosave.status === "saved"
        ? t("autosave.saved", {
            time: new Date(autosave.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })
        : autosave.status === "conflict"
          ? t("autosave.conflict")
          : autosave.status === "error"
            ? t("autosave.error")
            : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column — the story itself. */}
        <div className="flex min-w-0 flex-col gap-6">
          <EditorCard>
            <FieldSet>
              <FieldLegend>{t("localeLegend", { locale: t("locale.id") })}</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${formId}-id-title`}>{t("title")}</FieldLabel>
                  <Input
                    id={`${formId}-id-title`}
                    value={draft.translations.id.title}
                    onChange={(event) => updateTranslation("id", "title", event.target.value)}
                    aria-invalid={fieldErrors["translations.id.title"] ? true : undefined}
                    autoComplete="off"
                    className="h-11 font-medium md:text-base"
                  />
                  {fieldErrors["translations.id.title"] ? (
                    <FieldError>{fieldErrors["translations.id.title"]}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`${formId}-id-excerpt`}>{t("excerpt")}</FieldLabel>
                  <Textarea
                    id={`${formId}-id-excerpt`}
                    rows={2}
                    value={draft.translations.id.excerpt}
                    onChange={(event) => updateTranslation("id", "excerpt", event.target.value)}
                    aria-invalid={fieldErrors["translations.id.excerpt"] ? true : undefined}
                  />
                  {fieldErrors["translations.id.excerpt"] ? (
                    <FieldError>{fieldErrors["translations.id.excerpt"]}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <span id={`${formId}-id-content-label`} className="text-sm font-medium">
                    {t("content")}
                  </span>
                  <RichTextField
                    value={draft.translations.id.content}
                    onChange={(html) => updateTranslation("id", "content", html)}
                    ariaLabel={t("content")}
                  />
                  <FieldDescription>{t("contentDescription")}</FieldDescription>
                  {fieldErrors["translations.id.content"] ? (
                    <FieldError>{fieldErrors["translations.id.content"]}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
            </FieldSet>
          </EditorCard>

          <EditorCard>
            <PostGalleryPicker
              value={draft.images}
              onChange={(images) => setDraft((c) => ({ ...c, images }))}
              initialPreviews={initialGalleryPreviews}
              uploadPublicUrl={uploadPublicUrl}
            />
          </EditorCard>

          <EditorCard>
            <FieldSet>
              <FieldLegend variant="label">{t("translateSectionTitle")}</FieldLegend>
              <FieldDescription>{t("translateSectionDescription")}</FieldDescription>
              <FieldGroup>
                {(["en", "ar"] as const).map((locale) => (
                  <Field key={locale} orientation="horizontal" className="flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleTranslate(locale)}
                      disabled={translateStatus[locale] === "loading"}
                    >
                      {translateStatus[locale] === "loading" ? <Spinner data-icon /> : <LanguagesIcon data-icon aria-hidden strokeWidth={1.5} />}
                      {translateStatus[locale] === "loading"
                        ? t("translateLoading")
                        : t(draft.translations[locale].title ? "translateRetryButton" : "translateButton", { locale: t(`locale.${locale}`) })}
                    </Button>
                    {translateStatus[locale] === "done" ? (
                      <span className="text-sm text-muted-foreground">{t("translateDone", { locale: t(`locale.${locale}`) })}</span>
                    ) : null}
                    {translateStatus[locale] === "error" && translateError[locale] ? (
                      <span role="alert" className="text-sm text-destructive">{translateError[locale]}</span>
                    ) : null}
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          </EditorCard>
        </div>

        {/* Sidebar — publishing metadata, WordPress style. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <EditorCard title={t("panel.publish")}>
            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={submitting || mutationBusy} className="w-full">
                {submitting ? <Spinner data-icon /> : null}
                {submitting
                  ? t("submitting")
                  : mode === "create"
                    ? t("submitCreate")
                    : t("submitUpdate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(listHref)}
                className="w-full"
              >
                {t("cancel")}
              </Button>
              {mode === "edit" ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm text-muted-foreground"
                  data-autosave-status={autosave.status}
                >
                  {autosaveNotice}
                </p>
              ) : null}
            </div>
          </EditorCard>

          <EditorCard title={t("panel.link")}>
            <FieldGroup>
              {draft.type === "KOLOM" ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-column-type`}>{t("columnType")}</FieldLabel>
                  <select
                    id={`${formId}-column-type`}
                    value={draft.columnType ?? ""}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      columnType: event.target.value as NonNullable<PostEditorDraft["columnType"]>,
                    }))}
                    aria-invalid={fieldErrors.columnType ? true : undefined}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="DEKAN">{t("columnRole.DEKAN")}</option>
                    <option value="DOSEN">{t("columnRole.DOSEN")}</option>
                    <option value="MAHASISWA">{t("columnRole.MAHASISWA")}</option>
                  </select>
                  <FieldDescription>{t("columnTypeDescription")}</FieldDescription>
                  {fieldErrors.columnType ? <FieldError>{fieldErrors.columnType}</FieldError> : null}
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor={`${formId}-slug`}>{t("slug")}</FieldLabel>
                <Input
                  id={`${formId}-slug`}
                  name="slug"
                  value={draft.slug}
                  onChange={(event) => setDraft((c) => ({ ...c, slug: event.target.value }))}
                  aria-invalid={fieldErrors.slug ? true : undefined}
                  aria-describedby={`${formId}-slug-description`}
                  autoComplete="off"
                />
                <FieldDescription id={`${formId}-slug-description`}>
                  {t("slugDescription")}
                </FieldDescription>
                {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
              </Field>
            </FieldGroup>
          </EditorCard>

          <EditorCard title={t("panel.featured")}>
            <div className="flex flex-col gap-2">
              <Field orientation="horizontal">
                <Checkbox
                  id={`${formId}-featured`}
                  name="isFeatured"
                  checked={draft.isFeatured}
                  onCheckedChange={(checked) =>
                    setDraft((c) => ({ ...c, isFeatured: checked === true }))
                  }
                />
                <FieldLabel htmlFor={`${formId}-featured`}>{t("featured")}</FieldLabel>
              </Field>
              <FieldDescription>{t("featuredDescription")}</FieldDescription>
            </div>
          </EditorCard>

          <EditorCard title={t("panel.classification")}>
            <FieldSet>
              <FieldDescription>{t("taxonomyDescription")}</FieldDescription>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors.categoryId)}>
                  <FieldLabel htmlFor={`${formId}-category`}>{t("category")}</FieldLabel>
                  <select
                    id={`${formId}-category`}
                    value={draft.categoryId ?? ""}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      categoryId: event.target.value || null,
                    }))}
                    aria-invalid={fieldErrors.categoryId ? true : undefined}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">{t("categoryNone")}</option>
                    {taxonomyOptions.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                  <FieldDescription>{t("categoryDescription")}</FieldDescription>
                  {fieldErrors.categoryId ? <FieldError>{fieldErrors.categoryId}</FieldError> : null}
                </Field>

                <Field>
                  <FieldLabel>{t("tags")}</FieldLabel>
                  {taxonomyOptions.tags.length > 0 ? (
                    <div className="grid gap-2">
                      {taxonomyOptions.tags.map((tag) => {
                        const checked = draft.tagIds.includes(tag.id);
                        return (
                          <Field key={tag.id} orientation="horizontal" className="rounded-lg border border-border p-3">
                            <Checkbox
                              id={`${formId}-tag-${tag.id}`}
                              checked={checked}
                              onCheckedChange={(value) => toggleTag(tag.id, value === true)}
                            />
                            <FieldLabel htmlFor={`${formId}-tag-${tag.id}`}>{tag.label}</FieldLabel>
                          </Field>
                        );
                      })}
                    </div>
                  ) : (
                    <FieldDescription>{t("tagsEmpty")}</FieldDescription>
                  )}
                  <FieldDescription>{t("tagsDescription")}</FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          </EditorCard>

          <EditorCard>
            <PostCoverPicker
              value={draft.coverMediaId}
              onChange={(coverMediaId) => setDraft((c) => ({ ...c, coverMediaId }))}
              initialCover={initialCover}
              uploadPublicUrl={uploadPublicUrl}
            />
          </EditorCard>
        </div>
      </div>
    </form>
  );
}
