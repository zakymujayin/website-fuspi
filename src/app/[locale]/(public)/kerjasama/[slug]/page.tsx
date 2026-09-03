import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CalendarDays,
  Download,
  ExternalLink,
  Globe2,
  MapPin,
  Tag,
} from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";

const RESOURCE = "PARTNERSHIP" as const;
const LIST_PATH = "/kerjasama";

const PRIMARY_ACTION =
  "inline-flex items-center justify-center gap-2 rounded-md bg-brass-400 px-4 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-brass-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-300";
const SECONDARY_ACTION =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-royal-400 hover:text-royal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600";

/** Renders the stored byte count as MB so the reader knows the cost of the download. */
function formatFileSize(bytes: number, locale: string): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 0.1) {
    return `${megabytes.toLocaleString(locale, {maximumFractionDigits: 1})} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
}

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

  const partnership = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  const dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  const startDate = partnership.startDate ? new Date(partnership.startDate).toLocaleDateString(locale, dateOptions) : null;
  const endDate = partnership.endDate ? new Date(partnership.endDate).toLocaleDateString(locale, dateOptions) : null;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("partnership.listTitle"), href: LIST_PATH},
          {label: partnership.partnerName},
        ]}
      />

      <article className="mt-8 border-y border-slate-200 bg-white">
        <header className="grid items-center gap-8 py-8 sm:py-10 lg:grid-cols-[13rem_minmax(0,1fr)_18rem] lg:gap-10 lg:py-12">
          <div className="relative mx-auto aspect-square w-full max-w-[13rem] overflow-hidden border border-slate-200 bg-slate-50">
            {partnership.logo ? (
              <Image
                src={partnership.logo.url}
                alt={partnership.logo.isDecorative ? "" : partnership.logo.alt}
                fill
                priority
                sizes="(min-width: 1024px) 13rem, (min-width: 640px) 18rem, 100vw"
                className="object-contain p-8 sm:p-10"
              />
            ) : (
              <div className="flex size-full items-center justify-center p-8 text-center font-display text-5xl font-semibold text-slate-300">
                {partnership.partnerName.charAt(0)}
              </div>
            )}
          </div>

          <div className="text-center lg:text-start">
            <h1 className="font-display text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              {partnership.partnerName}
            </h1>
            {partnership.level ? (
              <p className="mt-4 inline-flex border-s border-brass-500 ps-3 text-sm font-medium text-slate-600">
                {partnership.level}
              </p>
            ) : null}
            {partnership.translation.description ? (
              <div
                lang={partnership.translation.resolvedLocale}
                className="rich-text prose-measure mt-6 text-start"
                dangerouslySetInnerHTML={{ __html: partnership.translation.description }}
              />
            ) : null}
          </div>

          <aside className="border-t border-slate-200 pt-6 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0" aria-label={t("partnership.listTitle")}>
            {partnership.country || partnership.translation.category || startDate || endDate ? (
              <dl className="grid gap-4">
                {partnership.translation.category ? (
                  <div className="flex gap-3">
                    <Tag aria-hidden className="mt-0.5 size-4 shrink-0 text-royal-600" strokeWidth={1.5} />
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("detail.category")}</dt>
                      <dd className="mt-1 text-sm leading-5 text-slate-800">{partnership.translation.category}</dd>
                    </div>
                  </div>
                ) : null}
                {partnership.country ? (
                  <div className="flex gap-3">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-royal-600" strokeWidth={1.5} />
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("detail.country")}</dt>
                      <dd className="mt-1 text-sm leading-5 text-slate-800">{partnership.country}</dd>
                    </div>
                  </div>
                ) : null}
                {startDate ? (
                  <div className="flex gap-3">
                    <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-royal-600" strokeWidth={1.5} />
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("detail.startDate")}</dt>
                      <dd className="mt-1 text-sm leading-5 text-slate-800">{startDate}</dd>
                    </div>
                  </div>
                ) : null}
                {endDate ? (
                  <div className="flex gap-3">
                    <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-royal-600" strokeWidth={1.5} />
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("detail.endDate")}</dt>
                      <dd className="mt-1 text-sm leading-5 text-slate-800">{endDate}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </aside>
        </header>
      </article>

      <div className="mt-10">
        {partnership.evidence || partnership.websiteUrl ? (
          <aside className="flex flex-wrap justify-start gap-3 border-t border-slate-200 pt-8 lg:justify-end" aria-label={t("partnership.listTitle")}>
              {partnership.evidence?.kind === "DOCUMENT" ? (
                <a href={partnership.evidence.document.url} download className={PRIMARY_ACTION}>
                  <Download aria-hidden className="size-4" strokeWidth={1.5} />
                  <span>{t("detail.downloadAgreement")}</span>
                  <span className="text-xs font-normal opacity-70">
                    {t("detail.fileMeta", {size: formatFileSize(partnership.evidence.document.size, locale)})}
                  </span>
                </a>
              ) : null}
              {partnership.evidence?.kind === "EXTERNAL" ? (
                <a href={partnership.evidence.url} target="_blank" rel="noopener noreferrer" className={PRIMARY_ACTION}>
                  <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
                  {t("detail.viewEvidence")}
                </a>
              ) : null}
              {partnership.websiteUrl ? (
                <a href={partnership.websiteUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY_ACTION}>
                  <Globe2 aria-hidden className="size-4" strokeWidth={1.5} />
                  {t("detail.visitWebsite")}
                </a>
              ) : null}
          </aside>
        ) : null}
      </div>
    </Container>
  );
}
