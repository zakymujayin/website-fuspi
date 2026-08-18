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

type AchievementTranslationDraft = {
  title: string;
  description: string;
};

type AchievementDraft = {
  slug: string;
  studentName: string;
  level: string;
  achievedAt: string;
  translations: Record<EditorLocale, AchievementTranslationDraft>;
};

const EMPTY_TRANSLATION: AchievementTranslationDraft = {
  title: "",
  description: "",
};

function emptyDraft(): AchievementDraft {
  return {
    slug: "",
    studentName: "",
    level: "INTERNASIONAL",
    achievedAt: "",
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

function hasTranslationContent(t: AchievementTranslationDraft): boolean {
  return t.title.trim().length > 0 || t.description.trim().length > 0;
}

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

export function AchievementEditorForm({
  mode,
  listHref,
  initialData,
  pageId,
  expectedVersion,
}: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<AchievementDraft>(() => {
    if (initialData) {
      const tr = initialData.translations as Record<string, Record<string, string>> | undefined;
      const input = initialData as Record<string, unknown>;
      return {
        slug: (input.slug as string) ?? "",
        studentName: (input.studentName as string) ?? "",
        level: (input.level as string) ?? "INTERNASIONAL",
        achievedAt: (input.achievedAt as string) ?? "",
        translations: {
          id: {
            title: tr?.id?.title ?? "",
            description: tr?.id?.description ?? "",
          },
          en: {
            title: tr?.en?.title ?? "",
            description: tr?.en?.description ?? "",
          },
          ar: {
            title: tr?.ar?.title ?? "",
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

  function updateTranslation(locale: EditorLocale, key: keyof AchievementTranslationDraft, value: string) {
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
        description: draft.translations.id.description.trim() || null,
      },
    };
    for (const locale of ["en", "ar"] as const) {
      if (hasTranslationContent(draft.translations[locale])) {
        translations[locale] = {
          title: draft.translations[locale].title.trim(),
          description: draft.translations[locale].description.trim() || null,
        };
      }
    }

    return {
      slug: draft.slug.trim(),
      studentName: draft.studentName.trim(),
      level: draft.level,
      achievedAt: draft.achievedAt ? new Date(draft.achievedAt).toISOString() : null,
      imageMediaId: null,
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
      ? { action: "CREATE", resource: "ACHIEVEMENT", payload }
      : { action: "UPDATE", resource: "ACHIEVEMENT", mutation: { id: pageId ?? "", expectedVersion: expectedVersion ?? null }, payload };

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
                    <FieldLabel htmlFor={`${formId}-studentName`}>{t("field.studentName")}</FieldLabel>
                    <Input
                      id={`${formId}-studentName`}
                      name="studentName"
                      value={draft.studentName}
                      onChange={(e) => setDraft((c) => ({ ...c, studentName: e.target.value }))}
                      aria-invalid={fieldErrors.studentName ? true : undefined}
                      autoComplete="off"
                    />
                    {fieldErrors.studentName ? <FieldError>{fieldErrors.studentName}</FieldError> : null}
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
                      <option value="REGIONAL">REGIONAL</option>
                      <option value="LOKAL">LOKAL</option>
                    </select>
                    {fieldErrors.level ? <FieldError>{fieldErrors.level}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`${formId}-achievedAt`}>{t("field.achievedAt")}</FieldLabel>
                    <Input
                      id={`${formId}-achievedAt`}
                      name="achievedAt"
                      type="datetime-local"
                      value={draft.achievedAt ? draft.achievedAt.slice(0, 16) : ""}
                      onChange={(e) => setDraft((c) => ({ ...c, achievedAt: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                      aria-invalid={fieldErrors.achievedAt ? true : undefined}
                    />
                    {fieldErrors.achievedAt ? <FieldError>{fieldErrors.achievedAt}</FieldError> : null}
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
