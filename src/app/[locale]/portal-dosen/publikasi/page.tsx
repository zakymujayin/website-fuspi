import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {PublicationManager, type PublicationLabels} from "@/components/portal/publication-manager";
import {loadLecturerPortalProfile} from "@/features/lecturer-portal/domain";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const PUBLICATION_TYPES = ["JURNAL", "BUKU", "BAB_BUKU", "PROSIDING", "ARTIKEL", "LAINNYA"] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "LecturerPortal"});
  return {title: t("publicationTitle"), robots: {index: false, follow: false}};
}

export default async function PortalPublicationPage({params}: {params: Promise<{locale: string}>}) {
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
  const tProfile = await getTranslations("LecturerProfile");

  const labels = {
    title: t("fieldTitle"),
    type: t("fieldType"),
    year: t("fieldYear"),
    publisher: t("fieldPublisher"),
    url: t("fieldUrl"),
    doi: t("fieldDoi"),
    save: t("save"),
    saving: t("saving"),
    add: t("add"),
    adding: t("adding"),
    remove: t("remove"),
    removing: t("removing"),
    addTitle: t("publicationAddTitle"),
    empty: t("publicationEmpty"),
    saved: t("saved"),
    errorValidation: t("errorValidation"),
    errorSession: t("errorSession"),
    errorUnavailable: t("errorUnavailable"),
  } satisfies PublicationLabels;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("publicationTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("publicationDescription")}</p>
      <div className="mt-8 max-w-3xl">
        <PublicationManager
          labels={labels}
          types={PUBLICATION_TYPES.map((value) => ({
            value,
            label: tProfile(`type${value}` as "typeJURNAL"),
          }))}
          items={profile.data.publications.map((row) => ({
            id: row.id,
            title: row.title,
            type: row.type,
            year: row.year === null ? "" : String(row.year),
            publisher: row.publisher ?? "",
            url: row.url ?? "",
            doi: row.doi ?? "",
          }))}
        />
      </div>
    </div>
  );
}
