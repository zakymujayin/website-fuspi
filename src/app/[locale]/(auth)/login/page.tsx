import type { Metadata } from "next";
import NextImage from "next/image";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/public/brand-mark";
import { institution } from "@/config/institution";
import { getPrismaClient } from "@/lib/db/client";
import {
  readSessionToken,
  validateRequestSession,
} from "@/lib/auth/runtime/request-session";
import {
  parseAppLocale,
  resolveActiveLoginSessionDestination,
} from "@/lib/auth/runtime/redirect";
import { isSilaSsoAvailable } from "@/lib/auth/runtime/sila-sso";

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
  const sso = (await searchParams).sso;
  const destinationCandidate = typeof next === "string" ? next : undefined;
  const ssoFailure = typeof sso === "string" ? sso : undefined;
  const appLocale = parseAppLocale(locale);
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(readSessionToken(cookieStore));
  let sessionInvalid = false;
  let activeSessionDestination: string | undefined;

  if (hasSessionCookie) {
    try {
      const session = await validateRequestSession(getPrismaClient(), cookieStore);
      if (session.ok) {
        activeSessionDestination = resolveActiveLoginSessionDestination(
          session.session,
          destinationCandidate,
          appLocale,
        );
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
    <div className="grid w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card-lg)] ring-1 ring-foreground/10 md:grid-cols-5">
      {/* Identity panel: an image stands in for the panel's copy — the form
          panel's own heading (id="login-title") carries the page title, and
          that heading stays unconditional so the form's aria-labelledby
          never points at a display:none node. */}
      <div className="relative min-h-48 overflow-hidden bg-navy-900 md:col-span-2 md:min-h-0">
        <NextImage
          src="/images/hero/slide-1.svg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 py-6 md:px-10 md:py-10">
          <BrandMark tone="dark" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-10 md:col-span-3 md:py-12">
        <div className="flex flex-col gap-2">
          <h1 id="login-title" className="font-display text-2xl leading-tight text-slate-900">
            {t("title", { faculty: institution.shortName })}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/*
          `next` is attacker-controlled. It is handed to the server untouched and
          is never validated, resolved, or navigated to on the client; only the
          server-returned `redirectTo` is ever used as a destination.
        */}
        <LoginForm
          locale={locale}
          next={destinationCandidate}
          sessionInvalid={sessionInvalid}
          silaSsoEnabled={isSilaSsoAvailable()}
          ssoFailure={ssoFailure}
        />
      </div>
    </div>
  );
}
