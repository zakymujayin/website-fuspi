import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { institution } from "@/config/institution";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");
  const next = (await searchParams).next;

  return (
    <Card className="w-full max-w-md gap-6 px-2 py-8 shadow-md sm:px-4">
      <CardHeader className="gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-royal-600 uppercase">
          {institution.shortName}
        </p>
        <h1 id="login-title" className="font-display text-2xl leading-tight text-slate-900">
          {t("title", { faculty: institution.shortName })}
        </h1>
        <p className="text-sm text-slate-500">{institution.name}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>

      <CardContent>
        {/*
          `next` is attacker-controlled. It is handed to the server untouched and
          is never validated, resolved, or navigated to on the client; only the
          server-returned `redirectTo` is ever used as a destination.
        */}
        <LoginForm locale={locale} next={typeof next === "string" ? next : undefined} />
      </CardContent>
    </Card>
  );
}
