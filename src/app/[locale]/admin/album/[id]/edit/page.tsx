import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AlbumEditorForm } from "@/components/admin/public-content/album-editor-form";
import { getPublicContentAdminDetailAction } from "@/components/admin/public-content/public-content-server-actions";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("ALBUM.metaTitle"), robots: { index: false, follow: false } };
}

export default async function EditAlbumPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/album/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);

  const result = await getPublicContentAdminDetailAction({ resource: "ALBUM", id });
  if (!result.ok) notFound();

  const t = await getTranslations("AdminPublicContent");

  return (
    <section aria-labelledby="admin-album-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-album-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("ALBUM.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("ALBUM.editDescription")}</p>
      </div>

      <AlbumEditorForm
        mode="edit"
        listHref="/admin/album"
        initialData={result.data.input as Record<string, unknown>}
        pageId={result.data.id as string}
        expectedVersion={result.data.version as number | undefined}
      />
    </section>
  );
}
