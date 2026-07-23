import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminPostFilterTabs } from "@/components/admin/posts/post-filter-tabs";
import { AdminPostList } from "@/components/admin/posts/post-list";
import { AdminPostPagination } from "@/components/admin/posts/post-pagination";
import {
  normalizeAdminPostQuery,
  toAdminPostTransportQuery,
  totalPagesFor,
} from "@/components/admin/posts/post-query";
import { loadAdminPostsSafely } from "@/components/admin/posts/post-safe-load";
import { AdminPostStateNotice } from "@/components/admin/posts/post-state-notice";
import type { AdminPostPublicationState } from "@/components/admin/posts/post-status-badge";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { listAdminPosts } from "@/lib/content/post-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

type AdminPostsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: AdminPostsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPostList" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPostsPage({ params, searchParams }: AdminPostsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/posts`);
  if (!decision.allow) redirect(decision.redirectTo);

  const rawSearchParams = await searchParams;
  const query = normalizeAdminPostQuery(rawSearchParams);

  const t = await getTranslations("AdminPostList");

  const result = await loadAdminPostsSafely(() =>
    listAdminPosts(
      getPrismaClient(),
      session.ok ? session.session : null,
      toAdminPostTransportQuery(query),
    ),
  );

  return (
    <section aria-labelledby="admin-posts-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-posts-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>

      {result.ok ? (
        <>
          <AdminPostFilterTabs
            active={query.status}
            ariaLabel={t("filterAriaLabel")}
            labels={{
              ALL: t("status.all"),
              DRAFT: t("status.draft"),
              PUBLISHED: t("status.published"),
              ARCHIVED: t("status.archived"),
            }}
          />

          <p className="text-sm text-slate-500">{t("totalCount", { count: result.data.total })}</p>

          {result.data.items.length > 0 ? (
            <AdminPostList
              items={result.data.items}
              locale={appLocale}
              ariaLabel={t("listAriaLabel")}
              labels={{
                stateLabel: (state: AdminPostPublicationState) => t(`state.${state}`),
                featured: t("featured"),
                localesLabel: (locales: string) => t("localesLabel", { locales }),
                uncategorized: t("uncategorized"),
                unknownAuthor: t("unknownAuthor"),
                byLabel: (name: string) => t("byLabel", { name }),
                publishedAtLabel: (instant: string) => t("publishedAtLabel", { instant }),
                updatedAtLabel: (instant: string) => t("updatedAtLabel", { instant }),
              }}
            />
          ) : (
            <AdminPostStateNotice
              variant="empty"
              title={t("empty.title")}
              description={t("empty.description")}
            />
          )}

          <AdminPostPagination
            current={result.data.page}
            totalPages={totalPagesFor(result.data.total, result.data.pageSize)}
            status={query.status}
            ariaLabel={t("pagination.ariaLabel")}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
            pageStatusLabel={t("pagination.pageStatus", {
              page: result.data.page,
              totalPages: totalPagesFor(result.data.total, result.data.pageSize),
            })}
            goToPageLabel={(targetPage) => t("pagination.goToPage", { page: targetPage })}
          />
        </>
      ) : (
        <AdminPostStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      )}
    </section>
  );
}
