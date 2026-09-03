import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";
import {formatDateDdMmYyyy} from "@/lib/format/date";

const RESOURCE = "SCHOLARSHIP" as const;
const LIST_PATH = "/beasiswa";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });
  if (!result.ok) {
    return { title: t("publicContent.scholarship.listTitle"), description: t("publicContent.scholarship.listDescription") };
  }
  const scholarship = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  return {
    title: scholarship.translation.title,
    description: scholarship.translation.description ?? undefined,
    alternates: { canonical: `/${locale}${LIST_PATH}/${scholarship.slug}` },
  };
}

export default async function ScholarshipDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");
  const tNav = await getTranslations("Nav");

  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });

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

  const scholarship = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("scholarship.listTitle"), href: LIST_PATH},
          {label: scholarship.translation.title, resolvedLocale: scholarship.translation.resolvedLocale},
        ]}
      />

      <article>
        <header className="mb-8">
          <SectionHeading as="h1" title={scholarship.translation.title} />
          {scholarship.translation.provider ? (
            <p className="mt-4 text-slate-600">{t("detail.providedBy", { provider: scholarship.translation.provider })}</p>
          ) : null}
        </header>

        {(scholarship.startDate || scholarship.endDate) ? (
          <section className="mb-8">
            <dl className="flex flex-wrap gap-6">
              {scholarship.startDate ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.startDate")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatDateDdMmYyyy(scholarship.startDate)}</dd>
                </div>
              ) : null}
              {scholarship.endDate ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.endDate")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatDateDdMmYyyy(scholarship.endDate)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {scholarship.translation.description ? (
          <section className="mb-8">
            <div
              lang={scholarship.translation.resolvedLocale}
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: scholarship.translation.description }}
            />
          </section>
        ) : null}

        <section className="flex flex-wrap gap-3">
          {scholarship.registrationUrl ? (
            <a
              href={scholarship.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-600 transition-colors"
            >
              {t("detail.registerNow")}
              <span aria-hidden>&#8599;</span>
            </a>
          ) : null}
          {scholarship.document ? (
            <a
              href={scholarship.document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {scholarship.document.translation.title ?? t("detail.downloadDocument")}
            </a>
          ) : null}
        </section>
      </article>
    </Container>
  );
}
