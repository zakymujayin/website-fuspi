import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";
import type { PublicContentDetail } from "@/contracts/public-content";
import { cn } from "@/lib/utils";
import {formatDateTimeDdMmYyyy} from "@/lib/format/date";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as "id" | "en" | "ar";
  setRequestLocale(locale);

  try {
    const prisma = getPrismaClient();
    const result = await getPublicContentDetail(prisma, {
      resource: "EVENT",
      slug,
      locale,
    });
    if (!result.ok) return {};
    const event = result.data as Extract<PublicContentDetail, { resource: "EVENT" }>;
    return {
      title: event.translation.title,
      description: event.translation.description ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as "id" | "en" | "ar";
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");
  const tNav = await getTranslations("Nav");

  const prisma = getPrismaClient();
  const result = await getPublicContentDetail(prisma, {
    resource: "EVENT",
    slug,
    locale,
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
    return (
      <Container className="py-12 md:py-20">
        <PublicContentStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </Container>
    );
  }

  const event = result.data as Extract<PublicContentDetail, { resource: "EVENT" }>;
  const contentDir = event.translation.resolvedLocale === "ar" ? "rtl" : "ltr";

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mx-auto mb-6 max-w-3xl"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("event.listTitle"), href: "/agenda"},
          {label: event.translation.title, resolvedLocale: event.translation.resolvedLocale},
        ]}
      />
      <article
        lang={event.translation.resolvedLocale}
        dir={contentDir}
        className="mx-auto max-w-3xl"
      >
        <SectionHeading
          as="h1"
          title={event.translation.title}
          description={event.translation.description ?? undefined}
        />

        <div className="mt-8 grid gap-5 rounded-xl border border-slate-200 bg-white p-6">
          {event.translation.location ? (
            <div className="flex items-start gap-3">
              <svg
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-royal-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              <span className="text-sm text-slate-700">
                {event.translation.location}
              </span>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <svg
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-royal-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            <div className="text-sm text-slate-700">
              <time dateTime={event.startAt}>
                {formatDateTimeDdMmYyyy(start)}
              </time>
              {end ? (
                <>
                  {" \u2014 "}
                  <time dateTime={event.endAt ?? undefined}>
                    {formatDateTimeDdMmYyyy(end)}
                  </time>
                </>
              ) : null}
            </div>
          </div>

          {event.registrationUrl ? (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-lg bg-royal-600 px-5 py-2.5 text-sm font-medium text-white",
                "hover:bg-royal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600",
                "transition-colors",
              )}
            >
              {t("event.register")}
              <svg
                aria-hidden
                className="size-4 rtl:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          ) : null}
        </div>

        {event.translation.isFallback ? (
          <p className="mt-6 text-sm text-amber-700">
            {t("fallbackNotice")}
          </p>
        ) : null}
      </article>
    </Container>
  );
}
