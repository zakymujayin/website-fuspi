"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
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
type SiteSettingLocale = "id" | "en" | "ar";
type SiteSettingTranslationField = keyof SiteSettingTranslation;
type ContactFields = {
  email: string; phone: string; facebookUrl: string; instagramUrl: string; youtubeUrl: string; xUrl: string;
};

type Props = {
  listHref: string;
  initialData: Record<string, unknown>;
  initialVersion: number;
  initialDeanPhoto: CoverPreview | null;
  initialVideoPoster: CoverPreview | null;
  initialLogo: CoverPreview | null;
  initialAccreditationLogo: CoverPreview | null;
  initialBluLogo: CoverPreview | null;
  uploadPublicUrl: string;
};

const EMPTY: SiteSettingTranslation = {
  facultyName: "", tagline: "", address1: "", address2: "", deanPosition: "", deanMessage: "", videoTitle: "", videoDesc: "",
};

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function translationValue(value: unknown): SiteSettingTranslation {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    facultyName: textValue(source.facultyName),
    tagline: textValue(source.tagline),
    address1: textValue(source.address1),
    address2: textValue(source.address2),
    deanPosition: textValue(source.deanPosition),
    deanMessage: textValue(source.deanMessage),
    videoTitle: textValue(source.videoTitle),
    videoDesc: textValue(source.videoDesc),
  };
}

export function SiteSettingEditorForm({
  listHref,
  initialData,
  initialVersion,
  initialDeanPhoto,
  initialVideoPoster,
  initialLogo,
  initialAccreditationLogo,
  initialBluLogo,
  uploadPublicUrl,
}: Props) {
  const t = useTranslations("AdminHomeNav");
  const router = useRouter();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [locale, setLocale] = useState<SiteSettingLocale>("id");

  const translations = (initialData.translations as Record<string, unknown> | undefined) ?? {};
  const [contact, setContact] = useState<ContactFields>({
    email: textValue(initialData.email),
    phone: textValue(initialData.phone),
    facebookUrl: textValue(initialData.facebookUrl),
    instagramUrl: textValue(initialData.instagramUrl),
    youtubeUrl: textValue(initialData.youtubeUrl),
    xUrl: textValue(initialData.xUrl),
  });
  const [deanName, setDeanName] = useState(textValue(initialData.deanName));
  const [videoUrl, setVideoUrl] = useState(textValue(initialData.videoUrl));
  const [translationValues, setTranslationValues] = useState<Record<SiteSettingLocale, SiteSettingTranslation>>({
    id: translationValue(translations.id ?? EMPTY),
    en: translationValue(translations.en ?? EMPTY),
    ar: translationValue(translations.ar ?? EMPTY),
  });

  const [deanPhotoId, setDeanPhotoId] = useState<string | null>((initialData.deanPhotoMediaId as string) ?? null);
  const [videoPosterId, setVideoPosterId] = useState<string | null>((initialData.videoPosterMediaId as string) ?? null);
  const [logoId, setLogoId] = useState<string | null>((initialData.logoMediaId as string | null | undefined) ?? null);
  const [accreditationLogoId, setAccreditationLogoId] = useState<string | null>(
    (initialData.accreditationLogoMediaId as string | null | undefined) ?? null,
  );
  const [bluLogoId, setBluLogoId] = useState<string | null>(
    (initialData.bluLogoMediaId as string | null | undefined) ?? null,
  );

  const idTr = translationValues.id;
  const enTr = translationValues.en;
  const arTr = translationValues.ar;

  function updateContact(field: keyof ContactFields) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setContact((current) => ({...current, [field]: event.target.value}));
    };
  }

  function updateTranslation(prefix: SiteSettingLocale, field: SiteSettingTranslationField) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setTranslationValues((current) => ({
        ...current,
        [prefix]: {...current[prefix], [field]: event.target.value},
      }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const deanNamePayload = nullableText(deanName);
    const videoUrlPayload = nullableText(videoUrl);

    if ((deanNamePayload === null) !== (deanPhotoId === null)) {
      setErrors([t("errors.deanIncomplete")]);
      setSubmitting(false);
      return;
    }
    if ((videoUrlPayload === null) !== (videoPosterId === null)) {
      setErrors([t("errors.videoIncomplete")]);
      setSubmitting(false);
      return;
    }

    const localized = (prefix: SiteSettingLocale, required: boolean) => {
      const values = translationValues[prefix];
      const facultyName = nullableText(values.facultyName);
      if (!facultyName && !required) return null;
      return {
        facultyName: facultyName ?? "",
        tagline: nullableText(values.tagline),
        address1: nullableText(values.address1),
        address2: nullableText(values.address2),
        deanPosition: deanNamePayload ? nullableText(values.deanPosition) : null,
        deanMessage: deanNamePayload ? nullableText(values.deanMessage) : null,
        videoTitle: videoUrlPayload ? nullableText(values.videoTitle) : null,
        videoDesc: nullableText(values.videoDesc),
      };
    };

    const payload: Record<string, unknown> = {
      deanName: deanNamePayload, deanPhotoMediaId: deanPhotoId, videoUrl: videoUrlPayload, videoPosterMediaId: videoPosterId,
      email: nullableText(contact.email),
      phone: nullableText(contact.phone),
      facebookUrl: nullableText(contact.facebookUrl),
      instagramUrl: nullableText(contact.instagramUrl),
      youtubeUrl: nullableText(contact.youtubeUrl),
      xUrl: nullableText(contact.xUrl),
      logoMediaId: logoId,
      accreditationLogoMediaId: accreditationLogoId,
      bluLogoMediaId: bluLogoId,
      faviconMediaId: (initialData.faviconMediaId as string | null | undefined) ?? null,
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

      <FieldSet>
        <FieldLegend>{t("settings.identity")}</FieldLegend>
        <FieldGroup>
          <HomeMediaPicker
            value={logoId}
            onChange={setLogoId}
            initialMedia={initialLogo}
            uploadPublicUrl={uploadPublicUrl}
            label={t("settings.logo")}
            description={t("settings.logoDescription")}
            chooseLabel={t("picker.choose")}
            changeLabel={t("picker.change")}
            clearLabel={t("picker.clear")}
            selectedLabel={t("picker.selected")}
            noneLabel={t("picker.none")}
            loadingLabel={t("picker.loading")}
            loadErrorLabel={t("picker.loadError")}
            emptyLabel={t("picker.empty")}
            listLabel={t("picker.listLabel")}
            loadMoreLabel={t("picker.loadMore")}
          />
          <HomeMediaPicker
            value={accreditationLogoId}
            onChange={setAccreditationLogoId}
            initialMedia={initialAccreditationLogo}
            uploadPublicUrl={uploadPublicUrl}
            label={t("settings.accreditationLogo")}
            description={t("settings.accreditationLogoDescription")}
            chooseLabel={t("picker.choose")}
            changeLabel={t("picker.change")}
            clearLabel={t("picker.clear")}
            selectedLabel={t("picker.selected")}
            noneLabel={t("picker.none")}
            loadingLabel={t("picker.loading")}
            loadErrorLabel={t("picker.loadError")}
            emptyLabel={t("picker.empty")}
            listLabel={t("picker.listLabel")}
            loadMoreLabel={t("picker.loadMore")}
          />
          <HomeMediaPicker
            value={bluLogoId}
            onChange={setBluLogoId}
            initialMedia={initialBluLogo}
            uploadPublicUrl={uploadPublicUrl}
            label={t("settings.bluLogo")}
            description={t("settings.bluLogoDescription")}
            chooseLabel={t("picker.choose")}
            changeLabel={t("picker.change")}
            clearLabel={t("picker.clear")}
            selectedLabel={t("picker.selected")}
            noneLabel={t("picker.none")}
            loadingLabel={t("picker.loading")}
            loadErrorLabel={t("picker.loadError")}
            emptyLabel={t("picker.empty")}
            listLabel={t("picker.listLabel")}
            loadMoreLabel={t("picker.loadMore")}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("settings.contact")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-email`}>{t("settings.email")}</FieldLabel>
            <Input id={`${formId}-email`} name="email" type="email" value={contact.email} onChange={updateContact("email")} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-phone`}>{t("settings.phone")}</FieldLabel>
            <Input id={`${formId}-phone`} name="phone" value={contact.phone} onChange={updateContact("phone")} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-facebook`}>Facebook</FieldLabel>
            <Input id={`${formId}-facebook`} name="facebookUrl" value={contact.facebookUrl} onChange={updateContact("facebookUrl")} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-instagram`}>Instagram</FieldLabel>
            <Input id={`${formId}-instagram`} name="instagramUrl" value={contact.instagramUrl} onChange={updateContact("instagramUrl")} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-youtube`}>YouTube</FieldLabel>
            <Input id={`${formId}-youtube`} name="youtubeUrl" value={contact.youtubeUrl} onChange={updateContact("youtubeUrl")} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${formId}-x`}>X</FieldLabel>
            <Input id={`${formId}-x`} name="xUrl" value={contact.xUrl} onChange={updateContact("xUrl")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("settings.dean")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-dean-name`}>{t("settings.deanName")}</FieldLabel>
            <Input id={`${formId}-dean-name`} name="deanName" value={deanName} onChange={(event) => setDeanName(event.target.value)} />
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
            loadMoreLabel={t("picker.loadMore")}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("settings.video")}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-video-url`}>{t("settings.videoUrl")}</FieldLabel>
            <Input id={`${formId}-video-url`} name="videoUrl" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." />
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
            loadMoreLabel={t("picker.loadMore")}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("translations")}</FieldLegend>
        <div role="tablist" aria-label={t("localeTabs")} className="flex gap-1">{localeTabs}</div>
        <FieldGroup key={locale}>
          {locale === "id" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-faculty`}>{t("settings.facultyName")} (ID) *</FieldLabel>
                <Input id={`${formId}-id-faculty`} name="id.facultyName" value={idTr.facultyName} onChange={updateTranslation("id", "facultyName")} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-tagline`}>{t("settings.tagline")} (ID)</FieldLabel>
                <Input id={`${formId}-id-tagline`} name="id.tagline" value={idTr.tagline} onChange={updateTranslation("id", "tagline")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-address1`}>{t("settings.address1")} (ID)</FieldLabel>
                <Textarea id={`${formId}-id-address1`} name="id.address1" value={idTr.address1} onChange={updateTranslation("id", "address1")} rows={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-dean-position`}>{t("settings.deanPosition")} (ID)</FieldLabel>
                <Input id={`${formId}-id-dean-position`} name="id.deanPosition" value={idTr.deanPosition} onChange={updateTranslation("id", "deanPosition")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-dean-message`}>{t("settings.deanMessage")} (ID)</FieldLabel>
                <Textarea id={`${formId}-id-dean-message`} name="id.deanMessage" value={idTr.deanMessage} onChange={updateTranslation("id", "deanMessage")} rows={6} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-video-title`}>{t("settings.videoTitle")} (ID)</FieldLabel>
                <Input id={`${formId}-id-video-title`} name="id.videoTitle" value={idTr.videoTitle} onChange={updateTranslation("id", "videoTitle")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-id-video-desc`}>{t("settings.videoDesc")} (ID)</FieldLabel>
                <Textarea id={`${formId}-id-video-desc`} name="id.videoDesc" value={idTr.videoDesc} onChange={updateTranslation("id", "videoDesc")} rows={3} />
              </Field>
            </>
          )}
          {locale === "en" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-faculty`}>{t("settings.facultyName")} (EN)</FieldLabel>
                <Input id={`${formId}-en-faculty`} name="en.facultyName" value={enTr.facultyName} onChange={updateTranslation("en", "facultyName")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-tagline`}>{t("settings.tagline")} (EN)</FieldLabel>
                <Input id={`${formId}-en-tagline`} name="en.tagline" value={enTr.tagline} onChange={updateTranslation("en", "tagline")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-dean-position`}>{t("settings.deanPosition")} (EN)</FieldLabel>
                <Input id={`${formId}-en-dean-position`} name="en.deanPosition" value={enTr.deanPosition} onChange={updateTranslation("en", "deanPosition")} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-dean-message`}>{t("settings.deanMessage")} (EN)</FieldLabel>
                <Textarea id={`${formId}-en-dean-message`} name="en.deanMessage" value={enTr.deanMessage} onChange={updateTranslation("en", "deanMessage")} rows={6} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-en-video-title`}>{t("settings.videoTitle")} (EN)</FieldLabel>
                <Input id={`${formId}-en-video-title`} name="en.videoTitle" value={enTr.videoTitle} onChange={updateTranslation("en", "videoTitle")} />
              </Field>
            </>
          )}
          {locale === "ar" && (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-faculty`}>{t("settings.facultyName")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-faculty`} name="ar.facultyName" value={arTr.facultyName} onChange={updateTranslation("ar", "facultyName")} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-tagline`}>{t("settings.tagline")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-tagline`} name="ar.tagline" value={arTr.tagline} onChange={updateTranslation("ar", "tagline")} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-dean-position`}>{t("settings.deanPosition")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-dean-position`} name="ar.deanPosition" value={arTr.deanPosition} onChange={updateTranslation("ar", "deanPosition")} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-dean-message`}>{t("settings.deanMessage")} (AR)</FieldLabel>
                <Textarea id={`${formId}-ar-dean-message`} name="ar.deanMessage" value={arTr.deanMessage} onChange={updateTranslation("ar", "deanMessage")} rows={6} dir="rtl" />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ar-video-title`}>{t("settings.videoTitle")} (AR)</FieldLabel>
                <Input id={`${formId}-ar-video-title`} name="ar.videoTitle" value={arTr.videoTitle} onChange={updateTranslation("ar", "videoTitle")} dir="rtl" />
              </Field>
            </>
          )}
        </FieldGroup>
      </FieldSet>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner className="mr-1" />}
          {t("updateAction")}
        </Button>
      </div>
    </form>
  );
}
