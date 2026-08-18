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

type TestimonialTranslation = { currentRole: string; quote: string };

export function TestimonialEditorForm({ mode, listHref, initialData, pageId, expectedVersion }: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, TestimonialTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { currentRole: "", quote: "" };
  const enTr = translations.en ?? { currentRole: "", quote: "" };
  const arTr = translations.ar ?? { currentRole: "", quote: "" };

  const [isVisible, setIsVisible] = useState((input.isVisible as boolean) ?? false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);

    const enQuote = (fd.get("en.quote") as string).trim();
    const arQuote = (fd.get("ar.quote") as string).trim();

    const payload: Record<string, unknown> = {
      name: (fd.get("name") as string).trim(),
      graduationYear: (fd.get("graduationYear") as string) ? Number(fd.get("graduationYear")) : null,
      order: Number(fd.get("order")),
      isVisible,
      translations: {
        id: {
          currentRole: (fd.get("id.currentRole") as string).trim() || null,
          quote: (fd.get("id.quote") as string).trim(),
        },
        ...(enQuote ? { en: { currentRole: (fd.get("en.currentRole") as string).trim() || null, quote: enQuote } } : {}),
        ...(arQuote ? { ar: { currentRole: (fd.get("ar.currentRole") as string).trim() || null, quote: arQuote } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "TESTIMONIAL", payload }
      : { action: "UPDATE", resource: "TESTIMONIAL", mutation: { id: pageId!, expectedVersion: expectedVersion ?? null }, payload };

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
                    <FieldLabel htmlFor={`${formId}-id-currentRole`}>{t("TESTIMONIAL.currentRole")} (ID)</FieldLabel>
                    <Input id={`${formId}-id-currentRole`} name="id.currentRole" defaultValue={idTr.currentRole} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-quote`}>{t("TESTIMONIAL.quote")} (ID) *</FieldLabel>
                    <Textarea id={`${formId}-id-quote`} name="id.quote" defaultValue={idTr.quote} rows={5} required />
                  </Field>
                </>
              )}
              {locale === "en" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-currentRole`}>{t("TESTIMONIAL.currentRole")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-currentRole`} name="en.currentRole" defaultValue={enTr.currentRole} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-quote`}>{t("TESTIMONIAL.quote")} (EN)</FieldLabel>
                    <Textarea id={`${formId}-en-quote`} name="en.quote" defaultValue={enTr.quote} rows={5} />
                  </Field>
                </>
              )}
              {locale === "ar" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-currentRole`}>{t("TESTIMONIAL.currentRole")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-currentRole`} name="ar.currentRole" defaultValue={arTr.currentRole} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-quote`}>{t("TESTIMONIAL.quote")} (AR)</FieldLabel>
                    <Textarea id={`${formId}-ar-quote`} name="ar.quote" defaultValue={arTr.quote} rows={5} dir="rtl" />
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
                    <FieldLabel htmlFor={`${formId}-name`}>{t("TESTIMONIAL.name")}</FieldLabel>
                    <Input id={`${formId}-name`} name="name" defaultValue={(input.name as string) ?? ""} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-graduationYear`}>{t("TESTIMONIAL.graduationYear")}</FieldLabel>
                    <Input id={`${formId}-graduationYear`} name="graduationYear" type="number" min={1900} max={2100} defaultValue={(input.graduationYear as number) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-order`}>{t("TESTIMONIAL.order")}</FieldLabel>
                    <Input id={`${formId}-order`} name="order" type="number" min={0} max={10000} defaultValue={(input.order as number) ?? 0} required />
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id={`${formId}-visible`} checked={isVisible} onCheckedChange={(c) => setIsVisible(c === true)} />
                    <FieldLabel htmlFor={`${formId}-visible`}>{t("TESTIMONIAL.isVisible")}</FieldLabel>
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
