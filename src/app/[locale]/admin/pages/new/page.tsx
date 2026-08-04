import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PageEditorForm } from "@/components/admin/pages/page-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type NewPagePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: NewPagePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPageEditor" });
  return { title: t("createMetaTitle"), robots: { index: false, follow: false } };
}

export default async function NewPagePage({ params }: NewPagePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/pages/new`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPageEditor");

  return (
    <section aria-labelledby="admin-page-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-page-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("createTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("createDescription")}</p>
      </div>

      <PageEditorForm
        mode="create"
        listHref="/admin/pages"
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
      />
    </section>
  );
}
