import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {EducationManager, type EducationLabels} from "@/components/portal/education-manager";
import {loadLecturerPortalProfile} from "@/features/lecturer-portal/domain";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "LecturerPortal"});
  return {title: t("educationTitle"), robots: {index: false, follow: false}};
}

export default async function PortalEducationPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const profile = await loadLecturerPortalProfile(
    getPrismaClient(),
    session.ok ? session.session : null,
  );
  if (!profile.ok) redirect(`/${appLocale}`);

  const t = await getTranslations("LecturerPortal");

  const labels = {
    degree: t("fieldDegree"),
    field: t("fieldField"),
    institution: t("fieldInstitution"),
    city: t("fieldCity"),
    year: t("fieldYear"),
    save: t("save"),
    saving: t("saving"),
    add: t("add"),
    adding: t("adding"),
    remove: t("remove"),
    removing: t("removing"),
    addTitle: t("educationAddTitle"),
    empty: t("educationEmpty"),
    saved: t("saved"),
    errorValidation: t("errorValidation"),
    errorSession: t("errorSession"),
    errorUnavailable: t("errorUnavailable"),
  } satisfies EducationLabels;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("educationTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("educationDescription")}</p>
      <div className="mt-8 max-w-3xl">
        <EducationManager
          labels={labels}
          items={profile.data.educations.map((row) => ({
            id: row.id,
            degree: row.degree,
            field: row.field ?? "",
            institution: row.institution,
            city: row.city ?? "",
            year: row.year === null ? "" : String(row.year),
          }))}
        />
      </div>
    </div>
  );
}
