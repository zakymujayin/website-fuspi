import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PostEditorShell } from "@/components/admin/posts/post-editor-shell";
import { draftFromEditorView } from "@/components/admin/posts/post-editor-view";
import { AdminPostStateNotice } from "@/components/admin/posts/post-state-notice";
import { loadAdminPostsSafely } from "@/components/admin/posts/post-safe-load";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getAdminPostEditor } from "@/lib/content/post-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

type EditPostPageProps = {
  params: Promise<{ locale: string; postId: string }>;
};

export async function generateMetadata({ params }: EditPostPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPostEditor" });
  return { title: t("editMetaTitle"), robots: { index: false, follow: false } };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { locale, postId } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin/posts/${postId}/edit`,
  );
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPostEditor");

  const result = await loadAdminPostsSafely(() =>
    getAdminPostEditor(
      getPrismaClient(),
      session.ok ? session.session : null,
      postId,
      process.env.UPLOAD_PUBLIC_URL ?? "",
    ),
  );

  // A post the actor may not reach returns NOT_FOUND from the transport; the UI must not
  // distinguish "missing" from "not yours", so both render the same notice.
  if (!result.ok) {
    return (
      <section aria-labelledby="admin-post-edit-title" className="flex flex-col gap-6">
        <div>
          <h1
            id="admin-post-edit-title"
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
    <section aria-labelledby="admin-post-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-post-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("editTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("editDescription")}</p>
      </div>

      <PostEditorShell
        postId={view.id}
        initialVersion={view.version}
        initialDraft={draftFromEditorView(view)}
        carried={{
          categoryId: view.categoryId,
          tagIds: view.tagIds,
        }}
        initialCover={view.cover}
        uploadPublicUrl={process.env.UPLOAD_PUBLIC_URL ?? ""}
        listHref="/admin/posts"
        publicationState={view.publicationState}
        capabilities={{
          publish: view.capabilities.publish,
          delete: view.capabilities.delete,
        }}
      />
    </section>
  );
}
