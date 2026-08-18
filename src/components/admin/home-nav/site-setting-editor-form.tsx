"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";

import { AdminFormLayout } from "@/components/admin/admin-form-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { HomeMediaPicker } from "@/components/admin/home-nav/home-media-picker";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";
import { executeHomeNavAdminCommand } from "@/components/admin/home-nav/home-nav-server-actions";

type SiteSettingTranslation = {
  facultyName: string; tagline: string; address1: string; address2: string;
  deanPosition: string; deanMessage: string; videoTitle: string; videoDesc: string;
};

type Props = {
  listHref: string;
  initialData: Record<string, unknown>;
  initialVersion: number;
  initialDeanPhoto: CoverPreview | null;
  initialVideoPoster: CoverPreview | null;
  uploadPublicUrl: string;
};

const EMPTY: SiteSettingTranslation = {
  facultyName: "", tagline: "", address1: "", address2: "", deanPosition: "", deanMessage: "", videoTitle: "", videoDesc: "",
};

export function SiteSettingEditorForm({ listHref, initialData, initialVersion, initialDeanPhoto, initialVideoPoster, uploadPublicUrl }: Props) {
  const t = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<"id" | "en" | "ar">("id");

  const translations = (initialData.translations as Record<string, SiteSettingTranslation | undefined> | undefined) ?? {};
  const idTr = translations.id ?? EMPTY;
  const enTr = translations.en ?? EMPTY;
  const arTr = translations.ar ?? EMPTY;

  const [deanPhotoId, setDeanPhotoId] = useState<string | null>((initialData.deanPhotoMediaId as string) ?? null);
  const [videoPosterId, setVideoPosterId] = useState<string | null>((initialData.videoPosterMediaId as string) ?? null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const fd = new FormData(event.currentTarget);
    const deanName = (fd.get("deanName") as string).trim() || null;
    const videoUrl = (fd.get("videoUrl") as string).trim() || null;

    if ((deanName === null) !== (deanPhotoId === null)) {
      setErrors([t("errors.deanIncomplete")]);
      setSubmitting(false);
      return;
    }
    if ((videoUrl === null) !== (videoPosterId === null)) {
      setErrors([t("errors.videoIncomplete")]);
      setSubmitting(false);
      return;
    }

    const localized = (prefix: "id" | "en" | "ar", required: boolean): SiteSettingTranslation | null => {
      const facultyName = (fd.get(`${prefix}.facultyName`) as string).trim();
      if (!facultyName && !required) return null;
      return {
        facultyName,
        tagline: (fd.get(`${prefix}.tagline`) as string).trim() || null as unknown as string,
        address1: (fd.get(`${prefix}.address1`) as string).trim() || null as unknown as string,
        address2: (fd.get(`${prefix}.address2`) as string).trim() || null as unknown as string,
        deanPosition: deanName ? (fd.get(`${prefix}.deanPosition`) as string).trim() : null as unknown as string,
        deanMessage: deanName ? (fd.get(`${prefix}.deanMessage`) as string).trim() : null as unknown as string,
        videoTitle: videoUrl ? (fd.get(`${prefix}.videoTitle`) as string).trim() : null as unknown as string,
        videoDesc: (fd.get(`${prefix}.videoDesc`) as string).trim() || null as unknown as string,
      };
    };

    const payload: Record<string, unknown> = {
      deanName, deanPhotoMediaId: deanPhotoId, videoUrl, videoPosterMediaId: videoPosterId,
      email: (fd.get("email") as string).trim() || null,
      phone: (fd.get("phone") as string).trim() || null,
      facebookUrl: (fd.get("facebookUrl") as string).trim() || null,
      instagramUrl: (fd.get("instagramUrl") as string).trim() || null,
      youtubeUrl: (fd.get("youtubeUrl") as string).trim() || null,
      xUrl: (fd.get("xUrl") as string).trim() || null,
      contentOwnerId: null, expiresAt: null,
      translations: (() => {
        const en = localized("en", false);
        const ar = localized("ar", false);
        return {id: localized("id", true), ...(en ? {en} : {}), ...(ar ? {ar} : {})};
      })(),
    };

    const result = await executeHomeNavAdminCommand({
      action: "UPDATE", resource: "SITE_SETTING",
      mutation: { id: "singleton", expectedVersion: initialVersion }, payload,
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

      <AdminFormLayout
        main={
          <FieldSet>
            <FieldLegend>{t("translations")}</FieldLegend>
            <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">{localeTabs}</div>
            <FieldGroup>
              {locale === "id" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-faculty`}>{t("settings.facultyName")} (ID) *</FieldLabel>
                    <Input id={`${formId}-id-faculty`} name="id.facultyName" defaultValue={idTr.facultyName} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-tagline`}>{t("settings.tagline")} (ID)</FieldLabel>
                    <Input id={`${formId}-id-tagline`} name="id.tagline" defaultValue={idTr.tagline} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-address1`}>{t("settings.address1")} (ID)</FieldLabel>
                    <Textarea id={`${formId}-id-address1`} name="id.address1" defaultValue={idTr.address1} rows={2} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-dean-position`}>{t("settings.deanPosition")} (ID)</FieldLabel>
                    <Input id={`${formId}-id-dean-position`} name="id.deanPosition" defaultValue={idTr.deanPosition} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-dean-message`}>{t("settings.deanMessage")} (ID)</FieldLabel>
                    <Textarea id={`${formId}-id-dean-message`} name="id.deanMessage" defaultValue={idTr.deanMessage} rows={6} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-video-title`}>{t("settings.videoTitle")} (ID)</FieldLabel>
                    <Input id={`${formId}-id-video-title`} name="id.videoTitle" defaultValue={idTr.videoTitle} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-id-video-desc`}>{t("settings.videoDesc")} (ID)</FieldLabel>
                    <Textarea id={`${formId}-id-video-desc`} name="id.videoDesc" defaultValue={idTr.videoDesc} rows={3} />
                  </Field>
                </>
              )}
              {locale === "en" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-faculty`}>{t("settings.facultyName")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-faculty`} name="en.facultyName" defaultValue={enTr.facultyName} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-tagline`}>{t("settings.tagline")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-tagline`} name="en.tagline" defaultValue={enTr.tagline} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-dean-position`}>{t("settings.deanPosition")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-dean-position`} name="en.deanPosition" defaultValue={enTr.deanPosition} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-dean-message`}>{t("settings.deanMessage")} (EN)</FieldLabel>
                    <Textarea id={`${formId}-en-dean-message`} name="en.deanMessage" defaultValue={enTr.deanMessage} rows={6} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-en-video-title`}>{t("settings.videoTitle")} (EN)</FieldLabel>
                    <Input id={`${formId}-en-video-title`} name="en.videoTitle" defaultValue={enTr.videoTitle} />
                  </Field>
                </>
              )}
              {locale === "ar" && (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-faculty`}>{t("settings.facultyName")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-faculty`} name="ar.facultyName" defaultValue={arTr.facultyName} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-tagline`}>{t("settings.tagline")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-tagline`} name="ar.tagline" defaultValue={arTr.tagline} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-dean-position`}>{t("settings.deanPosition")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-dean-position`} name="ar.deanPosition" defaultValue={arTr.deanPosition} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-dean-message`}>{t("settings.deanMessage")} (AR)</FieldLabel>
                    <Textarea id={`${formId}-ar-dean-message`} name="ar.deanMessage" defaultValue={arTr.deanMessage} rows={6} dir="rtl" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-ar-video-title`}>{t("settings.videoTitle")} (AR)</FieldLabel>
                    <Input id={`${formId}-ar-video-title`} name="ar.videoTitle" defaultValue={arTr.videoTitle} dir="rtl" />
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
                  {t("updateAction")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.contact")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-email`}>{t("settings.email")}</FieldLabel>
                    <Input id={`${formId}-email`} name="email" type="email" defaultValue={(initialData.email as string) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-phone`}>{t("settings.phone")}</FieldLabel>
                    <Input id={`${formId}-phone`} name="phone" defaultValue={(initialData.phone as string) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-facebook`}>Facebook</FieldLabel>
                    <Input id={`${formId}-facebook`} name="facebookUrl" defaultValue={(initialData.facebookUrl as string) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-instagram`}>Instagram</FieldLabel>
                    <Input id={`${formId}-instagram`} name="instagramUrl" defaultValue={(initialData.instagramUrl as string) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-youtube`}>YouTube</FieldLabel>
                    <Input id={`${formId}-youtube`} name="youtubeUrl" defaultValue={(initialData.youtubeUrl as string) ?? ""} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-x`}>X</FieldLabel>
                    <Input id={`${formId}-x`} name="xUrl" defaultValue={(initialData.xUrl as string) ?? ""} />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.dean")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-dean-name`}>{t("settings.deanName")}</FieldLabel>
                    <Input id={`${formId}-dean-name`} name="deanName" defaultValue={(initialData.deanName as string) ?? ""} />
                  </Field>
                  <HomeMediaPicker
                    value={deanPhotoId}
                    onChange={setDeanPhotoId}
                    initialMedia={initialDeanPhoto}
                    uploadPublicUrl={uploadPublicUrl}
                    label={t("settings.deanPhoto")}
                    description={t("settings.deanPhotoDescription")}
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
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("settings.video")}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-video-url`}>{t("settings.videoUrl")}</FieldLabel>
                    <Input id={`${formId}-video-url`} name="videoUrl" defaultValue={(initialData.videoUrl as string) ?? ""} placeholder="https://youtube.com/watch?v=..." />
                  </Field>
                  <HomeMediaPicker
                    value={videoPosterId}
                    onChange={setVideoPosterId}
                    initialMedia={initialVideoPoster}
                    uploadPublicUrl={uploadPublicUrl}
                    label={t("settings.videoPoster")}
                    description={t("settings.videoPosterDescription")}
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
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        }
      />
    </form>
  );
}
