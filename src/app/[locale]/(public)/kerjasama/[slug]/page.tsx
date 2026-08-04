import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";

const RESOURCE = "PARTNERSHIP" as const;
const LIST_PATH = "/kerjasama";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });
  if (!result.ok) {
    return { title: t("publicContent.partnership.listTitle"), description: t("publicContent.partnership.listDescription") };
  }
  const partnership = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  return {
    title: partnership.partnerName,
    description: partnership.translation.description ?? undefined,
    alternates: { canonical: `/${locale}${LIST_PATH}/${partnership.slug}` },
  };
}

export default async function PartnershipDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");

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

  const partnership = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <nav aria-label={t("breadcrumb")} className="mb-6 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <a href={`/${locale}`} className="hover:text-royal-500 transition-colors">{t("breadcrumbHome")}</a>
          </li>
          <li aria-hidden>/</li>
          <li>
            <a href={`/${locale}${LIST_PATH}`} className="hover:text-royal-500 transition-colors">{t("publicContent.partnership.listTitle")}</a>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-slate-700">{partnership.partnerName}</li>
        </ol>
      </nav>

      <article>
        <header className="mb-10">
          <div className="flex flex-wrap items-start gap-6 sm:flex-nowrap">
            {partnership.logo ? (
              <img
                src={partnership.logo.url}
                alt={partnership.logo.isDecorative ? "" : partnership.logo.alt}
                width={partnership.logo.width ?? undefined}
                height={partnership.logo.height ?? undefined}
                className="size-20 shrink-0 rounded-lg object-contain bg-slate-50"
              />
            ) : null}

            <div className="min-w-0">
              {partnership.level ? (
                <span className="mb-2 inline-block rounded-full bg-royal-500/10 px-3 py-1 text-[13px] font-medium text-royal-500">
                  {partnership.level}
                </span>
              ) : null}
              <SectionHeading as="h1" title={partnership.partnerName} />
            </div>
          </div>
        </header>

        {partnership.country || partnership.translation.category || (partnership.startDate || partnership.endDate) ? (
          <section className="mb-8">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {partnership.translation.category ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.category")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{partnership.translation.category}</dd>
                </div>
              ) : null}
              {partnership.country ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.country")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{partnership.country}</dd>
                </div>
              ) : null}
              {partnership.startDate ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.startDate")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{new Date(partnership.startDate).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</dd>
                </div>
              ) : null}
              {partnership.endDate ? (
                <div>
                  <dt className="text-[13px] font-medium uppercase tracking-wide text-slate-500">{t("detail.endDate")}</dt>
                  <dd className="mt-1 text-sm text-slate-700">{new Date(partnership.endDate).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {partnership.translation.description ? (
          <section className="prose prose-slate max-w-none mb-8">
            <div
              lang={partnership.translation.resolvedLocale}
              dangerouslySetInnerHTML={{ __html: partnership.translation.description }}
            />
          </section>
        ) : null}

        <section className="flex flex-wrap gap-3">
          {partnership.websiteUrl ? (
            <a
              href={partnership.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t("detail.visitWebsite")}
              <span aria-hidden>&#8599;</span>
            </a>
          ) : null}
          {partnership.evidence ? (
            partnership.evidence.kind === "DOCUMENT" ? (
              <a
                href={partnership.evidence.document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {partnership.evidence.document.translation.title ?? t("detail.viewEvidence")}
              </a>
            ) : (
              <a
                href={partnership.evidence.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t("detail.viewEvidence")}
                <span aria-hidden>&#8599;</span>
              </a>
            )
          ) : null}
        </section>
      </article>
    </Container>
  );
}
