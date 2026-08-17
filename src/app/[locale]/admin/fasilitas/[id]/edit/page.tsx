import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {FacilityEditorForm} from "@/components/admin/facility/facility-editor-form";
import {getFacilityDetail} from "@/features/facility/domain";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getPrismaClient} from "@/lib/db/client";

type Props = {params: Promise<{locale: string; id: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminFacility"});
  return {title: t("editTitle"), robots: {index: false, follow: false}};
}

export default async function EditFacilityPage({params}: Props) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/fasilitas/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminFacility");
  const uploadPublicUrl = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";
  const result = await getFacilityDetail(getPrismaClient(), session.ok ? session.session : null, {id}, uploadPublicUrl);

  if (!result.ok) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="section-rule font-display text-2xl text-slate-900">{t("editTitle")}</h1>
        <p role="alert" className="text-sm text-destructive">{t("unavailable")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="section-rule font-display text-2xl text-slate-900">{t("editTitle")}</h1>
      <FacilityEditorForm
        mode="edit"
        pageId={id}
        listHref="/admin/fasilitas"
        initialData={result.data.input}
        initialVersion={result.data.version}
        initialCover={result.data.cover}
        uploadPublicUrl={uploadPublicUrl}
      />
    </section>
  );
}
