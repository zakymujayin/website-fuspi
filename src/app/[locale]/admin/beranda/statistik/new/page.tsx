import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { StatisticEditorForm } from "@/components/admin/home-nav/statistic-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHomeNav" });
  return { title: t("statistic.createTitle"), robots: { index: false, follow: false } };
}

export default async function NewStatisticPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/beranda/statistik/new`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminHomeNav");

  return (
    <section className="flex flex-col gap-6">
      <h1 className="section-rule font-display text-2xl text-slate-900">{t("statistic.createTitle")}</h1>
      <StatisticEditorForm mode="create" listHref="/admin/beranda/statistik" />
    </section>
  );
}
