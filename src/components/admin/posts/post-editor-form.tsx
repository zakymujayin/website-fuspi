"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

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

import { FIELD_SCOPED_FAILURES, failureMessageKey, isFailureCode } from "./post-editor-errors";
import {
  POST_EDITOR_LOCALES,
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,
  type PostEditorCarriedFields,
  type PostEditorDraft,
  type PostEditorLocale,
} from "./post-editor-payload";

export type PostEditorLabels = {
  slug: string;
  slugDescription: string;
  featured: string;
  featuredDescription: string;
  localeLegend: (locale: string) => string;
  localeOptional: string;
  title: string;
  excerpt: string;
  content: string;
  contentDescription: string;
  submitCreate: string;
  submitUpdate: string;
  submitting: string;
  cancel: string;
  localeName: Record<PostEditorLocale, string>;
  errorFor: (key: string) => string;
};

type PostEditorFormProps = {
  mode: "create" | "edit";
  labels: PostEditorLabels;
  listHref: string;
  initialDraft?: PostEditorDraft;
  /** Present only in edit mode; drives optimistic locking and field preservation. */
  postId?: string;
  expectedVersion?: number;
  carried?: PostEditorCarriedFields;
};

const CREATE_CARRIED: PostEditorCarriedFields = {
  categoryId: null,
  coverMediaId: null,
  tagIds: [],
};

export function PostEditorForm({
  mode,
  labels,
  listHref,
  initialDraft,
  postId,
  expectedVersion,
  carried,
}: PostEditorFormProps) {
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<PostEditorDraft>(() => initialDraft ?? emptyDraft());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);

    const parsed = mode === "create"
      ? buildCreatePayload(draft)
      : buildUpdatePayload(draft, postId ?? "", expectedVersion ?? 0, carried ?? CREATE_CARRIED);

    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      setFormError(labels.errorFor("error.VALIDATION_FAILED"));
      return;
    }

    setSubmitting(true);
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
        router.push(listHref);
        router.refresh();
        return;
      }

      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      const messageKey = failureMessageKey(isFailureCode(code) ? code : "UNAVAILABLE");
      const message = labels.errorFor(messageKey);
      const scopedField = isFailureCode(code) ? FIELD_SCOPED_FAILURES[code] : undefined;
      if (scopedField) {
        setFieldErrors({ [scopedField]: message });
      } else {
        setFormError(message);
      }
    } catch {
      // Network/parse failure must read like the generic unavailable state, never a stack.
      setFormError(labels.errorFor("error.UNAVAILABLE"));
    } finally {
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
          <FieldLabel htmlFor={`${formId}-slug`}>{labels.slug}</FieldLabel>
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
            {labels.slugDescription}
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
          <FieldLabel htmlFor={`${formId}-featured`}>{labels.featured}</FieldLabel>
        </Field>
        <FieldDescription>{labels.featuredDescription}</FieldDescription>
      </FieldGroup>

      {POST_EDITOR_LOCALES.map((locale) => {
        const required = locale === "id";
        const translation = draft.translations[locale];
        return (
          <FieldSet key={locale}>
            <FieldLegend>
              {labels.localeLegend(labels.localeName[locale])}
              {required ? null : (
                <span className="ms-2 text-sm font-normal text-muted-foreground">
                  {labels.localeOptional}
                </span>
              )}
            </FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${formId}-${locale}-title`}>{labels.title}</FieldLabel>
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
                <FieldLabel htmlFor={`${formId}-${locale}-excerpt`}>{labels.excerpt}</FieldLabel>
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
                <FieldLabel htmlFor={`${formId}-${locale}-content`}>{labels.content}</FieldLabel>
                <Textarea
                  id={`${formId}-${locale}-content`}
                  rows={10}
                  value={translation.content}
                  onChange={(event) => updateTranslation(locale, "content", event.target.value)}
                  aria-invalid={fieldErrors[`translations.${locale}.content`] ? true : undefined}
                  aria-describedby={`${formId}-${locale}-content-description`}
                  dir={locale === "ar" ? "rtl" : undefined}
                />
                <FieldDescription id={`${formId}-${locale}-content-description`}>
                  {labels.contentDescription}
                </FieldDescription>
                {fieldErrors[`translations.${locale}.content`] ? (
                  <FieldError>{fieldErrors[`translations.${locale}.content`]}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </FieldSet>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner data-icon /> : null}
          {submitting
            ? labels.submitting
            : mode === "create"
              ? labels.submitCreate
              : labels.submitUpdate}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)}>
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
