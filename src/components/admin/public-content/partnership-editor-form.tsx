"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { AdminFormLayout } from "@/components/admin/admin-form-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type PartnershipTranslationDraft = {
  category: string;
  description: string;
};

type PartnershipDraft = {
  slug: string;
  partnerName: string;
  level: string;
  country: string;
  startDate: string;
  endDate: string;
  websiteUrl: string;
  isActive: boolean;
  order: number;
  translations: Record<EditorLocale, PartnershipTranslationDraft>;
};

const EMPTY_TRANSLATION: PartnershipTranslationDraft = {
  category: "",
  description: "",
};

function emptyDraft(): PartnershipDraft {
  return {
    slug: "",
    partnerName: "",
    level: "INTERNASIONAL",
    country: "",
    startDate: "",
    endDate: "",
    websiteUrl: "",
    isActive: true,
    order: 0,
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

function hasTranslationContent(t: PartnershipTranslationDraft): boolean {
  return t.category.trim().length > 0 || t.description.trim().length > 0;
}

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

export function PartnershipEditorForm({
  mode,
  listHref,
  initialData,
  pageId,
  expectedVersion,
}: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<PartnershipDraft>(() => {
    if (initialData) {
      const tr = initialData.translations as Record<string, Record<string, string>> | undefined;
      const input = initialData as Record<string, unknown>;
      return {
        slug: (input.slug as string) ?? "",
        partnerName: (input.partnerName as string) ?? "",
        level: (input.level as string) ?? "INTERNASIONAL",
        country: (input.country as string) ?? "",
        startDate: (input.startDate as string) ?? "",
        endDate: (input.endDate as string) ?? "",
        websiteUrl: (input.websiteUrl as string) ?? "",
        isActive: (input.isActive as boolean) ?? true,
        order: (input.order as number) ?? 0,
        translations: {
          id: {
            category: tr?.id?.category ?? "",
            description: tr?.id?.description ?? "",
          },
          en: {
            category: tr?.en?.category ?? "",
            description: tr?.en?.description ?? "",
          },
          ar: {
            category: tr?.ar?.category ?? "",
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

  function updateTranslation(locale: EditorLocale, key: keyof PartnershipTranslationDraft, value: string) {
    setDraft((c) => ({
      ...c,
      translations: {
        ...c.translations,
        [locale]: { ...c.translations[locale], [key]: value },
      },
    }));
  }

  function buildPayload() {
    const startDate = draft.startDate ? new Date(draft.startDate).toISOString() : null;
    const endDate = draft.endDate ? new Date(draft.endDate).toISOString() : null;

    const translations: Record<string, Record<string, string | null>> = {
      id: { category: draft.translations.id.category.trim() || null, description: draft.translations.id.description.trim() || null },
    };
    for (const locale of ["en", "ar"] as const) {
      if (hasTranslationContent(draft.translations[locale])) {
        translations[locale] = {
          category: draft.translations[locale].category.trim() || null,
          description: draft.translations[locale].description.trim() || null,
        };
      }
    }

    return {
      slug: draft.slug.trim(),
      partnerName: draft.partnerName.trim(),
      level: draft.level,
      country: draft.country.trim() || null,
      startDate,
      endDate,
      documentId: null,
      legacyDocumentUrl: null,
      websiteUrl: draft.websiteUrl.trim() || null,
      logoMediaId: null,
      isActive: draft.isActive,
      order: draft.order,
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
      ? { action: "CREATE", resource: "PARTNERSHIP", payload }
      : { action: "UPDATE", resource: "PARTNERSHIP", mutation: { id: pageId ?? "", expectedVersion: expectedVersion ?? null }, payload };

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

      <AdminFormLayout
        main={
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
                    <span className="text-[10px] opacity-70">{t("localeOptional")}</span>
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
                      <FieldLabel htmlFor={`${formId}-${locale}-category`}>
                        {t("field.category")}
                        {required ? null : (
                          <span className="ms-1 text-sm font-normal text-muted-foreground">
                            {t("localeOptional")}
                          </span>
                        )}
                      </FieldLabel>
                      <Input
                        id={`${formId}-${locale}-category`}
                        value={translation.category}
                        onChange={(e) => updateTranslation(locale, "category", e.target.value)}
                        aria-invalid={fieldErrors[`translations.${locale}.category`] ? true : undefined}
                        dir={locale === "ar" ? "rtl" : undefined}
                        autoComplete="off"
                      />
                      {fieldErrors[`translations.${locale}.category`] ? (
                        <FieldError>{fieldErrors[`translations.${locale}.category`]}</FieldError>
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
        }
        sidebar={
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent>
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
                    <FieldLabel htmlFor={`${formId}-partnerName`}>{t("field.partnerName")}</FieldLabel>
                    <Input
                      id={`${formId}-partnerName`}
                      name="partnerName"
                      value={draft.partnerName}
                      onChange={(e) => setDraft((c) => ({ ...c, partnerName: e.target.value }))}
                      aria-invalid={fieldErrors.partnerName ? true : undefined}
                      autoComplete="off"
                    />
                    {fieldErrors.partnerName ? <FieldError>{fieldErrors.partnerName}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${formId}-level`}>{t("field.level")}</FieldLabel>
                    <select
                      id={`${formId}-level`}
                      name="level"
                      value={draft.level}
                      onChange={(e) => setDraft((c) => ({ ...c, level: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      aria-invalid={fieldErrors.level ? true : undefined}
                    >
                      <option value="INTERNASIONAL">INTERNASIONAL</option>
                      <option value="NASIONAL">NASIONAL</option>
                      <option value="LOKAL">LOKAL</option>
                    </select>
                    {fieldErrors.level ? <FieldError>{fieldErrors.level}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${formId}-country`}>{t("field.country")}</FieldLabel>
                    <Input
                      id={`${formId}-country`}
                      name="country"
                      value={draft.country}
                      onChange={(e) => setDraft((c) => ({ ...c, country: e.target.value }))}
                      aria-invalid={fieldErrors.country ? true : undefined}
                      autoComplete="off"
                    />
                    {fieldErrors.country ? <FieldError>{fieldErrors.country}</FieldError> : null}
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
                    <FieldLabel htmlFor={`${formId}-websiteUrl`}>{t("field.websiteUrl")}</FieldLabel>
                    <Input
                      id={`${formId}-websiteUrl`}
                      name="websiteUrl"
                      value={draft.websiteUrl}
                      onChange={(e) => setDraft((c) => ({ ...c, websiteUrl: e.target.value }))}
                      aria-invalid={fieldErrors.websiteUrl ? true : undefined}
                      autoComplete="off"
                    />
                    {fieldErrors.websiteUrl ? <FieldError>{fieldErrors.websiteUrl}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${formId}-order`}>{t("field.order")}</FieldLabel>
                    <Input
                      id={`${formId}-order`}
                      name="order"
                      type="number"
                      min={0}
                      step={1}
                      value={draft.order}
                      onChange={(e) => setDraft((c) => ({ ...c, order: Number(e.target.value) || 0 }))}
                      aria-invalid={fieldErrors.order ? true : undefined}
                    />
                    {fieldErrors.order ? <FieldError>{fieldErrors.order}</FieldError> : null}
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
              </CardContent>
            </Card>
          </div>
        }
      />
    </form>
  );
}
