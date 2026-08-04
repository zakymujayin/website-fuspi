import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";
import type { PublicContentDetail } from "@/contracts/public-content";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
      resource: "DOCUMENT",
      slug,
      locale,
    });
    if (!result.ok) return {};
    const doc = result.data as Extract<PublicContentDetail, { resource: "DOCUMENT" }>;
    return {
      title: doc.translation.title,
      description: doc.translation.category ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as "id" | "en" | "ar";
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");

  const prisma = getPrismaClient();
  const result = await getPublicContentDetail(prisma, {
    resource: "DOCUMENT",
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

  const doc = result.data as Extract<PublicContentDetail, { resource: "DOCUMENT" }>;
  const contentDir = doc.translation.resolvedLocale === "ar" ? "rtl" : "ltr";

  return (
    <Container className="py-12 md:py-20">
      <article
        lang={doc.translation.resolvedLocale}
        dir={contentDir}
        className="mx-auto max-w-3xl"
      >
        <SectionHeading as="h1" title={doc.translation.title} />

        {doc.translation.category ? (
          <p className="mt-2 text-sm font-medium uppercase tracking-wide text-royal-600">
            {doc.translation.category}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <svg
                aria-hidden
                className="size-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              {doc.mimeType === "application/pdf" ? "PDF" : doc.mimeType}
            </span>
            <span>{formatBytes(doc.size)}</span>
          </div>

          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-lg bg-royal-600 px-5 py-2.5 text-sm font-medium text-white",
              "hover:bg-royal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600",
              "transition-colors",
            )}
          >
            <svg
              aria-hidden
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {t("document.download")}
          </a>
        </div>

        {doc.translation.isFallback ? (
          <p className="mt-6 text-sm text-amber-700">
            {t("fallbackNotice")}
          </p>
        ) : null}
      </article>
    </Container>
  );
}
