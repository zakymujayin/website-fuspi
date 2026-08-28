import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";

import { AdminPostFilterTabs } from "@/components/admin/posts/post-filter-tabs";
import { AdminPostList } from "@/components/admin/posts/post-list";
import { AdminPostPagination } from "@/components/admin/posts/post-pagination";
import {
  ADMIN_POST_SEARCH_MAX_LENGTH,
  buildAdminPostHref,
  normalizeAdminPostQuery,
  toAdminPostTransportQuery,
  totalPagesFor,
} from "@/components/admin/posts/post-query";
import { loadAdminPostsSafely } from "@/components/admin/posts/post-safe-load";
import { AdminPostStateNotice } from "@/components/admin/posts/post-state-notice";
import type { AdminPostPublicationState } from "@/components/admin/posts/post-status-badge";
import { AdminListSearch } from "@/components/admin/shared/admin-list-search";
import { AdminPageSizeSelect } from "@/components/admin/shared/admin-page-size-select";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { listAdminPosts } from "@/lib/content/post-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

const BASE_PATH = "/admin/posts";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-posts-title" className="section-rule font-display text-2xl text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      {result.ok ? (
        <>
          <AdminPostFilterTabs
            active={query.status}
            ariaLabel={t("filterAriaLabel")}
            basePath={BASE_PATH}
            search={query.search}
            pageSize={query.pageSize}
            labels={{
              ALL: t("status.all"),
              DRAFT: t("status.draft"),
              PUBLISHED: t("status.published"),
              ARCHIVED: t("status.archived"),
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AdminListSearch
              initialSearch={query.search}
              maxLength={ADMIN_POST_SEARCH_MAX_LENGTH}
              buildHref={(search) =>
                buildAdminPostHref(query.status, 1, BASE_PATH, { search, pageSize: query.pageSize })
              }
              labels={{
                placeholder: t("searchPlaceholder"),
                ariaLabel: t("searchAriaLabel"),
                action: t("searchAction"),
                clear: t("searchClear"),
              }}
            />
            <AdminPageSizeSelect
              value={query.pageSize}
              label={t("pageSizeLabel")}
              optionLabel={(n) => String(n)}
              buildHref={(size) =>
                buildAdminPostHref(query.status, 1, BASE_PATH, { search: query.search, pageSize: size })
              }
            />
          </div>

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
                edit: t("edit"),
                editLabelFor: (title: string) => t("editLabelFor", { title }),
                columns: {
                  title: t("columns.title"),
                  category: t("columns.category"),
                  author: t("columns.author"),
                  locales: t("columns.locales"),
                  status: t("columns.status"),
                  published: t("columns.published"),
                  actions: t("columns.actions"),
                },
              }}
            />
          ) : query.search !== "" ? (
            <AdminPostStateNotice
              variant="empty"
              title={t("searchEmpty.title")}
              description={t("searchEmpty.description")}
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
            basePath={BASE_PATH}
            search={query.search}
            pageSize={query.pageSize}
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
