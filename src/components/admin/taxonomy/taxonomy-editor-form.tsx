"use client";

import {useTranslations} from "next-intl";
import {useId, useState, type FormEvent} from "react";

import type {TaxonomyKind} from "@/contracts/admin-foundation";
import {Button} from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Spinner} from "@/components/ui/spinner";
import {useRouter} from "@/i18n/navigation";

import {executeTaxonomyAdminCommand} from "./taxonomy-server-actions";
import type {EditableTaxonomy} from "./taxonomy-options";

type Props = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: EditableTaxonomy;
};

type TranslationDraft = {name: string};
type Draft = {
  kind: TaxonomyKind;
  slug: string;
  translations: {
    id: TranslationDraft;
    en: TranslationDraft;
    ar: TranslationDraft;
  };
};

const EMPTY_TRANSLATION = {name: ""};

function initialDraft(initialData?: EditableTaxonomy): Draft {
  return {
    kind: initialData?.kind ?? "CATEGORY",
    slug: initialData?.slug ?? "",
    translations: {
      id: initialData?.translations.id ?? EMPTY_TRANSLATION,
      en: initialData?.translations.en ?? EMPTY_TRANSLATION,
      ar: initialData?.translations.ar ?? EMPTY_TRANSLATION,
    },
  };
}

export function TaxonomyEditorForm({mode, listHref, initialData}: Props) {
  const t = useTranslations("AdminTaxonomy");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState(() => initialDraft(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateName(locale: "id" | "en" | "ar", name: string) {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: {name},
      },
    }));
  }

  function payload() {
    const en = draft.translations.en.name.trim();
    const ar = draft.translations.ar.name.trim();
    return {
      kind: draft.kind,
      slug: draft.slug.trim(),
      translations: {
        id: {name: draft.translations.id.name.trim()},
        ...(en ? {en: {name: en}} : {}),
        ...(ar ? {ar: {name: ar}} : {}),
      },
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const command = mode === "create"
      ? {action: "CREATE", payload: payload()}
      : {action: "UPDATE", payload: {...payload(), taxonomyId: initialData?.id}};
    const result = await executeTaxonomyAdminCommand(command);
    if (result.ok) {
      router.push(listHref);
      router.refresh();
    } else {
      const message = t(`error.${result.code}`);
      if (result.code === "SLUG_CONFLICT" || result.code === "VALIDATION_FAILED") {
        setFieldErrors({slug: message});
      } else {
        setFormError(message);
      }
    }
    setSubmitting(false);
  }

  async function remove() {
    if (!initialData || !window.confirm(t("deleteConfirm"))) return;
    setSubmitting(true);
    setFormError(null);
    const result = await executeTaxonomyAdminCommand({
      action: "DELETE",
      payload: {taxonomyId: initialData.id, kind: initialData.kind},
    });
    if (result.ok) {
      router.push(listHref);
      router.refresh();
    } else {
      setFormError(t(`error.${result.code}`));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <FieldSet>
        <FieldLegend>{t("settings")}</FieldLegend>
        <FieldDescription>{t("settingsDescription")}</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-kind`}>{t("kind")}</FieldLabel>
            <select
              id={`${formId}-kind`}
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({...current, kind: event.target.value as TaxonomyKind}))}
              disabled={mode === "edit"}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="CATEGORY">{t("kindLabel.CATEGORY")}</option>
              <option value="TAG">{t("kindLabel.TAG")}</option>
            </select>
            {mode === "edit" ? <FieldDescription>{t("kindLocked")}</FieldDescription> : null}
          </Field>

          <Field data-invalid={Boolean(fieldErrors.slug)}>
            <FieldLabel htmlFor={`${formId}-slug`}>{t("slug")}</FieldLabel>
            <Input
              id={`${formId}-slug`}
              value={draft.slug}
              onChange={(event) => setDraft((current) => ({...current, slug: event.target.value}))}
              aria-invalid={fieldErrors.slug ? true : undefined}
              autoComplete="off"
            />
            <FieldDescription>{t("slugDescription")}</FieldDescription>
            {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("translations")}</FieldLegend>
        <FieldDescription>{t("translationsDescription")}</FieldDescription>
        <FieldGroup>
          {(["id", "en", "ar"] as const).map((locale) => (
            <Field key={locale}>
              <FieldLabel htmlFor={`${formId}-${locale}-name`}>
                {t("name")} ({t(`locale.${locale}`)})
              </FieldLabel>
              <Input
                id={`${formId}-${locale}-name`}
                value={draft.translations[locale].name}
                onChange={(event) => updateName(locale, event.target.value)}
                dir={locale === "ar" ? "rtl" : undefined}
                autoComplete="off"
              />
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner data-icon /> : null}
          {mode === "create" ? t("createAction") : t("updateAction")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)} disabled={submitting}>
          {t("cancel")}
        </Button>
        {mode === "edit" ? (
          <Button type="button" variant="destructive" onClick={remove} disabled={submitting}>
            {t("deleteAction")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
