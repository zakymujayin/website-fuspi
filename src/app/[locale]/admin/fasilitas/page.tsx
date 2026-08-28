import {PencilLineIcon, PlusIcon} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {Link} from "@/i18n/navigation";
import {AdminListSearch} from "@/components/admin/shared/admin-list-search";
import {AdminPageSizeSelect} from "@/components/admin/shared/admin-page-size-select";
import {
  buildFacilityHref,
  FACILITY_SEARCH_MAX_LENGTH,
  type FacilityActiveFilter,
} from "@/components/admin/facility/facility-list-query";
import {FacilityPagination} from "@/components/admin/facility/facility-pagination";
import {listFacilities, normalizeFacilitySearchParams} from "@/features/facility/domain";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getPrismaClient} from "@/lib/db/client";

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminFacility"});
  return {title: t("title"), robots: {index: false, follow: false}};
}

function toSearchParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

export default async function AdminFacilitiesPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/fasilitas`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminFacility");
  const query = normalizeFacilitySearchParams(toSearchParams(await searchParams));
  const result = query.ok
    ? await listFacilities(getPrismaClient(), session.ok ? session.session : null, query.data)
    : {ok: false as const, code: "REQUEST_INVALID" as const};
  const active: FacilityActiveFilter = query.ok ? query.data.active : "ALL";
  const search = query.ok ? query.data.search : "";
  const pageSize: 10 | 20 | 50 = query.ok ? query.data.pageSize : 10;
  const activeFilters: FacilityActiveFilter[] = ["ALL", "ACTIVE", "INACTIVE"];

  return (
    <section aria-labelledby="admin-facility-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-facility-title" className="section-rule font-display text-2xl text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
        </div>
        <Link
          href="/admin/fasilitas/baru"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      <nav aria-label={t("activeFilter")} className="flex flex-wrap gap-2">
        {activeFilters.map((value) => (
          <Link
            key={value}
            href={buildFacilityHref({active: value, search, pageSize})}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors ${
              active === value
                ? "border-royal-500 bg-royal-50 text-royal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t(`active.${value}`)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminListSearch
          initialSearch={search}
          maxLength={FACILITY_SEARCH_MAX_LENGTH}
          buildHref={(next) => buildFacilityHref({active, search: next, pageSize, page: 1})}
          labels={{
            placeholder: t("searchPlaceholder"),
            ariaLabel: t("searchAriaLabel"),
            action: t("searchAction"),
            clear: t("searchClear"),
          }}
        />
        <AdminPageSizeSelect
          value={pageSize}
          label={t("pageSizeLabel")}
          optionLabel={(n) => String(n)}
          buildHref={(size) => buildFacilityHref({active, search, pageSize: size, page: 1})}
        />
      </div>

      {result.ok ? (
        <>
          {result.data.items.length > 0 ? (
            <ul aria-label={t("listAriaLabel")} className="flex flex-col gap-3">
              {result.data.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-medium text-slate-900">{item.slug}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t(`types.${item.type}`)} · {t(item.isActive ? "active.ACTIVE" : "active.INACTIVE")} · {t("orderLabel", {order: item.order})}
                    </p>
                  </div>
                  <Link
                    href={`/admin/fasilitas/${item.id}/edit`}
                    aria-label={t("editLabelFor", {title: item.slug})}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    <PencilLineIcon aria-hidden className="size-4" strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : search !== "" ? (
            <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
              <h2 className="font-display text-base font-medium text-slate-900">{t("searchEmpty.title")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("searchEmpty.description")}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("empty")}</p>
          )}

          <FacilityPagination
            current={result.data.page.page}
            totalPages={result.data.page.totalPages}
            buildHref={(page) => buildFacilityHref({active, search, pageSize, page})}
            ariaLabel={t("pagination.ariaLabel")}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
            pageStatusLabel={t("pagination.pageStatus", {
              page: result.data.page.page,
              totalPages: result.data.page.totalPages,
            })}
            goToPageLabel={(targetPage) => t("pagination.goToPage", {page: targetPage})}
          />
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">{t("unavailable")}</p>
      )}
    </section>
  );
}
