"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { AdminFormLayout } from "@/components/admin/admin-form-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { executeHomeNavAdminCommand } from "@/components/admin/home-nav/home-nav-server-actions";

type Props = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  pageId?: string;
};

export function StatisticEditorForm({ mode, listHref, initialData, pageId }: Props) {
  const t = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, { label: string } | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { label: "" };
  const enTr = translations.en ?? { label: "" };
  const arTr = translations.ar ?? { label: "" };

  const [isVisible, setIsVisible] = useState((input.isVisible as boolean) ?? true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);
    const enLabel = (fd.get("en.label") as string).trim();
    const arLabel = (fd.get("ar.label") as string).trim();

    const payload: Record<string, unknown> = {
      value: (fd.get("value") as string).trim(),
      suffix: (fd.get("suffix") as string).trim() || null,
      icon: (fd.get("icon") as string).trim() || null,
      order: Number(fd.get("order")),
      isVisible,
      translations: {
        id: { label: (fd.get("id.label") as string).trim() },
        ...(enLabel ? { en: { label: enLabel } } : {}),
        ...(arLabel ? { ar: { label: arLabel } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "STATISTIC", payload }
      : { action: "UPDATE", resource: "STATISTIC", mutation: { id: pageId!, expectedVersion: null }, payload };

    const result = await executeHomeNavAdminCommand(command);

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
            <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">{localeTabs}</div>
            <FieldGroup>
              {locale === "id" && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-id-label`}>{t("statistic.label")} (ID) *</FieldLabel>
                  <Input id={`${formId}-id-label`} name="id.label" defaultValue={idTr.label} required />
                </Field>
              )}
              {locale === "en" && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-en-label`}>{t("statistic.label")} (EN)</FieldLabel>
                  <Input id={`${formId}-en-label`} name="en.label" defaultValue={enTr.label} />
                </Field>
              )}
              {locale === "ar" && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-ar-label`}>{t("statistic.label")} (AR)</FieldLabel>
                  <Input id={`${formId}-ar-label`} name="ar.label" defaultValue={arTr.label} dir="rtl" />
                </Field>
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
              <CardHeader>
                <CardTitle>{t("statistic.commonFields")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-value`}>{t("statistic.value")}</FieldLabel>
                    <Input id={`${formId}-value`} name="value" defaultValue={(input.value as string) ?? ""} placeholder="100" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-suffix`}>{t("statistic.suffix")}</FieldLabel>
                    <Input id={`${formId}-suffix`} name="suffix" defaultValue={(input.suffix as string) ?? ""} placeholder="+" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-icon`}>{t("statistic.icon")}</FieldLabel>
                    <Input id={`${formId}-icon`} name="icon" defaultValue={(input.icon as string) ?? ""} placeholder="graduation-cap" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-order`}>{t("order")}</FieldLabel>
                    <Input id={`${formId}-order`} name="order" type="number" min={0} max={10000} defaultValue={(input.order as number) ?? 0} required />
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id={`${formId}-visible`} checked={isVisible} onCheckedChange={(c) => setIsVisible(c === true)} />
                    <FieldLabel htmlFor={`${formId}-visible`}>{t("isVisible")}</FieldLabel>
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
