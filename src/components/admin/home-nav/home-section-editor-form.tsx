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
import { HomeMediaPicker } from "@/components/admin/home-nav/home-media-picker";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";
import { executeHomeNavAdminCommand } from "@/components/admin/home-nav/home-nav-server-actions";

type SectionTranslation = { title: string; subtitle: string; ctaLabel: string };

type Props = {
  listHref: string;
  pageId: string;
  initialData: Record<string, unknown>;
  initialBackground: CoverPreview | null;
  uploadPublicUrl: string;
};

export function HomeSectionEditorForm({ listHref, pageId, initialData, initialBackground, uploadPublicUrl }: Props) {
  const t = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const translations = (initialData.translations as Record<string, SectionTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? { title: "", subtitle: "", ctaLabel: "" };
  const enTr = translations.en ?? { title: "", subtitle: "", ctaLabel: "" };
  const arTr = translations.ar ?? { title: "", subtitle: "", ctaLabel: "" };
  const initialCta = initialData.cta as { href?: string } | null | undefined;

  const [isVisible, setIsVisible] = useState((initialData.isVisible as boolean) ?? true);
  const [backgroundId, setBackgroundId] = useState<string | null>((initialData.backgroundMediaId as string) ?? null);
  const [ctaHref, setCtaHref] = useState(initialCta?.href ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);
    const href = ctaHref.trim();

    const payload: Record<string, unknown> = {
      key: initialData.key,
      isVisible, order: Number(fd.get("order")), itemLimit: Number(fd.get("itemLimit")),
      cta: href ? { kind: href.startsWith("/") ? "INTERNAL" : "EXTERNAL", href } : null,
      backgroundMediaId: backgroundId,
      translations: {
        id: {
          title: formText(fd, "id.title"),
          subtitle: formText(fd, "id.subtitle") || null,
          ctaLabel: href ? formText(fd, "id.ctaLabel") || null : null,
        },
        en: {
          title: formText(fd, "en.title") || formText(fd, "id.title"),
          subtitle: formText(fd, "en.subtitle") || null,
          ctaLabel: href ? formText(fd, "en.ctaLabel") || null : null,
        },
        ar: {
          title: formText(fd, "ar.title") || formText(fd, "id.title"),
          subtitle: formText(fd, "ar.subtitle") || null,
          ctaLabel: href ? formText(fd, "ar.ctaLabel") || null : null,
        },
      },
    };

    const result = await executeHomeNavAdminCommand({
      action: "UPDATE", resource: "HOME_SECTION", mutation: { id: pageId, expectedVersion: null }, payload,
    });

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
        <FieldLegend>{String(initialData.key)}</FieldLegend>
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox id={`${formId}-visible`} checked={isVisible} onCheckedChange={(c) => setIsVisible(c === true)} />
            <FieldLabel htmlFor={`${formId}-visible`}>{t("isVisible")}</FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-order`}>{t("order")}</FieldLabel>
            <Input id={`${formId}-order`} name="order" type="number" min={0} max={10000} defaultValue={(initialData.order as number) ?? 0} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-item-limit`}>{t("section.itemLimit")}</FieldLabel>
            <Input id={`${formId}-item-limit`} name="itemLimit" type="number" min={1} max={12} defaultValue={(initialData.itemLimit as number) ?? 4} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-cta-href`}>{t("slider.ctaHref")}</FieldLabel>
            <Input id={`${formId}-cta-href`} value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/berita" />
          </Field>
        </FieldGroup>
      </FieldSet>

      <HomeMediaPicker
        value={backgroundId}
        onChange={setBackgroundId}
        initialMedia={initialBackground}
        uploadPublicUrl={uploadPublicUrl}
        label={t("section.background")}
        description={t("section.backgroundDescription")}
        chooseLabel={t("picker.choose")}
        changeLabel={t("picker.change")}
        clearLabel={t("picker.clear")}
        selectedLabel={t("picker.selected")}
        noneLabel={t("picker.none")}
        loadingLabel={t("picker.loading")}
        loadErrorLabel={t("picker.loadError")}
        emptyLabel={t("picker.empty")}
        listLabel={t("picker.listLabel")}
      />

      <FieldSet>
        <FieldLegend>{t("translations")}</FieldLegend>
        <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">{localeTabs}</div>
        <FieldGroup>
          {locale === "id" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-title`}>{t("section.sectionTitle")} (ID) *</FieldLabel>
                <Input id={`${formId}-id-title`} name="id.title" defaultValue={idTr.title} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-subtitle`}>{t("slider.subtitle")} (ID)</FieldLabel>
                <Input id={`${formId}-id-subtitle`} name="id.subtitle" defaultValue={idTr.subtitle} />
              </Field>
              {ctaHref && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-id-cta`}>{t("slider.ctaLabel")} (ID)</FieldLabel>
                  <Input id={`${formId}-id-cta`} name="id.ctaLabel" defaultValue={idTr.ctaLabel} />
                </Field>
              )}
            </>
          )}
          {locale === "en" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-title`}>{t("section.sectionTitle")} (EN)</FieldLabel>
                <Input id={`${formId}-en-title`} name="en.title" defaultValue={enTr.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-subtitle`}>{t("slider.subtitle")} (EN)</FieldLabel>
                <Input id={`${formId}-en-subtitle`} name="en.subtitle" defaultValue={enTr.subtitle} />
              </Field>
              {ctaHref && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-en-cta`}>{t("slider.ctaLabel")} (EN)</FieldLabel>
                  <Input id={`${formId}-en-cta`} name="en.ctaLabel" defaultValue={enTr.ctaLabel} />
                </Field>
              )}
            </>
          )}
          {locale === "ar" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-title`}>{t("section.sectionTitle")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-title`} name="ar.title" defaultValue={arTr.title} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-subtitle`}>{t("slider.subtitle")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-subtitle`} name="ar.subtitle" defaultValue={arTr.subtitle} dir="rtl" />
              </Field>
              {ctaHref && (
                <Field>
                  <FieldLabel htmlFor={`${formId}-ar-cta`}>{t("slider.ctaLabel")} (AR)</FieldLabel>
                  <Input id={`${formId}-ar-cta`} name="ar.ctaLabel" defaultValue={arTr.ctaLabel} dir="rtl" />
                </Field>
              )}
            </>
          )}
        </FieldGroup>
      </FieldSet>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner className="mr-1" />}
          {t("updateAction")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(listHref)} disabled={submitting}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
