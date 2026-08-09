import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AchievementEditorForm } from "@/components/admin/public-content/achievement-editor-form";
import { getPublicContentAdminDetailAction } from "@/components/admin/public-content/public-content-server-actions";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("ACHIEVEMENT.metaTitle"), robots: { index: false, follow: false } };
}

export default async function EditAchievementPage({ params }: Props) {
  const { locale, id: pageId } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/prestasi/${pageId}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPublicContent");

  const result = await getPublicContentAdminDetailAction({ resource: "ACHIEVEMENT", id: pageId });

  if (!result.ok) notFound();

  const data = result.data as Record<string, unknown>;

  return (
    <section aria-labelledby="admin-achievement-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-achievement-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("ACHIEVEMENT.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("ACHIEVEMENT.editDescription")}</p>
      </div>
      <AchievementEditorForm
        mode="edit"
        listHref="/admin/prestasi"
        initialData={data}
        pageId={data.id as string}
        expectedVersion={data.version as number | undefined}
      />
    </section>
  );
}
