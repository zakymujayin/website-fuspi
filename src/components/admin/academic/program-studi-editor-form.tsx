"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ProgramCertificatePicker, type CertificatePreview } from "./program-certificate-picker";

import {
  EMPTY_PROGRAM_STUDIO_TRANSLATION,
  PROGRAM_STUDIO_LOCALES,
  type ProgramStudioDraft,
  type ProgramStudioLocale,
} from "./program-studi-types";

const CONTENT_FIELDS = [
  "description",
  "vision",
  "mission",
  "objectives",
  "learningOutcomes",
  "graduateProfile",
  "careerProspects",
] as const;

type ContentField = (typeof CONTENT_FIELDS)[number];

function toOptionalTranslation(
  draft: ProgramStudioDraft["translations"][ProgramStudioLocale] | undefined,
) {
  if (!draft || !draft.name.trim()) return undefined;
  return {
    name: draft.name.trim(),
    ...Object.fromEntries(CONTENT_FIELDS.map((field) => [field, draft[field].trim() || null])),
  };
}

function errorMessage(t: ReturnType<typeof useTranslations>, code: unknown) {
  if (typeof code === "string") {
    const key = `errors.${code}`;
    try {
      return t(key as never);
    } catch {
      // Fall through to the generic unavailable message below.
    }
  }
  return t("errors.UNAVAILABLE");
}

export function ProgramStudioEditorForm({
  initialDraft,
  initialCertificate,
}: {initialDraft: ProgramStudioDraft; initialCertificate: CertificatePreview | null}) {
  const t = useTranslations("StudyPrograms");
  const tAdmin = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState(initialDraft);
  const [activeLocale, setActiveLocale] = useState<ProgramStudioLocale>("id");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translation = draft.translations[activeLocale] ?? EMPTY_PROGRAM_STUDIO_TRANSLATION;

  function updateTranslation(field: "name" | ContentField, value: string) {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [activeLocale]: {
          ...(current.translations[activeLocale] ?? EMPTY_PROGRAM_STUDIO_TRANSLATION),
          [field]: value,
        },
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!draft.translations.id.name.trim()) {
      setActiveLocale("id");
      setError(tAdmin("errors.VALIDATION_FAILED"));
      return;
    }

    setSubmitting(true);
    const translations = {
      id: toOptionalTranslation(draft.translations.id),
      ...(toOptionalTranslation(draft.translations.en) ? {en: toOptionalTranslation(draft.translations.en)} : {}),
      ...(toOptionalTranslation(draft.translations.ar) ? {ar: toOptionalTranslation(draft.translations.ar)} : {}),
    };
    const accreditationExpiry = draft.accreditationExpiry
      ? `${draft.accreditationExpiry}T00:00:00.000Z`
      : null;
    try {
      const response = await fetch("/api/admin/academic/people", {
        method: "POST",
        headers: {"content-type": "application/json"},
        credentials: "same-origin",
        body: JSON.stringify({
          action: "UPDATE",
          resource: "STUDY_PROGRAM",
          mutation: {id: draft.id, expectedVersion: draft.version},
          payload: {
            code: draft.code,
            slug: draft.slug,
            degree: "S1",
            accreditation: draft.accreditation.trim() || null,
            accreditationAgency: draft.accreditationAgency.trim() || null,
            accreditationDecreeNumber: draft.accreditationDecreeNumber.trim() || null,
            accreditationExpiry,
            accreditationCertificateMediaId: draft.accreditationCertificateMediaId,
            externalUrl: null,
            email: draft.email.trim() || null,
            phone: draft.phone.trim() || null,
            logoMediaId: draft.logoMediaId,
            curriculumDocumentId: draft.curriculumDocumentId,
            brochureDocumentId: draft.brochureDocumentId,
            isActive: draft.isActive,
            order: draft.order,
            contentOwnerId: draft.contentOwnerId,
            translations,
          },
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === "object" && result !== null && (result as {ok?: unknown}).ok === true) {
        router.push("/admin/program-studi");
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null ? (result as {code?: unknown}).code : null;
      setError(errorMessage(tAdmin, code));
    } catch {
      setError(tAdmin("errors.UNAVAILABLE"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <FieldSet>
        <FieldLegend>{t("quickFacts")}</FieldLegend>
        <FieldDescription>Identitas kode dan jenjang mengikuti kontrak resmi tiga program studi FUSPI.</FieldDescription>
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`${formId}-code`}>{t("programCode")}</FieldLabel>
            <Input id={`${formId}-code`} value={draft.code} readOnly aria-readonly="true" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-degree`}>{t("degree")}</FieldLabel>
            <Input id={`${formId}-degree`} value={draft.degree} readOnly aria-readonly="true" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-slug`}>Slug</FieldLabel>
            <Input id={`${formId}-slug`} value={draft.slug} readOnly aria-readonly="true" />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("moreInfo")}</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${formId}-accreditation`}>{t("accreditation")}</FieldLabel>
            <Input
              id={`${formId}-accreditation`}
              value={draft.accreditation}
              onChange={(event) => setDraft((current) => ({...current, accreditation: event.target.value}))}
              placeholder="Contoh: Baik Sekali"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-expiry`}>{t("accreditationValidLabel")}</FieldLabel>
            <Input
              id={`${formId}-expiry`}
              type="date"
              value={draft.accreditationExpiry}
              onChange={(event) => setDraft((current) => ({...current, accreditationExpiry: event.target.value}))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-agency`}>Lembaga akreditasi</FieldLabel>
            <Input
              id={`${formId}-agency`}
              value={draft.accreditationAgency}
              onChange={(event) => setDraft((current) => ({...current, accreditationAgency: event.target.value}))}
              placeholder="Contoh: BAN-PT"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-decree`}>Nomor SK akreditasi</FieldLabel>
            <Input
              id={`${formId}-decree`}
              value={draft.accreditationDecreeNumber}
              onChange={(event) => setDraft((current) => ({...current, accreditationDecreeNumber: event.target.value}))}
              placeholder="Masukkan nomor SK resmi"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
            <Input id={`${formId}-email`} type="email" value={draft.email} onChange={(event) => setDraft((current) => ({...current, email: event.target.value}))} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-phone`}>Telepon</FieldLabel>
            <Input id={`${formId}-phone`} value={draft.phone} onChange={(event) => setDraft((current) => ({...current, phone: event.target.value}))} />
          </Field>
        </FieldGroup>
        <div className="mt-5">
          <ProgramCertificatePicker
            value={draft.accreditationCertificateMediaId}
            onChange={(id) => setDraft((current) => ({...current, accreditationCertificateMediaId: id}))}
            initialCertificate={initialCertificate}
          />
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{tAdmin("translations")}</FieldLegend>
        <div role="tablist" aria-label={tAdmin("localeTabs")} className="flex flex-wrap gap-2 border-b border-border pb-2">
          {PROGRAM_STUDIO_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={activeLocale === locale}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeLocale === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setActiveLocale(locale)}
            >
              {tAdmin(`locale.${locale}` as never)}
            </button>
          ))}
        </div>
        <FieldGroup className="mt-5 gap-5">
          <Field>
            <FieldLabel htmlFor={`${formId}-${activeLocale}-name`}>{t("title")}</FieldLabel>
            <Input id={`${formId}-${activeLocale}-name`} value={translation.name} onChange={(event) => updateTranslation("name", event.target.value)} dir={activeLocale === "ar" ? "rtl" : undefined} required={activeLocale === "id"} />
          </Field>
          {CONTENT_FIELDS.map((field) => (
            <Field key={field}>
              <FieldLabel htmlFor={`${formId}-${activeLocale}-${field}`}>{t(field as never)}</FieldLabel>
              <Textarea
                id={`${formId}-${activeLocale}-${field}`}
                value={translation[field]}
                onChange={(event) => updateTranslation(field, event.target.value)}
                dir={activeLocale === "ar" ? "rtl" : undefined}
                className="min-h-28"
              />
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/program-studi")} disabled={submitting}>
          {tAdmin("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner data-icon /> : null}
          {submitting ? tAdmin("saving") : tAdmin("updateAction")}
        </Button>
      </div>
    </form>
  );
}
