import { PencilLineIcon } from "lucide-react";
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
  return { title: t("section.title"), robots: { index: false, follow: false } };
}

export default async function AdminHomeSectionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/bagian`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");
  const result = await listHomeNavAdmin(getPrismaClient(), session.ok ? session.session : null, "HOME_SECTION");

  return (
    <section aria-labelledby="admin-home-section-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-home-section-title" className="section-rule font-display text-2xl text-slate-900">
          {t("section.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("section.description")}</p>
      </div>

      {result.ok ? (
        <ul aria-label={t("section.listAriaLabel")} className="flex flex-col gap-3">
          {result.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-medium text-slate-900">{item.primaryText}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t(item.isVisible ? "visibility.VISIBLE" : "visibility.HIDDEN")} · {t("orderLabel", { order: item.order })}
                </p>
              </div>
              <Link
                href={`/admin/beranda/bagian/${item.id}/edit`}
                aria-label={t("editLabelFor", { title: item.primaryText })}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <PencilLineIcon aria-hidden className="size-4" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="text-sm text-destructive">{t("unavailable.description")}</p>
      )}
    </section>
  );
}
