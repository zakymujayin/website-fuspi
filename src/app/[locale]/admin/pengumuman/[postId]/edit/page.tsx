import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PostEditorShell } from "@/components/admin/posts/post-editor-shell";
import { draftFromEditorView } from "@/components/admin/posts/post-editor-view";
import { AdminPostStateNotice } from "@/components/admin/posts/post-state-notice";
import { loadAdminPostsSafely } from "@/components/admin/posts/post-safe-load";
import { loadPostTaxonomyOptions } from "@/components/admin/taxonomy/taxonomy-options";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getAdminPostEditor } from "@/lib/content/post-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

type EditAnnouncementPageProps = {
  params: Promise<{ locale: string; postId: string }>;
};

export async function generateMetadata({ params }: EditAnnouncementPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminAnnouncementEditor" });
  return { title: t("editMetaTitle"), robots: { index: false, follow: false } };
}

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const { locale, postId } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin/pengumuman/${postId}/edit`,
  );
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminAnnouncementEditor");
  const prisma = getPrismaClient();
  const uploadPublicUrl = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";

  const result = await loadAdminPostsSafely(() =>
    getAdminPostEditor(
      prisma,
      session.ok ? session.session : null,
      postId,
      uploadPublicUrl,
      "PENGUMUMAN",
    ),
  );

  if (!result.ok) {
    return (
      <section aria-labelledby="admin-announcement-edit-title" className="flex flex-col gap-6">
        <div>
          <h1 id="admin-announcement-edit-title" className="section-rule font-display text-2xl text-slate-900">
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
  const taxonomyOptions = await loadPostTaxonomyOptions(
    prisma,
    session.ok ? session.session : null,
  );

  return (
    <section aria-labelledby="admin-announcement-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-announcement-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("editTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("editDescription")}</p>
      </div>

      <PostEditorShell
        postId={view.id}
        postType="PENGUMUMAN"
        initialVersion={view.version}
        initialDraft={draftFromEditorView(view)}
        taxonomyOptions={taxonomyOptions}
        initialCover={view.cover}
        initialGalleryPreviews={Object.fromEntries(view.images.map((image) => [image.media.id, image.media]))}
        uploadPublicUrl={uploadPublicUrl}
        listHref="/admin/pengumuman"
        publicationState={view.publicationState}
        capabilities={{
          publish: view.capabilities.publish,
          delete: view.capabilities.delete,
        }}
      />
    </section>
  );
}
