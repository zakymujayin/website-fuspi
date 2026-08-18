"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useId, type FormEvent } from "react";
import { AdminFormLayout } from "@/components/admin/admin-form-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type AlbumTranslation = { title: string; description: string };

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
}

export function AlbumEditorForm({ mode, listHref, initialData, pageId, expectedVersion }: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, AlbumTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { title: "", description: "" };
  const enTr = translations.en ?? { title: "", description: "" };
  const arTr = translations.ar ?? { title: "", description: "" };

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
      eventDate: (fd.get("eventDate") as string) ? new Date(fd.get("eventDate") as string).toISOString() : null,
      isPublished,
      translations: {
        id: {
          title: (fd.get("id.title") as string).trim(),
          description: (fd.get("id.description") as string).trim() || null,
        },
        ...(enTitle ? { en: { title: enTitle, description: (fd.get("en.description") as string).trim() || null } } : {}),
        ...(arTitle ? { ar: { title: arTitle, description: (fd.get("ar.description") as string).trim() || null } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "ALBUM", payload }
      : { action: "UPDATE", resource: "ALBUM", mutation: { id: pageId!, expectedVersion: expectedVersion ?? null }, payload };

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

      <AdminFormLayout
        main={
          <FieldSet>
            <FieldLegend>{t("translations")}</FieldLegend>
            <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">
              {localeTabs}
            </div>

            <FieldGroup>
              {locale === "id" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-title`}>{t("ALBUM.title")} (ID) *</FieldLabel>
                    <Input id={`${formId}-id-title`} name="id.title" defaultValue={idTr.title} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-description`}>{t("ALBUM.description")} (ID)</FieldLabel>
                    <Textarea id={`${formId}-id-description`} name="id.description" defaultValue={idTr.description} rows={4} />
                  </Field>
                </>
              )}
              {locale === "en" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-title`}>{t("ALBUM.title")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-title`} name="en.title" defaultValue={enTr.title} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-description`}>{t("ALBUM.description")} (EN)</FieldLabel>
                    <Textarea id={`${formId}-en-description`} name="en.description" defaultValue={enTr.description} rows={4} />
                  </Field>
                </>
              )}
              {locale === "ar" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-title`}>{t("ALBUM.title")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-title`} name="ar.title" defaultValue={arTr.title} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-description`}>{t("ALBUM.description")} (AR)</FieldLabel>
                    <Textarea id={`${formId}-ar-description`} name="ar.description" defaultValue={arTr.description} rows={4} dir="rtl" />
                  </Field>
                </>
              )}
            </FieldGroup>
          </FieldSet>
        }
        sidebar={
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex items-center gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Spinner className="mr-1" />}
                  {mode === "create" ? t("createAction") : t("updateAction")}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(listHref)} disabled={submitting}>
                  {t("cancel")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-slug`}>{t("ALBUM.slug")}</FieldLabel>
                    <Input id={`${formId}-slug`} name="slug" defaultValue={(input.slug as string) ?? ""} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-eventDate`}>{t("ALBUM.eventDate")}</FieldLabel>
                    <Input id={`${formId}-eventDate`} name="eventDate" type="date" defaultValue={toDateInput(input.eventDate as string)} />
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id={`${formId}-published`} checked={isPublished} onCheckedChange={(c) => setIsPublished(c === true)} />
                    <FieldLabel htmlFor={`${formId}-published`}>{t("ALBUM.isPublished")}</FieldLabel>
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
