import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { SiteSettingEditorForm } from "@/components/admin/home-nav/site-setting-editor-form";
import { getHomeNavAdminDetail } from "@/features/home-nav/admin-detail";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHomeNav" });
  return { title: t("settings.title"), robots: { index: false, follow: false } };
}

export default async function AdminSiteSettingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/pengaturan`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");
  const result = await getHomeNavAdminDetail(getPrismaClient(), session.ok ? session.session : null, "SITE_SETTING", "singleton");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="section-rule font-display text-2xl text-slate-900">{t("settings.title")}</h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("settings.description")}</p>
      </div>
      {result.ok ? (
        <SiteSettingEditorForm
          listHref="/admin/beranda/pengaturan"
          initialData={result.data.input}
          initialVersion={result.data.version ?? 1}
          initialDeanPhoto={result.data.media}
          initialVideoPoster={result.data.secondaryMedia}
          uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">{t("unavailable.description")}</p>
      )}
    </section>
  );
}
