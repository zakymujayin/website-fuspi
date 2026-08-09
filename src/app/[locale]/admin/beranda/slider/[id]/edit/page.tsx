import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { HomeSliderEditorForm } from "@/components/admin/home-nav/home-slider-editor-form";
import { getHomeNavAdminDetail } from "@/features/home-nav/admin-detail";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHomeNav" });
  return { title: t("slider.editTitle"), robots: { index: false, follow: false } };
}

export default async function EditHomeSliderPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/slider/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");
  const result = await getHomeNavAdminDetail(getPrismaClient(), session.ok ? session.session : null, "HOME_SLIDER", id);

  if (!result.ok) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="section-rule font-display text-2xl text-slate-900">{t("slider.editTitle")}</h1>
        <p role="alert" className="text-sm text-destructive">{t("unavailable.description")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="section-rule font-display text-2xl text-slate-900">{t("slider.editTitle")}</h1>
      <HomeSliderEditorForm
        mode="edit"
        pageId={id}
        listHref="/admin/beranda/slider"
        initialData={result.data.input}
        initialImage={result.data.media}
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
      />
    </section>
  );
}
