import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PageEditorShell } from "@/components/admin/pages/page-editor-shell";
import { draftFromEditorView } from "@/components/admin/pages/page-editor-view";
import { loadAdminPagesSafely } from "@/components/admin/pages/page-safe-load";
import { AdminPageStateNotice } from "@/components/admin/pages/page-state-notice";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getAdminPageEditor } from "@/features/content/pages/admin-transport";
import { getPrismaClient } from "@/lib/db/client";


type EditPagePageProps = {
  params: Promise<{ locale: string; pageId: string }>;
};

export async function generateMetadata({ params }: EditPagePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPageEditor" });
  return { title: t("editMetaTitle"), robots: { index: false, follow: false } };
}

export default async function EditPagePage({ params }: EditPagePageProps) {
  const { locale, pageId } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin/pages/${pageId}/edit`,
  );
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPageEditor");

  const result = await loadAdminPagesSafely(() =>
    getAdminPageEditor(
      getPrismaClient(),
      session.ok ? session.session : null,
      pageId,
      process.env.UPLOAD_PUBLIC_URL ?? "",
    ),
  );

  if (!result.ok) {
    return (
      <section aria-labelledby="admin-page-edit-title" className="flex flex-col gap-6">
        <div>
          <h1
            id="admin-page-edit-title"
            className="section-rule font-display text-2xl text-slate-900"
          >
            {t("editTitle")}
          </h1>
        </div>
        <AdminPageStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </section>
    );
  }

  const view = result.data;

  return (
    <section aria-labelledby="admin-page-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-page-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("editTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("editDescription")}</p>
      </div>

      <PageEditorShell
        pageId={view.id}
        initialVersion={view.version}
        initialDraft={draftFromEditorView(view)}
        initialHero={view.hero}
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
        listHref="/admin/pages"
        publicationState={view.status}
        capabilities={{ publish: true, delete: true }}
      />
    </section>
  );
}
