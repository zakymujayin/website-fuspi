import { PlusIcon, PencilLineIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";

import { listPublicContentAdmin } from "@/features/public-content/admin-query";
import { getPrismaClient } from "@/lib/db/client";
import { normalizePublicContentAdminQuery, toPublicContentAdminTransportQuery } from "@/components/admin/public-content/public-content-query";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import { PublicContentPagination } from "@/components/admin/public-content/public-content-pagination";
import { PublicContentStatusBadge } from "@/components/admin/public-content/public-content-status-badge";
import type { PublicContentResource } from "@/contracts/public-content";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

const RESOURCE: PublicContentResource = "TESTIMONIAL";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("TESTIMONIAL.metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPublicContentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/testimoni`);
  if (!decision.allow) redirect(decision.redirectTo);

  const rawSearchParams = await searchParams;
  const query = normalizePublicContentAdminQuery(rawSearchParams, RESOURCE);

  const t = await getTranslations("AdminPublicContent");

  const result = await listPublicContentAdmin(getPrismaClient(), session.ok ? session.session : null, toPublicContentAdminTransportQuery(query));

  const visibilityOptions = ["ALL", "PUBLIC", "HIDDEN", "EXPIRED"] as const;

  return (
    <section aria-labelledby="admin-public-content-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-public-content-title" className="section-rule font-display text-2xl text-slate-900">
            {t("TESTIMONIAL.title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("TESTIMONIAL.description")}</p>
        </div>
        <Link
          href={`/admin/testimoni/new`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      {result.ok ? (
        <>
          <div role="tablist" aria-label={t("filterAriaLabel")} className="flex flex-wrap gap-1">
            {visibilityOptions.map((v) => {
              const isActive = query.visibility === v;
              const params = new URLSearchParams();
              params.set("visibility", v);
              if (query.search) params.set("search", query.search);
              const href = `/admin/testimoni?${params.toString()}`;
              return isActive ? (
                <span key={v} role="tab" aria-selected className="inline-flex h-8 items-center rounded-lg bg-royal-500 px-3 text-xs font-medium text-white">
                  {t(`visibility.${v}`)}
                </span>
              ) : (
                <Link key={v} role="tab" href={href} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100">
                  {t(`visibility.${v}`)}
                </Link>
              );
            })}
          </div>

          <form method="GET" className="flex gap-2">
            <input type="hidden" name="visibility" value={query.visibility} />
            <input
              type="search"
              name="search"
              defaultValue={query.search}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAriaLabel")}
              className="h-10 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
            />
            <button type="submit" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
              {t("searchAction")}
            </button>
          </form>

          <p className="text-sm text-slate-500">{t("totalCount", { count: result.data.page.total })}</p>

          {result.data.items.length > 0 ? (
            <ul aria-label={t("listAriaLabel")} className="flex flex-col gap-3">
              {result.data.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-medium text-slate-900">{item.primaryText}</p>
                      {item.slug && (
                        <p className="mt-1 truncate text-xs text-slate-400">/{item.slug}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PublicContentStatusBadge visibility={item.visibility} label={t(`visibility.${item.visibility}`)} />
                      <Link
                        href={`/admin/testimoni/${item.id}/edit`}
                        aria-label={t("editLabelFor", { title: item.primaryText })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
                      >
                        <PencilLineIcon aria-hidden className="size-4" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.translations?.map((tr) => (
                      <span key={tr.locale} className="inline-flex h-5 items-center rounded border border-slate-200 px-1.5 text-[10px] font-medium uppercase text-slate-500">
                        {tr.locale}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PublicContentStateNotice
              variant="empty"
              title={t("empty.title")}
              description={t("empty.description")}
            />
          )}

          <PublicContentPagination
            current={result.data.page.page}
            totalPages={result.data.page.totalPages}
            buildHref={(page) => {
              const params = new URLSearchParams();
              if (query.visibility !== "ALL") params.set("visibility", query.visibility);
              if (query.search) params.set("search", query.search);
              if (page > 1) params.set("page", String(page));
              const qs = params.toString();
              return `/admin/testimoni${qs ? `?${qs}` : ""}`;
            }}
            ariaLabel={t("pagination.ariaLabel")}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
            pageStatusLabel={t("pagination.pageStatus", {
              page: result.data.page.page,
              totalPages: result.data.page.totalPages,
            })}
            goToPageLabel={(targetPage) => t("pagination.goToPage", { page: targetPage })}
          />
        </>
      ) : (
        <PublicContentStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      )}
    </section>
  );
}
