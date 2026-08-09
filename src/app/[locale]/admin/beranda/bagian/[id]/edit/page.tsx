import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { HomeSectionEditorForm } from "@/components/admin/home-nav/home-section-editor-form";
import { getHomeNavAdminDetail } from "@/features/home-nav/admin-detail";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHomeNav" });
  return { title: t("section.editTitle"), robots: { index: false, follow: false } };
}

export default async function EditHomeSectionPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/bagian/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");
  const result = await getHomeNavAdminDetail(getPrismaClient(), session.ok ? session.session : null, "HOME_SECTION", id);

  if (!result.ok) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="section-rule font-display text-2xl text-slate-900">{t("section.editTitle")}</h1>
        <p role="alert" className="text-sm text-destructive">{t("unavailable.description")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="section-rule font-display text-2xl text-slate-900">{t("section.editTitle")}</h1>
      <HomeSectionEditorForm
        listHref="/admin/beranda/bagian"
        pageId={id}
        initialData={result.data.input}
        initialBackground={result.data.media}
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
      />
    </section>
  );
}
