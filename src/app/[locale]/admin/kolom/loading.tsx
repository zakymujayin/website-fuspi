import { getTranslations } from "next-intl/server";

import { AdminPostListSkeleton } from "@/components/admin/posts/post-list-skeleton";

export default async function AdminColumnsLoading() {
  const t = await getTranslations("AdminColumnList");

  return (
    <section aria-labelledby="admin-columns-loading-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-columns-loading-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
      </div>
      <AdminPostListSkeleton loadingLabel={t("loading")} />
    </section>
  );
}
