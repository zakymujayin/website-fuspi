import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ColumnEditorForm } from "@/components/admin/posts/column-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type NewColumnPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: NewColumnPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminColumnEditor" });
  return { title: t("createMetaTitle"), robots: { index: false, follow: false } };
}

export default async function NewColumnPage({ params }: NewColumnPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/kolom/baru`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminColumnEditor");

  return (
    <section aria-labelledby="admin-column-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-column-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("createTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("createDescription")}</p>
      </div>

      <ColumnEditorForm
        mode="create"
        listHref="/admin/kolom"
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
      />
    </section>
  );
}
