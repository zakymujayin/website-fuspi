"use client";

import {useTranslations} from "next-intl";
import {useId, useState, type FormEvent} from "react";

import {HomeMediaPicker} from "@/components/admin/home-nav/home-media-picker";
import type {CoverPreview} from "@/components/admin/posts/post-cover-picker";
import {executeFacilityAdminCommand} from "@/components/admin/facility/facility-server-actions";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Spinner} from "@/components/ui/spinner";
import {Textarea} from "@/components/ui/textarea";
import {useRouter} from "@/i18n/navigation";

type FacilityTranslation = {name: string; description: string | null};

type Props = {
  mode: "create" | "edit";
  listHref: string;
  initialData?: Record<string, unknown>;
  initialVersion?: number;
  initialCover?: CoverPreview | null;
  pageId?: string;
  uploadPublicUrl: string;
};

const FACILITY_TYPES = ["BANGUNAN", "LABORATORIUM", "PERPUSTAKAAN", "MUSHOLA", "AULA", "PARKIR", "KANTIN", "LAINNYA"] as const;
const EMPTY_TRANSLATION: FacilityTranslation = {name: "", description: ""};

export function FacilityEditorForm({
  mode,
  listHref,
  initialData,
  initialVersion,
  initialCover = null,
  pageId,
  uploadPublicUrl,
}: Props) {
  const t = useTranslations("AdminFacility");
  const router = useRouter();
  const formId = useId();
  const input = (initialData ?? {}) as Record<string, unknown>;
  const translations = (input.translations as Record<string, FacilityTranslation | undefined> | undefined) ?? {};
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");
  const [isActive, setIsActive] = useState((input.isActive as boolean | undefined) ?? true);
  const [coverMediaId, setCoverMediaId] = useState<string | null>((input.coverMediaId as string | null | undefined) ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const idTr = translations.id ?? EMPTY_TRANSLATION;
  const enTr = translations.en ?? EMPTY_TRANSLATION;
  const arTr = translations.ar ?? EMPTY_TRANSLATION;

  function translationPayload(formData: FormData, prefix: "id" | "en" | "ar", required: boolean) {
    const name = (formData.get(`${prefix}.name`) as string).trim();
    const description = (formData.get(`${prefix}.description`) as string).trim();
    if (!name && !required) return null;
    return {name, description: description || null};
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);
    const id = translationPayload(fd, "id", true);
    const en = translationPayload(fd, "en", false);
    const ar = translationPayload(fd, "ar", false);

    const payload: Record<string, unknown> = {
      slug: (fd.get("slug") as string).trim(),
      type: fd.get("type"),
      isActive,
      order: Number(fd.get("order")),
      coverMediaId,
      contentOwnerId: null,
      translations: {id, ...(en ? {en} : {}), ...(ar ? {ar} : {})},
    };

    const command = mode === "create"
      ? {action: "CREATE", payload}
      : {action: "UPDATE", mutation: {id: pageId, expectedVersion: initialVersion}, payload};

    const result = await executeFacilityAdminCommand(command);
    if (result.ok) {
      router.push(listHref);
      router.refresh();
    } else {
      setErrors([t(`errors.${result.code}`, {fallback: result.code})]);
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!pageId || !window.confirm(t("deleteConfirm"))) return;
    setSubmitting(true);
    setErrors([]);
    const result = await executeFacilityAdminCommand({action: "DELETE", id: pageId});
    if (result.ok) {
      router.push(listHref);
      router.refresh();
    } else {
      setErrors([t(`errors.${result.code}`, {fallback: result.code})]);
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
      {errors.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((error, index) => <p key={index}>{error}</p>)}
        </div>
      ) : null}

      <FieldSet>
        <FieldLegend>{t("commonFields")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-slug`}>{t("slug")}</FieldLabel>
            <Input
              id={`${formId}-slug`}
              name="slug"
              defaultValue={(input.slug as string | undefined) ?? ""}
              readOnly={mode === "edit"}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-type`}>{t("type")}</FieldLabel>
            <select
              id={`${formId}-type`}
              name="type"
              defaultValue={(input.type as string | undefined) ?? "BANGUNAN"}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {FACILITY_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-order`}>{t("order")}</FieldLabel>
            <Input id={`${formId}-order`} name="order" type="number" min={0} max={10000} defaultValue={(input.order as number | undefined) ?? 0} required />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id={`${formId}-active`} checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
            <FieldLabel htmlFor={`${formId}-active`}>{t("isActive")}</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>

      <HomeMediaPicker
        value={coverMediaId}
        onChange={setCoverMediaId}
        initialMedia={initialCover}
        uploadPublicUrl={uploadPublicUrl}
        label={t("cover")}
        description={t("coverDescription")}
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
          <div className={locale === "id" ? "contents" : "hidden"}>
            <Field>
              <FieldLabel htmlFor={`${formId}-id-name`}>{t("name")} (ID) *</FieldLabel>
              <Input id={`${formId}-id-name`} name="id.name" defaultValue={idTr.name} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-id-description`}>{t("descriptionField")} (ID)</FieldLabel>
              <Textarea id={`${formId}-id-description`} name="id.description" defaultValue={idTr.description ?? ""} />
            </Field>
          </div>
          <div className={locale === "en" ? "contents" : "hidden"}>
            <Field>
              <FieldLabel htmlFor={`${formId}-en-name`}>{t("name")} (EN)</FieldLabel>
              <Input id={`${formId}-en-name`} name="en.name" defaultValue={enTr.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-en-description`}>{t("descriptionField")} (EN)</FieldLabel>
              <Textarea id={`${formId}-en-description`} name="en.description" defaultValue={enTr.description ?? ""} />
            </Field>
          </div>
          <div className={locale === "ar" ? "contents" : "hidden"}>
            <Field>
              <FieldLabel htmlFor={`${formId}-ar-name`}>{t("name")} (AR)</FieldLabel>
              <Input id={`${formId}-ar-name`} name="ar.name" defaultValue={arTr.name} dir="rtl" />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-ar-description`}>{t("descriptionField")} (AR)</FieldLabel>
              <Textarea id={`${formId}-ar-description`} name="ar.description" defaultValue={arTr.description ?? ""} dir="rtl" />
            </Field>
          </div>
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
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
            {t("deleteAction")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
