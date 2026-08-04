import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AlbumEditorForm } from "@/components/admin/public-content/album-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("ALBUM.metaTitle"), robots: { index: false, follow: false } };
}

export default async function NewAlbumPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/album/baru`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPublicContent");

  return (
    <section aria-labelledby="admin-album-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-album-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("ALBUM.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("ALBUM.createDescription")}</p>
      </div>

      <AlbumEditorForm mode="create" listHref="/admin/album" />
    </section>
  );
}
