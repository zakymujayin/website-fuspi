import { getTranslations } from "next-intl/server";

import { AdminMediaGridSkeleton } from "@/components/admin/media/media-grid-skeleton";

export default async function AdminMediaLoading() {
  const t = await getTranslations("AdminMediaLibrary");

  return (
    <section aria-labelledby="admin-media-loading-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-media-loading-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>
      <AdminMediaGridSkeleton loadingLabel={t("loading")} />
    </section>
  );
}
