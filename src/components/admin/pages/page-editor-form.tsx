"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
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

import { PageHeroPicker, type HeroPreview } from "./page-hero-picker";
import { PageLocaleTabs, PAGE_EDITOR_LOCALES, type PageEditorLocale } from "./page-tabs";
import { failureMessageKey, isFailureCode, FIELD_SCOPED_FAILURES } from "./page-editor-errors";
import {
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,
  hasTranslationContent,
  type PageEditorDraft,
} from "./page-editor-payload";
import { PageRichTextField } from "./page-rich-text-field";

type PageEditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialDraft?: PageEditorDraft;
  pageId?: string;
  expectedVersion?: number;
  initialHero?: HeroPreview | null;
  uploadPublicUrl: string;
  mutationBusy?: boolean;
  beginMutation?: () => { token: number; version: number } | null;
  finishMutation?: (token: number, nextVersion?: number) => void;
};

export function PageEditorForm({
  mode,
  listHref,
  initialDraft,
  pageId,
  expectedVersion,
  initialHero = null,
  uploadPublicUrl,
  mutationBusy = false,
  beginMutation,
  finishMutation,
}: PageEditorFormProps) {
  const t = useTranslations("AdminPageEditor");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<PageEditorDraft>(() => initialDraft ?? emptyDraft());
  const [activeLocale, setActiveLocale] = useState<PageEditorLocale>("id");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prevent losing unsaved changes warning could go here; kept simple for v1.

  function updateTranslation(
    locale: PageEditorLocale,
    key: "title" | "content" | "metaTitle" | "metaDesc",
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

  function normalizeParentId(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function parseOrder(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
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
      : buildUpdatePayload(draft, pageId ?? "", mutationVersion);

    if (!parsed.success) {
      if (lease && finishMutation) finishMutation(lease.token);
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      setFormError(t("error.VALIDATION_FAILED"));
      return;
    }

    setSubmitting(true);
    let released = false;
    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
      setFormError(t("error.UNAVAILABLE"));
    } finally {
      if (lease && finishMutation && !released) finishMutation(lease.token);
      setSubmitting(false);
    }
  }

  const hasTranslation = {
    id: true,
    en: hasTranslationContent(draft.translations.en),
    ar: hasTranslationContent(draft.translations.ar),
  };

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

        <Field>
          <FieldLabel htmlFor={`${formId}-parentId`}>{t("parentId")}</FieldLabel>
          <Input
            id={`${formId}-parentId`}
            name="parentId"
            value={draft.parentId ?? ""}
            onChange={(event) =>
              setDraft((c) => ({ ...c, parentId: normalizeParentId(event.target.value) }))
            }
            aria-invalid={fieldErrors.parentId ? true : undefined}
            aria-describedby={`${formId}-parentId-description`}
            autoComplete="off"
            placeholder={t("parentIdPlaceholder")}
          />
          <FieldDescription id={`${formId}-parentId-description`}>
            {t("parentIdDescription")}
          </FieldDescription>
          {fieldErrors.parentId ? <FieldError>{fieldErrors.parentId}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-order`}>{t("order")}</FieldLabel>
          <Input
            id={`${formId}-order`}
            name="order"
            type="number"
            min={0}
            step={1}
            value={draft.order}
            onChange={(event) => setDraft((c) => ({ ...c, order: parseOrder(event.target.value) }))}
            aria-invalid={fieldErrors.order ? true : undefined}
          />
          {fieldErrors.order ? <FieldError>{fieldErrors.order}</FieldError> : null}
        </Field>
      </FieldGroup>

      <PageHeroPicker
        value={draft.heroMediaId}
        onChange={(heroMediaId) => setDraft((c) => ({ ...c, heroMediaId }))}
        initialHero={initialHero}
        uploadPublicUrl={uploadPublicUrl}
      />
      {fieldErrors.heroMediaId ? (
        <p role="alert" className="text-sm text-destructive">
          {fieldErrors.heroMediaId}
        </p>
      ) : null}

      <FieldSet className="gap-4">
        <FieldLegend>{t("translationsTitle")}</FieldLegend>
        <PageLocaleTabs
          active={activeLocale}
          labels={{
            id: t("locale.id"),
            en: t("locale.en"),
            ar: t("locale.ar"),
          }}
          hasTranslation={hasTranslation}
          onChange={setActiveLocale}
        />

        {PAGE_EDITOR_LOCALES.map((locale) => {
          const required = locale === "id";
          const translation = draft.translations[locale];
          const isActive = locale === activeLocale;
          return (
            <div
              key={locale}
              role="tabpanel"
              id={`page-locale-panel-${locale}`}
              aria-labelledby={`page-locale-tab-${locale}`}
              hidden={!isActive}
              className={isActive ? "flex flex-col gap-5" : "hidden"}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-title`}>
                    {t("title")}
                    {required ? null : (
                      <span className="ms-1 text-sm font-normal text-muted-foreground">
                        {t("localeOptional")}
                      </span>
                    )}
                  </FieldLabel>
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
                  <span id={`${formId}-${locale}-content-label`} className="text-sm font-medium">
                    {t("content")}
                  </span>
                  <PageRichTextField
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

                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-metaTitle`}>
                    {t("metaTitle")}
                  </FieldLabel>
                  <Input
                    id={`${formId}-${locale}-metaTitle`}
                    value={translation.metaTitle}
                    onChange={(event) => updateTranslation(locale, "metaTitle", event.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.metaTitle`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                    autoComplete="off"
                  />
                  {fieldErrors[`translations.${locale}.metaTitle`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.metaTitle`]}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-metaDesc`}>
                    {t("metaDesc")}
                  </FieldLabel>
                  <Textarea
                    id={`${formId}-${locale}-metaDesc`}
                    rows={2}
                    value={translation.metaDesc}
                    onChange={(event) => updateTranslation(locale, "metaDesc", event.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.metaDesc`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                  />
                  {fieldErrors[`translations.${locale}.metaDesc`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.metaDesc`]}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
            </div>
          );
        })}
      </FieldSet>

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
      </div>
    </form>
  );
}
