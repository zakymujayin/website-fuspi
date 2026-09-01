import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {ProfileForm, type ProfileFormLabels} from "@/components/portal/profile-form";
import {loadLecturerPortalProfile} from "@/features/lecturer-portal/domain";
import {StorageKeySchema} from "@/contracts/storage";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

function uploadRoot(raw: string) {
  return raw.replace(/\/+$/u, "") || "/uploads";
}

function publicMediaUrl(storageKey: string | null | undefined) {
  const parsed = StorageKeySchema.safeParse(storageKey);
  return parsed.success
    ? `${uploadRoot(process.env.UPLOAD_PUBLIC_URL ?? "/uploads")}/${parsed.data}`
    : "";
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "LecturerPortal"});
  return {title: t("profileTitle"), robots: {index: false, follow: false}};
}

export default async function PortalProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  /* The layout already guards, but authorization belongs in every loader: a
     layout is chrome, not a permission boundary. */
  const session = await getRequestSession();
  const profile = await loadLecturerPortalProfile(
    getPrismaClient(),
    session.ok ? session.session : null,
  );
  if (!profile.ok) redirect(`/${appLocale}`);

  const t = await getTranslations("LecturerPortal");
  const translation = profile.data.translations[0];

  const labels = {
    position: t("fieldPosition"),
    expertise: t("fieldExpertise"),
    bio: t("fieldBio"),
    quote: t("fieldQuote"),
    officeHours: t("fieldOfficeHours"),
    officeLocation: t("fieldOfficeLocation"),
    phone: t("fieldPhone"),
    googleScholarUrl: "Google Scholar",
    sintaUrl: "SINTA",
    scopusUrl: "Scopus",
    linkedinUrl: "LinkedIn",
    instagramUrl: "Instagram",
    twitterUrl: "X",
    identitySection: t("sectionIdentity"),
    contactSection: t("sectionContact"),
    linksSection: t("sectionLinks"),
    mediaSection: t("sectionMedia"),
    photoLabel: t("fieldPhoto"),
    photoHint: t("hintPhoto"),
    photoEmpty: t("emptyPhoto"),
    photoChoose: t("choosePhoto"),
    photoUploading: t("uploadingPhoto"),
    photoReady: t("readyPhoto"),
    cvLabel: t("fieldCv"),
    cvHint: t("hintCv"),
    cvEmpty: t("emptyCv"),
    cvChoose: t("chooseCv"),
    cvUploading: t("uploadingCv"),
    cvReady: t("readyCv"),
    clearMedia: t("clearMedia"),
    uploadErrorValidation: t("uploadErrorValidation"),
    uploadErrorSession: t("uploadErrorSession"),
    uploadErrorUnavailable: t("uploadErrorUnavailable"),
    bioHint: t("hintBio"),
    quoteHint: t("hintQuote"),
    urlHint: t("hintUrl"),
    save: t("save"),
    saving: t("saving"),
    saved: t("saved"),
    errorValidation: t("errorValidation"),
    errorSession: t("errorSession"),
    errorUnavailable: t("errorUnavailable"),
  } satisfies ProfileFormLabels;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("profileTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("profileDescription")}</p>
      <div className="mt-8">
        <ProfileForm
          labels={labels}
          values={{
            position: translation?.position ?? "",
            expertise: translation?.expertise ?? "",
            bio: translation?.bio ?? "",
            quote: translation?.quote ?? "",
            officeHours: translation?.officeHours ?? "",
            officeLocation: translation?.officeLocation ?? "",
            phone: profile.data.phone ?? "",
            googleScholarUrl: profile.data.googleScholarUrl ?? "",
            sintaUrl: profile.data.sintaUrl ?? "",
            scopusUrl: profile.data.scopusUrl ?? "",
            linkedinUrl: profile.data.linkedinUrl ?? "",
            instagramUrl: profile.data.instagramUrl ?? "",
            twitterUrl: profile.data.twitterUrl ?? "",
            photoMediaId: profile.data.photoMediaId ?? "",
            photoUrl: publicMediaUrl(profile.data.photoMedia?.storageKey),
            photoAlt: profile.data.photoMedia?.alt ?? t("fieldPhoto"),
            cvMediaId: profile.data.cvMediaId ?? "",
            cvUrl: publicMediaUrl(profile.data.cvMedia?.storageKey),
            cvName: profile.data.cvMedia?.originalName ?? "",
          }}
        />
      </div>
    </div>
  );
}
