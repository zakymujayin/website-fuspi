import {PlusIcon, PencilLineIcon} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {Link} from "@/i18n/navigation";
import type {TaxonomyKind, TaxonomyListQuery} from "@/contracts/admin-foundation";
import {normalizeTaxonomySearchParams} from "@/contracts/admin-foundation";
import {AdminListSearch} from "@/components/admin/shared/admin-list-search";
import {AdminPageSizeSelect} from "@/components/admin/shared/admin-page-size-select";
import {
  buildTaxonomyHref,
  TAXONOMY_SEARCH_MAX_LENGTH,
} from "@/components/admin/taxonomy/taxonomy-list-query";
import {TaxonomyPagination} from "@/components/admin/taxonomy/taxonomy-pagination";
import {listTaxonomies} from "@/features/admin/foundation";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getPrismaClient} from "@/lib/db/client";

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  return params;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminTaxonomy"});
  return {title: t("metaTitle"), robots: {index: false, follow: false}};
}

export default async function AdminTaxonomyPage({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/taksonomi`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminTaxonomy");
  let query: TaxonomyListQuery;
  try {
    query = normalizeTaxonomySearchParams(toSearchParams(await searchParams));
  } catch {
    query = {page: 1, pageSize: 10, search: "", direction: "ASC", kind: "ALL"};
  }
  const result = await listTaxonomies(getPrismaClient(), session.ok ? session.session : null, query);
  const filters: Array<"ALL" | TaxonomyKind> = ["ALL", "CATEGORY", "TAG"];

  return (
    <section aria-labelledby="admin-taxonomy-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-taxonomy-title" className="section-rule font-display text-2xl text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
        </div>
        <Link
          href="/admin/taksonomi/baru"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      <nav aria-label={t("filterAriaLabel")} className="flex flex-wrap gap-2">
        {filters.map((kind) => (
          <Link
            key={kind}
            href={buildTaxonomyHref({kind, search: query.search, pageSize: query.pageSize})}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors ${
              query.kind === kind
                ? "border-royal-500 bg-royal-50 text-royal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t(`filter.${kind}`)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminListSearch
          initialSearch={query.search}
          maxLength={TAXONOMY_SEARCH_MAX_LENGTH}
          buildHref={(search) =>
            buildTaxonomyHref({kind: query.kind, search, pageSize: query.pageSize, page: 1})
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
            buildTaxonomyHref({kind: query.kind, search: query.search, pageSize: size, page: 1})
          }
        />
      </div>

      {result.ok ? (
        <>
          <p className="text-sm text-slate-500">{t("totalCount", {count: result.data.page.total})}</p>
          {result.data.items.length > 0 ? (
            <ul aria-label={t("listAriaLabel")} className="flex flex-col gap-2">
              {result.data.items.map((item) => (
                <li key={`${item.kind}:${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-medium text-slate-900">{item.translations.id.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {t(`kindLabel.${item.kind}`)} · {item.slug} · {t("usageCount", {count: item.usageCount})}
                    </p>
                  </div>
                  <Link
                    href={`/admin/taksonomi/${item.id}/edit?kind=${item.kind}`}
                    aria-label={t("editLabelFor", {name: item.translations.id.name})}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <PencilLineIcon aria-hidden data-icon strokeWidth={1.5} />
                    {t("edit")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : query.search !== "" ? (
            <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
              <h2 className="font-display text-base font-medium text-slate-900">{t("searchEmpty.title")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("searchEmpty.description")}</p>
            </div>
          ) : (
            <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
              <h2 className="font-display text-base font-medium text-slate-900">{t("empty.title")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("empty.description")}</p>
            </div>
          )}

          <TaxonomyPagination
            current={result.data.page.page}
            totalPages={result.data.page.totalPages}
            buildHref={(page) =>
              buildTaxonomyHref({
                kind: query.kind,
                search: query.search,
                pageSize: query.pageSize,
                page,
              })
            }
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
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {t("unavailable")}
        </div>
      )}
    </section>
  );
}
