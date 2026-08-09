import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { PasswordChangeForm } from "@/components/auth/password-change-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { institution } from "@/config/institution";
import { getRequestSession } from "@/lib/auth/runtime/request-session";
import { normalizeAuthRedirect, parseAppLocale } from "@/lib/auth/runtime/redirect";

type PasswordChangePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: PasswordChangePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PasswordChange" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function PasswordChangePage({
  params,
  searchParams,
}: PasswordChangePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const next = (await searchParams).next;
  const destinationCandidate = typeof next === "string" ? next : undefined;
  const session = await getRequestSession();

  if (!session.ok) {
    const destination = normalizeAuthRedirect(destinationCandidate, appLocale);
    redirect(`/${appLocale}/login?next=${encodeURIComponent(destination)}`);
  }

  const t = await getTranslations("PasswordChange");

  return (
    <Card className="w-full max-w-md gap-6 px-2 py-8 shadow-md sm:px-4">
      <CardHeader className="gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-royal-600 uppercase">
          {institution.shortName}
        </p>
        <CardTitle>
          <h1 id="password-change-title" className="font-display text-2xl leading-tight">
            {t("title")}
          </h1>
        </CardTitle>
        <CardDescription className="leading-relaxed">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordChangeForm locale={appLocale} next={destinationCandidate} />
      </CardContent>
    </Card>
  );
}
