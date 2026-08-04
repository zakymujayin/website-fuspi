import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { DocumentEditorForm } from "@/components/admin/public-content/document-editor-form";
import { getPublicContentAdminDetailAction } from "@/components/admin/public-content/public-content-server-actions";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("DOCUMENT.metaTitle"), robots: { index: false, follow: false } };
}

export default async function EditDocumentPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/dokumen/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const result = await getPublicContentAdminDetailAction({ resource: "DOCUMENT", id });
  if (!result.ok) notFound();

  const t = await getTranslations("AdminPublicContent");

  return (
    <section aria-labelledby="admin-document-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-document-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("DOCUMENT.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("DOCUMENT.editDescription")}</p>
      </div>

      <DocumentEditorForm
        mode="edit"
        listHref="/admin/dokumen"
        initialData={result.data.input as Record<string, unknown>}
        pageId={result.data.id as string}
        expectedVersion={result.data.version as number | undefined}
      />
    </section>
  );
}
