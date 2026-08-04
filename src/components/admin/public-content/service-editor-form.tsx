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
  FieldDescription,
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

type ServiceTranslationDraft = {
  name: string;
  description: string;
};

type ServiceDraft = {
  slug: string;
  category: string;
  linkKind: string;
  linkHref: string;
  icon: string;
  isActive: boolean;
  order: number;
  translations: Record<EditorLocale, ServiceTranslationDraft>;
};

const EMPTY_TRANSLATION: ServiceTranslationDraft = {
  name: "",
  description: "",
};

function emptyDraft(): ServiceDraft {
  return {
    slug: "",
    category: "AKADEMIK",
    linkKind: "",
    linkHref: "",
    icon: "",
    isActive: true,
    order: 0,
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

function hasTranslationContent(t: ServiceTranslationDraft): boolean {
  return t.name.trim().length > 0 || t.description.trim().length > 0;
}

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

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

export function ServiceEditorForm({
  mode,
  listHref,
  initialData,
  pageId,
  expectedVersion,
}: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<ServiceDraft>(() => {
    if (initialData) {
      const tr = initialData.translations as Record<string, Record<string, string>> | undefined;
      const input = initialData as Record<string, unknown>;
      const link = (input.link as { kind: string; href: string } | null) ?? null;
      return {
        slug: (input.slug as string) ?? "",
        category: (input.category as string) ?? "AKADEMIK",
        linkKind: link?.kind ?? "",
        linkHref: link?.href ?? "",
        icon: (input.icon as string) ?? "",
        isActive: (input.isActive as boolean) ?? true,
        order: (input.order as number) ?? 0,
        translations: {
          id: {
            name: tr?.id?.name ?? "",
            description: tr?.id?.description ?? "",
          },
          en: {
            name: tr?.en?.name ?? "",
            description: tr?.en?.description ?? "",
          },
          ar: {
            name: tr?.ar?.name ?? "",
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

  function updateTranslation(locale: EditorLocale, key: keyof ServiceTranslationDraft, value: string) {
    setDraft((c) => ({
      ...c,
      translations: {
        ...c.translations,
        [locale]: { ...c.translations[locale], [key]: value },
      },
    }));
  }

  function buildPayload() {
    const link = draft.linkKind && draft.linkHref
      ? { kind: draft.linkKind, href: draft.linkHref }
      : null;

    const translations: Record<string, Record<string, string | null>> = {
      id: { name: draft.translations.id.name.trim(), description: draft.translations.id.description.trim() || null },
    };
    for (const locale of ["en", "ar"] as const) {
      if (hasTranslationContent(draft.translations[locale])) {
        translations[locale] = {
          name: draft.translations[locale].name.trim(),
          description: draft.translations[locale].description.trim() || null,
        };
      }
    }

    return {
      slug: draft.slug.trim(),
      category: draft.category,
      link,
      icon: draft.icon.trim() || null,
      isActive: draft.isActive,
      order: draft.order,
      contentOwnerId: null,
      expiresAt: null,
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
      ? { action: "CREATE", resource: "SERVICE", payload }
      : { action: "UPDATE", resource: "SERVICE", mutation: { id: pageId ?? "", expectedVersion: expectedVersion ?? null }, payload };

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
          <FieldLabel htmlFor={`${formId}-category`}>{t("field.category")}</FieldLabel>
          <select
            id={`${formId}-category`}
            name="category"
            value={draft.category}
            onChange={(e) => setDraft((c) => ({ ...c, category: e.target.value }))}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            aria-invalid={fieldErrors.category ? true : undefined}
          >
            <option value="AKADEMIK">AKADEMIK</option>
            <option value="LABORATORIUM">LABORATORIUM</option>
            <option value="UMUM">UMUM</option>
          </select>
          {fieldErrors.category ? <FieldError>{fieldErrors.category}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-linkKind`}>{t("field.link")}</FieldLabel>
          <div className="flex gap-2">
            <select
              id={`${formId}-linkKind`}
              name="linkKind"
              value={draft.linkKind}
              onChange={(e) => setDraft((c) => ({ ...c, linkKind: e.target.value }))}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
              aria-invalid={fieldErrors["link.kind"] ? true : undefined}
            >
              <option value="">--</option>
              <option value="INTERNAL">INTERNAL</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>
            <Input
              id={`${formId}-linkHref`}
              name="linkHref"
              value={draft.linkHref}
              onChange={(e) => setDraft((c) => ({ ...c, linkHref: e.target.value }))}
              aria-invalid={fieldErrors["link.href"] ? true : undefined}
              autoComplete="off"
              placeholder={t("field.linkHrefPlaceholder")}
              className="flex-1"
            />
          </div>
          {fieldErrors["link.kind"] ? <FieldError>{fieldErrors["link.kind"]}</FieldError> : null}
          {fieldErrors["link.href"] ? <FieldError>{fieldErrors["link.href"]}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-icon`}>{t("field.icon")}</FieldLabel>
          <Input
            id={`${formId}-icon`}
            name="icon"
            value={draft.icon}
            onChange={(e) => setDraft((c) => ({ ...c, icon: e.target.value }))}
            aria-invalid={fieldErrors.icon ? true : undefined}
            autoComplete="off"
          />
          {fieldErrors.icon ? <FieldError>{fieldErrors.icon}</FieldError> : null}
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
                  <FieldLabel htmlFor={`${formId}-${locale}-name`}>
                    {t("field.name")}
                    {required ? null : (
                      <span className="ms-1 text-sm font-normal text-muted-foreground">
                        {t("localeOptional")}
                      </span>
                    )}
                  </FieldLabel>
                  <Input
                    id={`${formId}-${locale}-name`}
                    value={translation.name}
                    onChange={(e) => updateTranslation(locale, "name", e.target.value)}
                    aria-invalid={fieldErrors[`translations.${locale}.name`] ? true : undefined}
                    dir={locale === "ar" ? "rtl" : undefined}
                    autoComplete="off"
                  />
                  {fieldErrors[`translations.${locale}.name`] ? (
                    <FieldError>{fieldErrors[`translations.${locale}.name`]}</FieldError>
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
