import {PencilLineIcon, PlusIcon} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {Link} from "@/i18n/navigation";
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
  const active = query.ok ? query.data.active : "ALL";
  const search = query.ok ? query.data.search : "";

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

      <form method="GET" className="flex flex-wrap gap-2">
        <select
          name="active"
          defaultValue={active}
          aria-label={t("activeFilter")}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
        >
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((value) => (
            <option key={value} value={value}>{t(`active.${value}`)}</option>
          ))}
        </select>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAriaLabel")}
          className="h-10 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
        />
        <button type="submit" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
          {t("searchAction")}
        </button>
      </form>

      {result.ok ? (
        result.data.items.length > 0 ? (
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
        ) : (
          <p className="text-sm text-slate-500">{t("empty")}</p>
        )
      ) : (
        <p role="alert" className="text-sm text-destructive">{t("unavailable")}</p>
      )}
    </section>
  );
}
