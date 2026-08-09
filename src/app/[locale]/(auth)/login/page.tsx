import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { institution } from "@/config/institution";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPrismaClient } from "@/lib/db/client";
import {
  readSessionToken,
  validateRequestSession,
} from "@/lib/auth/runtime/request-session";
import {
  normalizeAuthRedirect,
  parseAppLocale,
} from "@/lib/auth/runtime/redirect";

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
  const destinationCandidate = typeof next === "string" ? next : undefined;
  const appLocale = parseAppLocale(locale);
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(readSessionToken(cookieStore));
  let sessionInvalid = false;
  let activeSessionDestination: string | undefined;

  if (hasSessionCookie) {
    try {
      const session = await validateRequestSession(getPrismaClient(), cookieStore);
      if (session.ok) {
        const destination = normalizeAuthRedirect(destinationCandidate, appLocale);
        activeSessionDestination = session.session.mustChangePassword
          ? `/${appLocale}/change-password?next=${encodeURIComponent(destination)}`
          : destination;
      } else {
        sessionInvalid = true;
      }
    } catch {
      // A database outage must not be presented as an expired session. The
      // credentials endpoint will return its bounded unavailable result.
    }
  }

  // redirect() throws; keep it outside the database error boundary.
  if (activeSessionDestination) redirect(activeSessionDestination);

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
        <LoginForm
          locale={locale}
          next={destinationCandidate}
          sessionInvalid={sessionInvalid}
        />
      </CardContent>
    </Card>
  );
}
