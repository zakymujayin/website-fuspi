import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";

import { AdminPageFilterTabs } from "@/components/admin/pages/page-filter-tabs";
import { AdminPageList } from "@/components/admin/pages/page-list";
import { AdminPagePagination } from "@/components/admin/pages/page-pagination";
import { AdminPageSearch } from "@/components/admin/pages/page-search";
import { AdminPageSortTabs } from "@/components/admin/pages/page-sort-tabs";
import {
  buildAdminPageHref,
  normalizeAdminPageQuery,
  toAdminPageTransportQuery,
  totalPagesFor,
} from "@/components/admin/pages/page-query";
import { AdminPageSizeSelect } from "@/components/admin/shared/admin-page-size-select";
import { loadAdminPagesSafely } from "@/components/admin/pages/page-safe-load";
import { AdminPageStateNotice } from "@/components/admin/pages/page-state-notice";
import type { AdminPagePublicationState } from "@/components/admin/pages/page-status-badge";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { listAdminPages } from "@/features/content/pages/admin-transport";
import { getPrismaClient } from "@/lib/db/client";


type AdminPagesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: AdminPagesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPageList" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPagesPage({ params, searchParams }: AdminPagesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/pages`);
  if (!decision.allow) redirect(decision.redirectTo);

  const rawSearchParams = await searchParams;
  const query = normalizeAdminPageQuery(rawSearchParams);

  const t = await getTranslations("AdminPageList");

  const result = await loadAdminPagesSafely(() =>
    listAdminPages(
      getPrismaClient(),
      session.ok ? session.session : null,
      toAdminPageTransportQuery(query),
    ),
  );

  return (
    <section aria-labelledby="admin-pages-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-pages-title" className="section-rule font-display text-2xl text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
        </div>
        <Link
          href="/admin/pages/new"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      {result.ok ? (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <AdminPageFilterTabs
              active={query.status}
              ariaLabel={t("filterAriaLabel")}
              labels={{
                ALL: t("status.all"),
                DRAFT: t("status.draft"),
                PUBLISHED: t("status.published"),
                ARCHIVED: t("status.archived"),
              }}
              search={query.search}
              sort={query.sort}
              pageSize={query.pageSize}
            />
            <AdminPageSortTabs
              active={query.sort}
              ariaLabel={t("sortAriaLabel")}
              labels={{
                UPDATED_DESC: t("sort.updatedDesc"),
                TITLE_ASC: t("sort.titleAsc"),
              }}
              status={query.status}
              search={query.search}
              pageSize={query.pageSize}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <AdminPageSearch
              initialSearch={query.search}
              status={query.status}
              sort={query.sort}
            />
            <AdminPageSizeSelect
              value={query.pageSize}
              label={t("pageSizeLabel")}
              optionLabel={String}
              buildHref={(size) =>
                buildAdminPageHref({
                  status: query.status,
                  search: query.search,
                  sort: query.sort,
                  page: 1,
                  pageSize: size,
                })
              }
            />
          </div>

          <p className="text-sm text-slate-500">{t("totalCount", { count: result.data.total })}</p>

          {result.data.items.length > 0 ? (
            <AdminPageList
              items={result.data.items}
              locale={appLocale}
              ariaLabel={t("listAriaLabel")}
              labels={{
                stateLabel: (state: AdminPagePublicationState) => t(`state.${state}`),
                localesLabel: (locales: string) => t("localesLabel", { locales }),
                parentLabel: (title: string) => t("parentLabel", { title }),
                childIndicator: t("childIndicator"),
                orderLabel: (order: string) => t("orderLabel", { order }),
                updatedAtLabel: (instant: string) => t("updatedAtLabel", { instant }),
                edit: t("edit"),
                editLabelFor: (title: string) => t("editLabelFor", { title }),
              }}
            />
          ) : (
            <AdminPageStateNotice
              variant="empty"
              title={t("empty.title")}
              description={t("empty.description")}
            />
          )}

          <AdminPagePagination
            current={result.data.page}
            totalPages={totalPagesFor(result.data.total, result.data.pageSize)}
            query={{ status: query.status, search: query.search, sort: query.sort, pageSize: query.pageSize }}
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
        <AdminPageStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      )}
    </section>
  );
}
