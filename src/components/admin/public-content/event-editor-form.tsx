"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldError, FieldSet, FieldLegend } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { executePublicContentAdminCommand } from "@/components/admin/public-content/public-content-server-actions";

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

type EventTranslation = { title: string; description: string; location: string };

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ""; }
}

export function EventEditorForm({ mode, listHref, initialData, pageId, expectedVersion }: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, EventTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { title: "", description: "", location: "" };
  const enTr = translations.en ?? { title: "", description: "", location: "" };
  const arTr = translations.ar ?? { title: "", description: "", location: "" };

  const [isPublished, setIsPublished] = useState((input.isPublished as boolean) ?? false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);

    const enTitle = (fd.get("en.title") as string).trim();
    const arTitle = (fd.get("ar.title") as string).trim();

    const payload: Record<string, unknown> = {
      slug: (fd.get("slug") as string).trim(),
      startAt: new Date(fd.get("startAt") as string).toISOString(),
      endAt: (fd.get("endAt") as string) ? new Date(fd.get("endAt") as string).toISOString() : null,
      registrationUrl: (fd.get("registrationUrl") as string).trim() || null,
      isPublished,
      translations: {
        id: {
          title: (fd.get("id.title") as string).trim(),
          description: (fd.get("id.description") as string).trim() || null,
          location: (fd.get("id.location") as string).trim() || null,
        },
        ...(enTitle ? { en: { title: enTitle, description: (fd.get("en.description") as string).trim() || null, location: (fd.get("en.location") as string).trim() || null } } : {}),
        ...(arTitle ? { ar: { title: arTitle, description: (fd.get("ar.description") as string).trim() || null, location: (fd.get("ar.location") as string).trim() || null } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "EVENT", payload }
      : { action: "UPDATE", resource: "EVENT", mutation: { id: pageId!, expectedVersion: expectedVersion ?? null }, payload };

    const result = await executePublicContentAdminCommand(command);

    if (result.ok) {
      router.push(listHref);
      router.refresh();
    } else {
      setErrors([t(`errors.${result.code}`, { fallback: result.code })]);
    }
    setSubmitting(false);
  }

  const localeTabs = (["id", "en", "ar"] as const).map((lc) => (
    <button
      key={lc}
      type="button"
      role="tab"
      aria-selected={locale === lc}
      onClick={() => setLocale(lc)}
      className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
        locale === lc ? "bg-royal-500 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {t(`locale.${lc}`)}
    </button>
  ));

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <FieldSet>
        <FieldLegend>{t("EVENT.commonFields")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-slug`}>{t("EVENT.slug")}</FieldLabel>
            <Input id={`${formId}-slug`} name="slug" defaultValue={(input.slug as string) ?? ""} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-startAt`}>{t("EVENT.startAt")}</FieldLabel>
            <Input id={`${formId}-startAt`} name="startAt" type="datetime-local" defaultValue={toDatetimeLocal(input.startAt as string)} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-endAt`}>{t("EVENT.endAt")}</FieldLabel>
            <Input id={`${formId}-endAt`} name="endAt" type="datetime-local" defaultValue={toDatetimeLocal(input.endAt as string)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-registrationUrl`}>{t("EVENT.registrationUrl")}</FieldLabel>
            <Input id={`${formId}-registrationUrl`} name="registrationUrl" type="url" defaultValue={(input.registrationUrl as string) ?? ""} />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id={`${formId}-published`} checked={isPublished} onCheckedChange={(c) => setIsPublished(c === true)} />
            <FieldLabel htmlFor={`${formId}-published`}>{t("EVENT.isPublished")}</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("translations")}</FieldLegend>
        <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">
          {localeTabs}
        </div>

        <FieldGroup>
          {locale === "id" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-title`}>{t("EVENT.title")} (ID) *</FieldLabel>
                <Input id={`${formId}-id-title`} name="id.title" defaultValue={idTr.title} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-description`}>{t("EVENT.description")} (ID)</FieldLabel>
                <Textarea id={`${formId}-id-description`} name="id.description" defaultValue={idTr.description} rows={4} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-location`}>{t("EVENT.location")} (ID)</FieldLabel>
                <Input id={`${formId}-id-location`} name="id.location" defaultValue={idTr.location} />
              </Field>
            </>
          )}
          {locale === "en" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-title`}>{t("EVENT.title")} (EN)</FieldLabel>
                <Input id={`${formId}-en-title`} name="en.title" defaultValue={enTr.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-description`}>{t("EVENT.description")} (EN)</FieldLabel>
                <Textarea id={`${formId}-en-description`} name="en.description" defaultValue={enTr.description} rows={4} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-location`}>{t("EVENT.location")} (EN)</FieldLabel>
                <Input id={`${formId}-en-location`} name="en.location" defaultValue={enTr.location} />
              </Field>
            </>
          )}
          {locale === "ar" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-title`}>{t("EVENT.title")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-title`} name="ar.title" defaultValue={arTr.title} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-description`}>{t("EVENT.description")} (AR)</FieldLabel>
                <Textarea id={`${formId}-ar-description`} name="ar.description" defaultValue={arTr.description} rows={4} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-location`}>{t("EVENT.location")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-location`} name="ar.location" defaultValue={arTr.location} dir="rtl" />
              </Field>
            </>
          )}
        </FieldGroup>
      </FieldSet>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner className="mr-1" />}
          {mode === "create" ? t("createAction") : t("updateAction")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)} disabled={submitting}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
