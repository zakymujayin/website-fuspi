import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ColumnEditorForm } from "@/components/admin/posts/column-editor-form";
import { draftFromColumnEditorView } from "@/components/admin/posts/column-editor-view";
import { AdminPostStateNotice } from "@/components/admin/posts/post-state-notice";
import { loadAdminPostsSafely } from "@/components/admin/posts/post-safe-load";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getAdminPostEditor } from "@/lib/content/post-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

type EditColumnPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: EditColumnPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminColumnEditor" });
  return { title: t("editMetaTitle"), robots: { index: false, follow: false } };
}

/**
 * `getAdminPostEditor` still filters `type: "BERITA"` (see the task handoff), so this honestly
 * returns the existing "unavailable" notice for every real Kolom post today — the same UX this
 * codebase already uses for "not found or not yours". Once the admin transport contract accepts
 * KOLOM, this page starts loading real drafts with no further changes: `draftFromColumnEditorView`
 * and `ColumnEditorForm` are already wired for it.
 */
export default async function EditColumnPage({ params }: EditColumnPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin/kolom/${id}/edit`,
  );
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminColumnEditor");
  const prisma = getPrismaClient();

  const result = await loadAdminPostsSafely(() =>
    getAdminPostEditor(
      prisma,
      session.ok ? session.session : null,
      id,
      process.env.UPLOAD_PUBLIC_URL ?? "",
    ),
  );

  if (!result.ok) {
    return (
      <section aria-labelledby="admin-column-edit-title" className="flex flex-col gap-6">
        <div>
          <h1
            id="admin-column-edit-title"
            className="section-rule font-display text-2xl text-slate-900"
          >
            {t("editTitle")}
          </h1>
        </div>
        <AdminPostStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </section>
    );
  }

  const view = result.data;

  return (
    <section aria-labelledby="admin-column-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-column-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("editTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("editDescription")}</p>
      </div>

      <ColumnEditorForm
        mode="edit"
        listHref="/admin/kolom"
        initialDraft={draftFromColumnEditorView(view)}
        postId={view.id}
        expectedVersion={view.version}
        initialCover={view.cover}
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
      />
    </section>
  );
}
