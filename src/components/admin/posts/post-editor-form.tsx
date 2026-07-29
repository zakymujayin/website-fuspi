"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { ADMIN_POST_AUTOSAVE_INTERVAL_MS } from "@/contracts/post-admin";

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

import { PostCoverPicker, type CoverPreview } from "./post-cover-picker";
import { RichTextField } from "./post-rich-text-field";
import { FIELD_SCOPED_FAILURES, failureMessageKey, isFailureCode } from "./post-editor-errors";
import {
  POST_EDITOR_LOCALES,
  buildAutosavePayload,
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,
  type PostEditorCarriedFields,
  type PostEditorDraft,
  type PostEditorLocale,
} from "./post-editor-payload";

type PostEditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialDraft?: PostEditorDraft;
  /** Present only in edit mode; drives optimistic locking and field preservation. */
  postId?: string;
  expectedVersion?: number;
  carried?: PostEditorCarriedFields;
  /** Current cover (edit mode) so the picker shows it without a refetch. */
  initialCover?: CoverPreview | null;
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

const CREATE_CARRIED: PostEditorCarriedFields = {
  categoryId: null,
  tagIds: [],
};

export function PostEditorForm({
  mode,
  listHref,
  initialDraft,
  postId,
  expectedVersion,
  carried,
  initialCover = null,
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
  const [draft, setDraft] = useState<PostEditorDraft>(() => initialDraft ?? emptyDraft());
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
      carried ?? CREATE_CARRIED,
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
        body: JSON.stringify({ action: "AUTOSAVE", payload: parsed.data }),
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
  }, [mode, postId, carried, beginMutation, finishMutation]);

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
      : buildUpdatePayload(draft, postId ?? "", mutationVersion, carried ?? CREATE_CARRIED);

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
          action: mode === "create" ? "CREATE" : "UPDATE",
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <FieldGroup>
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
      </FieldGroup>

      <PostCoverPicker
        value={draft.coverMediaId}
        onChange={(coverMediaId) => setDraft((c) => ({ ...c, coverMediaId }))}
        initialCover={initialCover}
        uploadPublicUrl={uploadPublicUrl}
      />

      {POST_EDITOR_LOCALES.map((locale) => {
        const required = locale === "id";
        const translation = draft.translations[locale];
        return (
          <FieldSet key={locale}>
            <FieldLegend>
              {t("localeLegend", { locale: t(`locale.${locale}`) })}
              {required ? null : (
                <span className="ms-2 text-sm font-normal text-muted-foreground">
                  {t("localeOptional")}
                </span>
              )}
            </FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${formId}-${locale}-title`}>{t("title")}</FieldLabel>
                <Input
                  id={`${formId}-${locale}-title`}
                  value={translation.title}
                  onChange={(event) => updateTranslation(locale, "title", event.target.value)}
                  aria-invalid={fieldErrors[`translations.${locale}.title`] ? true : undefined}
                  // Arabic content must be authored right-to-left from the first implementation.
                  dir={locale === "ar" ? "rtl" : undefined}
                  autoComplete="off"
                />
                {fieldErrors[`translations.${locale}.title`] ? (
                  <FieldError>{fieldErrors[`translations.${locale}.title`]}</FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor={`${formId}-${locale}-excerpt`}>{t("excerpt")}</FieldLabel>
                <Textarea
                  id={`${formId}-${locale}-excerpt`}
                  rows={2}
                  value={translation.excerpt}
                  onChange={(event) => updateTranslation(locale, "excerpt", event.target.value)}
                  aria-invalid={fieldErrors[`translations.${locale}.excerpt`] ? true : undefined}
                  dir={locale === "ar" ? "rtl" : undefined}
                />
                {fieldErrors[`translations.${locale}.excerpt`] ? (
                  <FieldError>{fieldErrors[`translations.${locale}.excerpt`]}</FieldError>
                ) : null}
              </Field>

              <Field>
                <span id={`${formId}-${locale}-content-label`} className="text-sm font-medium">
                  {t("content")}
                </span>
                <RichTextField
                  value={translation.content}
                  onChange={(html) => updateTranslation(locale, "content", html)}
                  ariaLabel={t("content")}
                  dir={locale === "ar" ? "rtl" : undefined}
                />
                <FieldDescription>{t("contentDescription")}</FieldDescription>
                {fieldErrors[`translations.${locale}.content`] ? (
                  <FieldError>{fieldErrors[`translations.${locale}.content`]}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </FieldSet>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting || mutationBusy}>
          {submitting ? <Spinner data-icon /> : null}
          {submitting
            ? t("submitting")
            : mode === "create"
              ? t("submitCreate")
              : t("submitUpdate")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)}>
          {t("cancel")}
        </Button>
        {mode === "edit" ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
            data-autosave-status={autosave.status}
          >
            {autosave.status === "saving"
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
                    : null}
          </p>
        ) : null}
      </div>
    </form>
  );
}
