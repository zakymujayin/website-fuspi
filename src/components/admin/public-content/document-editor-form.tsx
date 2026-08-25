"use client";
import { formText } from "@/components/admin/form-text";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { executePublicContentAdminCommand } from "@/components/admin/public-content/public-content-server-actions";

type EditorFormProps = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
  expectedVersion?: number;
};

type DocTranslation = { title: string; category: string };

export function DocumentEditorForm({ mode, listHref, initialData, pageId, expectedVersion }: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, DocTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { title: "", category: "" };
  const enTr = translations.en ?? { title: "", category: "" };
  const arTr = translations.ar ?? { title: "", category: "" };

  const [isPublished, setIsPublished] = useState((input.isPublished as boolean) ?? false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);

    const enTitle = formText(fd, "en.title");
    const arTitle = formText(fd, "ar.title");

    const payload: Record<string, unknown> = {
      slug: formText(fd, "slug"),
      publicPdfMediaId: formText(fd, "publicPdfMediaId"),
      isPublished,
      translations: {
        id: {
          title: formText(fd, "id.title"),
          category: formText(fd, "id.category") || null,
        },
        ...(enTitle ? { en: { title: enTitle, category: formText(fd, "en.category") || null } } : {}),
        ...(arTitle ? { ar: { title: arTitle, category: formText(fd, "ar.category") || null } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "DOCUMENT", payload }
      : { action: "UPDATE", resource: "DOCUMENT", mutation: { id: pageId!, expectedVersion: expectedVersion ?? null }, payload };

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
        <FieldLegend>{t("DOCUMENT.commonFields")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-slug`}>{t("DOCUMENT.slug")}</FieldLabel>
            <Input id={`${formId}-slug`} name="slug" defaultValue={(input.slug as string) ?? ""} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-pdf`}>{t("DOCUMENT.publicPdfMediaId")}</FieldLabel>
            <Input id={`${formId}-pdf`} name="publicPdfMediaId" defaultValue={(input.publicPdfMediaId as string) ?? ""} required />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id={`${formId}-published`} checked={isPublished} onCheckedChange={(c) => setIsPublished(c === true)} />
            <FieldLabel htmlFor={`${formId}-published`}>{t("DOCUMENT.isPublished")}</FieldLabel>
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
                <FieldLabel htmlFor={`${formId}-id-title`}>{t("DOCUMENT.title")} (ID) *</FieldLabel>
                <Input id={`${formId}-id-title`} name="id.title" defaultValue={idTr.title} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-category`}>{t("DOCUMENT.category")} (ID)</FieldLabel>
                <Input id={`${formId}-id-category`} name="id.category" defaultValue={idTr.category} />
              </Field>
            </>
          )}
          {locale === "en" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-title`}>{t("DOCUMENT.title")} (EN)</FieldLabel>
                <Input id={`${formId}-en-title`} name="en.title" defaultValue={enTr.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-category`}>{t("DOCUMENT.category")} (EN)</FieldLabel>
                <Input id={`${formId}-en-category`} name="en.category" defaultValue={enTr.category} />
              </Field>
            </>
          )}
          {locale === "ar" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-title`}>{t("DOCUMENT.title")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-title`} name="ar.title" defaultValue={arTr.title} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-category`}>{t("DOCUMENT.category")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-category`} name="ar.category" defaultValue={arTr.category} dir="rtl" />
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
