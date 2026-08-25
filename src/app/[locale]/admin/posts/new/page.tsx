import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PostEditorForm } from "@/components/admin/posts/post-editor-form";
import { loadPostTaxonomyOptions } from "@/components/admin/taxonomy/taxonomy-options";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { getPrismaClient } from "@/lib/db/client";

type NewPostPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: NewPostPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPostEditor" });
  return { title: t("createMetaTitle"), robots: { index: false, follow: false } };
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/posts/new`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPostEditor");
  const prisma = getPrismaClient();
  const uploadPublicUrl = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";
  const taxonomyOptions = await loadPostTaxonomyOptions(
    prisma,
    session.ok ? session.session : null,
  );

  return (
    <section aria-labelledby="admin-post-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-post-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("createTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("createDescription")}</p>
      </div>

      <PostEditorForm
        mode="create"
        listHref="/admin/posts"
        taxonomyOptions={taxonomyOptions}
        uploadPublicUrl={uploadPublicUrl}
      />
    </section>
  );
}
