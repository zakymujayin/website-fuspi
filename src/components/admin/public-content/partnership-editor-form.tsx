"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { HomeMediaPicker } from "@/components/admin/home-nav/home-media-picker";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { type PublicContentMutationResult } from "@/contracts/public-content";
import type { AttachableDocumentOption } from "@/features/public-content/administration";
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
  legacyDocumentUrl: string;
  isActive: boolean;
  order: number;
  logoMediaId: string | null;
  documentId: string | null;
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
    legacyDocumentUrl: "",
    isActive: true,
    order: 0,
    logoMediaId: null,
    documentId: null,
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

function generatedSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 191);
}

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
  initialLogo?: CoverPreview | null;
  uploadPublicUrl?: string;
  documentOptions?: AttachableDocumentOption[];
};

export function PartnershipEditorForm({
  mode,
  listHref,
  initialData,
  pageId,
  expectedVersion,
  initialLogo = null,
  uploadPublicUrl = "/uploads",
  documentOptions = [],
}: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<PartnershipDraft>(() => {
    if (initialData) {
      // Accept both the transport input object and the full admin detail shape.
      const input = initialData.input && typeof initialData.input === "object"
        ? initialData.input as Record<string, unknown>
        : initialData;
      const tr = input.translations as Record<string, Record<string, string | null>> | undefined;
      return {
        slug: (input.slug as string) ?? "",
        partnerName: (input.partnerName as string) ?? "",
        level: (input.level as string) ?? "INTERNASIONAL",
        country: (input.country as string) ?? "",
        startDate: (input.startDate as string) ?? "",
        endDate: (input.endDate as string) ?? "",
        websiteUrl: (input.websiteUrl as string) ?? "",
        legacyDocumentUrl: (input.legacyDocumentUrl as string) ?? "",
        isActive: (input.isActive as boolean) ?? true,
        order: (input.order as number) ?? 0,
        logoMediaId: (input.logoMediaId as string | null) ?? null,
        documentId: (input.documentId as string | null) ?? null,
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
      slug: draft.slug.trim() || (mode === "create" ? generatedSlug(draft.partnerName) : ""),
      partnerName: draft.partnerName.trim(),
      level: draft.level,
      country: draft.country.trim() || null,
      startDate,
      endDate,
      documentId: draft.documentId,
      legacyDocumentUrl: draft.legacyDocumentUrl.trim() || null,
      websiteUrl: draft.websiteUrl.trim() || null,
      logoMediaId: draft.logoMediaId,
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

    // Keep the required ID fields from being sent as an opaque server error.
    const nextFieldErrors: Record<string, string> = {};
    if (!payload.slug) nextFieldErrors.slug = t("PARTNERSHIP.error.REQUIRED");
    if (!payload.partnerName) nextFieldErrors.partnerName = t("PARTNERSHIP.error.REQUIRED");
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError(t("PARTNERSHIP.error.VALIDATION_FAILED"));
      return;
    }

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
      const message = t(`PARTNERSHIP.error.${result.code}` as any, { defaultValue: t("PARTNERSHIP.error.UNAVAILABLE") });
      setFormError(message);
    } catch {
      setFormError(t("PARTNERSHIP.error.UNAVAILABLE"));
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
          <FieldLabel htmlFor={`${formId}-slug`}>{t("PARTNERSHIP.field.slug")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-partnerName`}>{t("PARTNERSHIP.field.partnerName")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-level`}>{t("PARTNERSHIP.field.level")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-documentId`}>{t("PARTNERSHIP.field.document")}</FieldLabel>
          <select
            id={`${formId}-documentId`}
            name="documentId"
            value={draft.documentId ?? ""}
            onChange={(e) => setDraft((c) => ({ ...c, documentId: e.target.value || null }))}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            aria-describedby={`${formId}-documentId-hint`}
            aria-invalid={fieldErrors.documentId ? true : undefined}
            disabled={documentOptions.length === 0}
          >
            <option value="">{t("PARTNERSHIP.documentNone")}</option>
            {documentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.category ? `${option.category} — ${option.title}` : option.title}
              </option>
            ))}
          </select>
          <p id={`${formId}-documentId-hint`} className="text-sm text-slate-500">
            {documentOptions.length === 0 ? t("PARTNERSHIP.documentEmpty") : t("PARTNERSHIP.documentDescription")}
          </p>
          {fieldErrors.documentId ? <FieldError>{fieldErrors.documentId}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-country`}>{t("PARTNERSHIP.field.country")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-startDate`}>{t("PARTNERSHIP.field.startDate")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-endDate`}>{t("PARTNERSHIP.field.endDate")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-websiteUrl`}>{t("PARTNERSHIP.field.websiteUrl")}</FieldLabel>
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
          <FieldLabel htmlFor={`${formId}-legacyDocumentUrl`}>{t("PARTNERSHIP.field.documentUrl")}</FieldLabel>
          <Input
            id={`${formId}-legacyDocumentUrl`}
            name="legacyDocumentUrl"
            type="url"
            value={draft.legacyDocumentUrl}
            onChange={(e) => setDraft((c) => ({ ...c, legacyDocumentUrl: e.target.value }))}
            placeholder="https://drive.google.com/..."
            aria-invalid={fieldErrors.legacyDocumentUrl ? true : undefined}
            autoComplete="off"
          />
          <p className="text-sm text-slate-500">{t("PARTNERSHIP.documentUrlDescription")}</p>
          {fieldErrors.legacyDocumentUrl ? <FieldError>{fieldErrors.legacyDocumentUrl}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-order`}>{t("PARTNERSHIP.field.order")}</FieldLabel>
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
              {t("PARTNERSHIP.field.isActive")}
            </FieldLabel>
          </div>
        </Field>
      </FieldGroup>

      <HomeMediaPicker
        value={draft.logoMediaId}
        onChange={(logoMediaId) => setDraft((current) => ({ ...current, logoMediaId }))}
        initialMedia={initialLogo}
        uploadPublicUrl={uploadPublicUrl}
        label={t("PARTNERSHIP.field.logo")}
        description={t("PARTNERSHIP.logoDescription")}
        chooseLabel={t("PARTNERSHIP.picker.choose")}
        changeLabel={t("PARTNERSHIP.picker.change")}
        clearLabel={t("PARTNERSHIP.picker.clear")}
        selectedLabel={t("PARTNERSHIP.picker.selected")}
        noneLabel={t("PARTNERSHIP.picker.none")}
        loadingLabel={t("PARTNERSHIP.picker.loading")}
        loadErrorLabel={t("PARTNERSHIP.picker.loadError")}
        emptyLabel={t("PARTNERSHIP.picker.empty")}
        listLabel={t("PARTNERSHIP.picker.listLabel")}
        loadMoreLabel={t("PARTNERSHIP.picker.loadMore")}
      />

      <FieldSet className="gap-4">
        <FieldLegend>{t("PARTNERSHIP.translationsTitle")}</FieldLegend>
        <div role="tablist" aria-label={t("PARTNERSHIP.localeTabsAriaLabel")} className="flex gap-1">
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
                <span className="text-[10px] opacity-70">({t("PARTNERSHIP.localeOptional")})</span>
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
                    {t("PARTNERSHIP.field.category")}
                    {required ? null : (
                      <span className="ms-1 text-sm font-normal text-muted-foreground">
                        {t("PARTNERSHIP.localeOptional")}
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
                    {t("PARTNERSHIP.field.description")}
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
            ? t("PARTNERSHIP.submitting")
            : mode === "create"
              ? t("PARTNERSHIP.submitCreate")
              : t("PARTNERSHIP.submitUpdate")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)}>
          {t("PARTNERSHIP.cancel")}
        </Button>
      </div>
    </form>
  );
}
