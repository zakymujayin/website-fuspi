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

type FaqTranslation = { category: string; question: string; answer: string };

export function FaqEditorForm({ mode, listHref, initialData, pageId, expectedVersion }: EditorFormProps) {
  const t = useTranslations("AdminPublicContent");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, FaqTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { category: "", question: "", answer: "" };
  const enTr = translations.en ?? { category: "", question: "", answer: "" };
  const arTr = translations.ar ?? { category: "", question: "", answer: "" };

  const [isVisible, setIsVisible] = useState((input.isVisible as boolean) ?? false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);

    const enQuestion = (fd.get("en.question") as string).trim();
    const arQuestion = (fd.get("ar.question") as string).trim();

    const payload: Record<string, unknown> = {
      order: Number(fd.get("order")),
      isVisible,
      translations: {
        id: {
          category: (fd.get("id.category") as string).trim() || null,
          question: (fd.get("id.question") as string).trim(),
          answer: (fd.get("id.answer") as string).trim(),
        },
        ...(enQuestion ? { en: { category: (fd.get("en.category") as string).trim() || null, question: enQuestion, answer: (fd.get("en.answer") as string).trim() } } : {}),
        ...(arQuestion ? { ar: { category: (fd.get("ar.category") as string).trim() || null, question: arQuestion, answer: (fd.get("ar.answer") as string).trim() } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "FAQ", payload }
      : { action: "UPDATE", resource: "FAQ", mutation: { id: pageId!, expectedVersion: expectedVersion ?? null }, payload };

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
        <FieldLegend>{t("FAQ.commonFields")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-order`}>{t("FAQ.order")}</FieldLabel>
            <Input id={`${formId}-order`} name="order" type="number" min={0} max={10000} defaultValue={(input.order as number) ?? 0} required />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id={`${formId}-visible`} checked={isVisible} onCheckedChange={(c) => setIsVisible(c === true)} />
            <FieldLabel htmlFor={`${formId}-visible`}>{t("FAQ.isVisible")}</FieldLabel>
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
                <FieldLabel htmlFor={`${formId}-id-category`}>{t("FAQ.category")} (ID)</FieldLabel>
                <Input id={`${formId}-id-category`} name="id.category" defaultValue={idTr.category} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-question`}>{t("FAQ.question")} (ID) *</FieldLabel>
                <Input id={`${formId}-id-question`} name="id.question" defaultValue={idTr.question} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-answer`}>{t("FAQ.answer")} (ID) *</FieldLabel>
                <Textarea id={`${formId}-id-answer`} name="id.answer" defaultValue={idTr.answer} rows={6} required />
              </Field>
            </>
          )}
          {locale === "en" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-category`}>{t("FAQ.category")} (EN)</FieldLabel>
                <Input id={`${formId}-en-category`} name="en.category" defaultValue={enTr.category} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-question`}>{t("FAQ.question")} (EN)</FieldLabel>
                <Input id={`${formId}-en-question`} name="en.question" defaultValue={enTr.question} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-answer`}>{t("FAQ.answer")} (EN)</FieldLabel>
                <Textarea id={`${formId}-en-answer`} name="en.answer" defaultValue={enTr.answer} rows={6} />
              </Field>
            </>
          )}
          {locale === "ar" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-category`}>{t("FAQ.category")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-category`} name="ar.category" defaultValue={arTr.category} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-question`}>{t("FAQ.question")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-question`} name="ar.question" defaultValue={arTr.question} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-answer`}>{t("FAQ.answer")} (AR)</FieldLabel>
                <Textarea id={`${formId}-ar-answer`} name="ar.answer" defaultValue={arTr.answer} rows={6} dir="rtl" />
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
