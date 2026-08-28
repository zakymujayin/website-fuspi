import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PostEditorForm } from "@/components/admin/posts/post-editor-form";
import { loadPostTaxonomyOptions } from "@/components/admin/taxonomy/taxonomy-options";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getPrismaClient } from "@/lib/db/client";

type NewAnnouncementPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: NewAnnouncementPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminAnnouncementEditor" });
  return { title: t("createMetaTitle"), robots: { index: false, follow: false } };
}

export default async function NewAnnouncementPage({ params }: NewAnnouncementPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/pengumuman/new`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminAnnouncementEditor");
  const prisma = getPrismaClient();
  const uploadPublicUrl = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";
  const taxonomyOptions = await loadPostTaxonomyOptions(
    prisma,
    session.ok ? session.session : null,
  );

  return (
    <section aria-labelledby="admin-announcement-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-announcement-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("createTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("createDescription")}</p>
      </div>

      <PostEditorForm
        mode="create"
        postType="PENGUMUMAN"
        listHref="/admin/pengumuman"
        taxonomyOptions={taxonomyOptions}
        uploadPublicUrl={uploadPublicUrl}
      />
    </section>
  );
}
