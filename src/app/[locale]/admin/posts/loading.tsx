import { getTranslations } from "next-intl/server";

import { AdminPostListSkeleton } from "@/components/admin/posts/post-list-skeleton";

export default async function AdminPostsLoading() {
  const t = await getTranslations("AdminPostList");

  return (
    <section aria-labelledby="admin-posts-loading-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-posts-loading-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>
      <AdminPostListSkeleton loadingLabel={t("loading")} />
    </section>
  );
}
