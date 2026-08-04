import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AchievementEditorForm } from "@/components/admin/public-content/achievement-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("ACHIEVEMENT.metaTitle"), robots: { index: false, follow: false } };
}

export default async function NewAchievementPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/prestasi/baru`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPublicContent");

  return (
    <section aria-labelledby="admin-achievement-create-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-achievement-create-title" className="section-rule font-display text-2xl text-slate-900">
          {t("ACHIEVEMENT.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("ACHIEVEMENT.createDescription")}</p>
      </div>
      <AchievementEditorForm mode="create" listHref="/admin/prestasi" />
    </section>
  );
}
