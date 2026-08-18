"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { Textarea } from "@/components/ui/textarea";

import { PostCoverPicker, type CoverPreview } from "./post-cover-picker";
import { RichTextField } from "./post-rich-text-field";
import {
  COLUMN_EDITOR_LOCALES,
  COLUMN_TYPES,
  buildColumnCreatePayload,
  buildColumnUpdatePayload,
  emptyColumnDraft,
  type ColumnEditorDraft,
  type ColumnEditorLocale,
  type ColumnTypeValue,
} from "./column-editor-payload";

type ColumnEditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialDraft?: ColumnEditorDraft;
  postId?: string;
  expectedVersion?: number;
  initialCover?: CoverPreview | null;
  uploadPublicUrl: string;
};

/**
 * Kolom's create/edit form. Deliberately a sibling of `PostEditorForm`, not a `postType` branch
 * grafted onto it: Kolom has no taxonomy (category/tags) section, has a `columnType` selector BERITA
 * doesn't, and — until the admin transport contract is generalized past BERITA (see the task
 * handoff) — its Save action is gated rather than wired to a network call that would either be
 * rejected or silently misclassify the record as BERITA. It reuses the genuinely shared pieces
 * (`PostCoverPicker`, `RichTextField`, the `Field`/`FieldSet` primitives) rather than duplicating
 * them.
 */
export function ColumnEditorForm({
  mode,
  listHref,
  initialDraft,
  postId,
  expectedVersion,
  initialCover = null,
  uploadPublicUrl,
}: ColumnEditorFormProps) {
  const t = useTranslations("AdminColumnEditor");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<ColumnEditorDraft>(() => initialDraft ?? emptyColumnDraft());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState(false);

  function updateTranslation(
    locale: ColumnEditorLocale,
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

  /** Dotted Zod paths ("translations.id.title") so the form can attach errors to the right control. */
  function collectFieldErrors(
    issues: readonly { path: PropertyKey[]; message: string }[],
  ): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      const key = issue.path.map(String).join(".");
      if (key && !(key in errors)) errors[key] = issue.message;
    }
    return errors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setBlocked(false);

    const mutationVersion = expectedVersion ?? 0;
    const parsed = mode === "create"
      ? buildColumnCreatePayload(draft)
      : buildColumnUpdatePayload(draft, postId ?? "", mutationVersion);

    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      return;
    }

    // The payload is valid against the real Post contract (@/contracts/post). What's missing is
    // purely on the admin HTTP transport side — see AdminColumnEditor.blocked and the task handoff.
    // Surfacing that here, instead of calling /api/admin/posts, is what keeps this action from
    // silently writing the record as BERITA (toBeritaCreateInput always forces that today).
    setBlocked(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {blocked ? (
        <div
          role="status"
          className="rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <p className="font-medium">{t("blocked.title")}</p>
          <p className="mt-1">{t("blocked.description")}</p>
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

      <FieldSet>
        <FieldLegend>{t("columnTypeLegend")}</FieldLegend>
        <FieldDescription>{t("columnTypeDescription")}</FieldDescription>
        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.columnType)}>
            <select
              id={`${formId}-column-type`}
              aria-label={t("columnTypeLegend")}
              value={draft.columnType ?? ""}
              onChange={(event) => setDraft((current) => ({
                ...current,
                columnType: (event.target.value || null) as ColumnTypeValue | null,
              }))}
              aria-invalid={fieldErrors.columnType ? true : undefined}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                {t("columnTypeLegend")}
              </option>
              {COLUMN_TYPES.map((type) => (
                <option key={type} value={type}>{t(`columnType.${type}`)}</option>
              ))}
            </select>
            {fieldErrors.columnType ? <FieldError>{fieldErrors.columnType}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      {COLUMN_EDITOR_LOCALES.map((locale) => {
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
        <Button type="submit">
          {mode === "create" ? t("submitCreate") : t("submitUpdate")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
