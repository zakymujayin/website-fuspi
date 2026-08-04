"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { type PublicContentMutationResult } from "@/contracts/public-content";
import { executePublicContentAdminCommand } from "@/components/admin/public-content/public-content-server-actions";

type EditorLocale = "id" | "en" | "ar";
const EDITOR_LOCALES: readonly EditorLocale[] = ["id", "en", "ar"];

type ScholarshipTranslationDraft = {
  title: string;
  provider: string;
  description: string;
};

type ScholarshipDraft = {
  slug: string;
  startDate: string;
  endDate: string;
  registrationUrl: string;
  isActive: boolean;
  translations: Record<EditorLocale, ScholarshipTranslationDraft>;
};

const EMPTY_TRANSLATION: ScholarshipTranslationDraft = {
  title: "",
  provider: "",
  description: "",
};

function emptyDraft(): ScholarshipDraft {
  return {
    slug: "",
    startDate: "",
    endDate: "",
    registrationUrl: "",
    isActive: true,
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

function hasTranslationContent(t: ScholarshipTranslationDraft): boolean {
  return t.title.trim().length > 0 || t.provider.trim().length > 0 || t.description.trim().length > 0;
}

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

export function ScholarshipEditorForm({
  mode,
  listHref,
  initialData,
  pageId,
  expectedVersion,
}: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<ScholarshipDraft>(() => {
    if (initialData) {
      const tr = initialData.translations as Record<string, Record<string, string>> | undefined;
      const input = initialData as Record<string, unknown>;
      return {
        slug: (input.slug as string) ?? "",
        startDate: (input.startDate as string) ?? "",
        endDate: (input.endDate as string) ?? "",
        registrationUrl: (input.registrationUrl as string) ?? "",
        isActive: (input.isActive as boolean) ?? true,
        translations: {
          id: {
            title: tr?.id?.title ?? "",
            provider: tr?.id?.provider ?? "",
            description: tr?.id?.description ?? "",
          },
          en: {
            title: tr?.en?.title ?? "",
            provider: tr?.en?.provider ?? "",
            description: tr?.en?.description ?? "",
          },
          ar: {
            title: tr?.ar?.title ?? "",
            provider: tr?.ar?.provider ?? "",
            description: tr?.ar?.description ?? "",
          },
        },
      };
    }
    return emptyDraft();
  });
  const [activeLocale, setActiveLocale] = useState<EditorLocale>("id");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateTranslation(locale: EditorLocale, key: keyof ScholarshipTranslationDraft, value: string) {
    setDraft((c) => ({
      ...c,
      translations: {
        ...c.translations,
        [locale]: { ...c.translations[locale], [key]: value },
      },
    }));
  }

  function buildPayload() {
    const translations: Record<string, Record<string, string | null>> = {
      id: {
        title: draft.translations.id.title.trim(),
        provider: draft.translations.id.provider.trim() || null,
        description: draft.translations.id.description.trim() || null,
      },
    };
    for (const locale of ["en", "ar"] as const) {
      if (hasTranslationContent(draft.translations[locale])) {
        translations[locale] = {
          title: draft.translations[locale].title.trim(),
          provider: draft.translations[locale].provider.trim() || null,
          description: draft.translations[locale].description.trim() || null,
        };
      }
    }

    return {
      slug: draft.slug.trim(),
      startDate: draft.startDate ? new Date(draft.startDate).toISOString() : null,
      endDate: draft.endDate ? new Date(draft.endDate).toISOString() : null,
      registrationUrl: draft.registrationUrl.trim() || null,
      documentId: null,
      isActive: draft.isActive,
      translations,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);

    const payload = buildPayload();

    const command: Record<string, unknown> = mode === "create"
      ? { action: "CREATE", resource: "SCHOLARSHIP", payload }
      : { action: "UPDATE", resource: "SCHOLARSHIP", mutation: { id: pageId ?? "", expectedVersion: expectedVersion ?? null }, payload };

    setSubmitting(true);
    try {
      const result: PublicContentMutationResult = await executePublicContentAdminCommand(command);

      if (result.ok) {
        router.push(listHref);
        router.refresh();
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = t(`error.${result.code}` as any, { defaultValue: t("error.UNAVAILABLE") });
      setFormError(message);
    } catch {
      setFormError(t("error.UNAVAILABLE"));
    } finally {
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
          <FieldLabel htmlFor={`${formId}-slug`}>{t("field.slug")}</FieldLabel>
          <Input
            id={`${formId}-slug`}
            name="slug"
            value={draft.slug}
            onChange={(e) => setDraft((c) => ({ ...c, slug: e.target.value }))}
            aria-invalid={fieldErrors.slug ? true : undefined}
            autoComplete="off"
          />
          {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-startDate`}>{t("field.startDate")}</FieldLabel>
          <Input
            id={`${formId}-startDate`}
            name="startDate"
            type="datetime-local"
            value={draft.startDate ? draft.startDate.slice(0, 16) : ""}
            onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
            aria-invalid={fieldErrors.startDate ? true : undefined}
          />
          {fieldErrors.startDate ? <FieldError>{fieldErrors.startDate}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-endDate`}>{t("field.endDate")}</FieldLabel>
          <Input
            id={`${formId}-endDate`}
            name="endDate"
            type="datetime-local"
            value={draft.endDate ? draft.endDate.slice(0, 16) : ""}
            onChange={(e) => setDraft((c) => ({ ...c, endDate: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
            aria-invalid={fieldErrors.endDate ? true : undefined}
          />
          {fieldErrors.endDate ? <FieldError>{fieldErrors.endDate}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-registrationUrl`}>{t("field.registrationUrl")}</FieldLabel>
          <Input
            id={`${formId}-registrationUrl`}
            name="registrationUrl"
            value={draft.registrationUrl}
            onChange={(e) => setDraft((c) => ({ ...c, registrationUrl: e.target.value }))}
            aria-invalid={fieldErrors.registrationUrl ? true : undefined}
            autoComplete="off"
          />
          {fieldErrors.registrationUrl ? <FieldError>{fieldErrors.registrationUrl}</FieldError> : null}
        </Field>

        <Field>
          <div className="flex items-center gap-2">
            <input
              id={`${formId}-isActive`}
              name="isActive"
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((c) => ({ ...c, isActive: e.target.checked }))}
              className="size-4 rounded border-slate-300"
            />
            <FieldLabel htmlFor={`${formId}-isActive`} className="!m-0 cursor-pointer">
              {t("field.isActive")}
            </FieldLabel>
          </div>
        </Field>
      </FieldGroup>

      <FieldSet className="gap-4">
        <FieldLegend>{t("translationsTitle")}</FieldLegend>
        <div role="tablist" aria-label={t("localeTabsAriaLabel")} className="flex gap-1">
          {EDITOR_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="tab"
              id={`locale-tab-${locale}`}
              aria-selected={activeLocale === locale}
              aria-controls={`locale-panel-${locale}`}
              onClick={() => setActiveLocale(locale)}
              className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors ${
                activeLocale === locale
                  ? "bg-royal-500 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {locale.toUpperCase()}
              {hasTranslation[locale] ? null : (
                <span className="text-[10px] opacity-70">({t("localeOptional")})</span>
              )}
            </button>
          ))}
        </div>

        {EDITOR_LOCALES.map((locale) => {
          const required = locale === "id";
          const translation = draft.translations[locale];
          const isActive = locale === activeLocale;
          return (
            <div
              key={locale}
              role="tabpanel"
              id={`locale-panel-${locale}`}
              aria-labelledby={`locale-tab-${locale}`}
              hidden={!isActive}
              className={isActive ? "flex flex-col gap-5" : "hidden"}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-title`}>
                    {t("field.title")}
                    {required ? (
                      <span className="ms-1 text-red-500">*</span>
                    ) : (
                      <span className="ms-1 text-sm font-normal text-muted-foreground">
                        {t("localeOptional")}
                      </span>
                    )}
                  </FieldLabel>
                  <Input
                    id={`${formId}-${locale}-title`}
                    value={translation.title}
                    onChange={(e) => updateTranslation(locale, "title", e.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.title`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                    autoComplete="off"
                  />
                  {fieldErrors[`translations.${locale}.title`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.title`]}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-provider`}>
                    {t("field.provider")}
                  </FieldLabel>
                  <Input
                    id={`${formId}-${locale}-provider`}
                    value={translation.provider}
                    onChange={(e) => updateTranslation(locale, "provider", e.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.provider`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                    autoComplete="off"
                  />
                  {fieldErrors[`translations.${locale}.provider`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.provider`]}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor={`${formId}-${locale}-description`}>
                    {t("field.description")}
                  </FieldLabel>
                  <Textarea
                    id={`${formId}-${locale}-description`}
                    rows={4}
                    value={translation.description}
                    onChange={(e) => updateTranslation(locale, "description", e.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.description`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                  />
                  {fieldErrors[`translations.${locale}.description`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.description`]}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
            </div>
          );
        })}
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
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
