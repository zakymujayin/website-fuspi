"use client";
import { formText } from "@/components/admin/form-text";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
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

export function HomeVideoEditorForm({ mode, listHref, initialData, pageId }: Props) {
  const t = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, { title: string } | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { title: "" };
  const enTr = translations.en ?? { title: "" };
  const arTr = translations.ar ?? { title: "" };

  const [isVisible, setIsVisible] = useState((input.isVisible as boolean) ?? true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);
    const enTitle = formText(fd, "en.title");
    const arTitle = formText(fd, "ar.title");

    const payload: Record<string, unknown> = {
      youtubeUrl: formText(fd, "youtubeUrl"),
      order: Number(fd.get("order")),
      isVisible,
      translations: {
        id: { title: formText(fd, "id.title") },
        ...(enTitle ? { en: { title: enTitle } } : {}),
        ...(arTitle ? { ar: { title: arTitle } } : {}),
      },
    };

    const command = mode === "create"
      ? { action: "CREATE", resource: "HOME_VIDEO", payload }
      : { action: "UPDATE", resource: "HOME_VIDEO", mutation: { id: pageId!, expectedVersion: null }, payload };

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

      <FieldSet>
        <FieldLegend>{t("homeVideo.commonFields")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-youtubeUrl`}>{t("homeVideo.youtubeUrl")}</FieldLabel>
            <Input
              id={`${formId}-youtubeUrl`}
              name="youtubeUrl"
              type="url"
              defaultValue={(input.youtubeUrl as string) ?? ""}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
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
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("translations")}</FieldLegend>
        <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">{localeTabs}</div>
        <FieldGroup>
          {locale === "id" && (
            <Field>
              <FieldLabel htmlFor={`${formId}-id-title`}>{t("homeVideo.videoTitle")} (ID) *</FieldLabel>
              <Input id={`${formId}-id-title`} name="id.title" defaultValue={idTr.title} required />
            </Field>
          )}
          {locale === "en" && (
            <Field>
              <FieldLabel htmlFor={`${formId}-en-title`}>{t("homeVideo.videoTitle")} (EN)</FieldLabel>
              <Input id={`${formId}-en-title`} name="en.title" defaultValue={enTr.title} />
            </Field>
          )}
          {locale === "ar" && (
            <Field>
              <FieldLabel htmlFor={`${formId}-ar-title`}>{t("homeVideo.videoTitle")} (AR)</FieldLabel>
              <Input id={`${formId}-ar-title`} name="ar.title" defaultValue={arTr.title} dir="rtl" />
            </Field>
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
