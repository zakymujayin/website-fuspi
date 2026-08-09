import { PlusIcon, PencilLineIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { listHomeNavAdmin } from "@/features/home-nav/admin-query";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHomeNav" });
  return { title: t("statistic.title"), robots: { index: false, follow: false } };
}

export default async function AdminStatisticPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/statistik`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");
  const result = await listHomeNavAdmin(getPrismaClient(), session.ok ? session.session : null, "STATISTIC");

  return (
    <section aria-labelledby="admin-statistic-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="admin-statistic-title" className="section-rule font-display text-2xl text-slate-900">
            {t("statistic.title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">{t("statistic.description")}</p>
        </div>
        <Link
          href="/admin/beranda/statistik/new"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-royal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("createAction")}
        </Link>
      </div>

      {result.ok ? (
        result.items.length > 0 ? (
          <ul aria-label={t("statistic.listAriaLabel")} className="flex flex-col gap-3">
            {result.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-medium text-slate-900">{item.primaryText}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {t(item.isVisible ? "visibility.VISIBLE" : "visibility.HIDDEN")} · {t("orderLabel", { order: item.order })}
                  </p>
                </div>
                <Link
                  href={`/admin/beranda/statistik/${item.id}/edit`}
                  aria-label={t("editLabelFor", { title: item.primaryText })}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <PencilLineIcon aria-hidden className="size-4" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t("empty.description")}</p>
        )
      ) : (
        <p role="alert" className="text-sm text-destructive">{t("unavailable.description")}</p>
      )}
    </section>
  );
}
