import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import React from "react";

import {SectionHeading} from "@/components/public/section-heading";
import {PublicContentCard, type PublicContentCardData} from "@/components/public/public-content-card";
import {PublicContentStateNotice} from "@/components/admin/public-content/public-content-state-notice";
import {Container} from "@/components/ui/container";
import type {PublicContentResource} from "@/contracts/public-content";
import {listPublicContent} from "@/features/public-content/public-list";
import {getPrismaClient} from "@/lib/db/client";

import {PUBLIC_CONTENT_LABEL_KEYS, PUBLIC_CONTENT_SLUG_MAP} from "@/components/admin/public-content/public-content-query";

const PAGE_SIZE = 12;

export type PublicContentListPageConfig = {
  resource: PublicContentResource;
  hasDetail: boolean;
};

function detailHref(resource: PublicContentResource, slug: string | null, id: string): string {
  const path = PUBLIC_CONTENT_SLUG_MAP[resource];
  if (slug) return `/${path}/${slug}`;
  return `/${path}?id=${encodeURIComponent(id)}`;
}

function resolvePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10000 ? Math.floor(parsed) : 1;
}

export async function generatePublicContentListMetadata(
  resource: PublicContentResource,
  locale: string,
): Promise<Metadata> {
  const t = await getTranslations({locale, namespace: "PublicContent"});
  const labelKey = PUBLIC_CONTENT_LABEL_KEYS[resource];
  const slug = PUBLIC_CONTENT_SLUG_MAP[resource];
  return {
    title: t(`${labelKey}.listTitle`),
    description: t(`${labelKey}.listDescription`),
    alternates: {canonical: `/${locale}/${slug}`},
  };
}

type PublicContentListPageProps = {
  config: PublicContentListPageConfig;
  params: Promise<{locale: string}>;
  searchParams: Promise<{page?: string | string[]}>;
};

export async function PublicContentListPage({config, params, searchParams}: PublicContentListPageProps) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");
  const {page: rawPage} = await searchParams;
  const page = resolvePage(rawPage);
  const labelKey = PUBLIC_CONTENT_LABEL_KEYS[config.resource];
  const slug = PUBLIC_CONTENT_SLUG_MAP[config.resource];
  const title = t(`${labelKey}.listTitle`);
  const description = t(`${labelKey}.listDescription`);
  const readMore = t("readMore");
  const emptyTitle = t("empty.title");
  const emptyDescription = t(`empty.${slug}`);
  const unavailableTitle = t("unavailable.title");
  const unavailableDescription = t("unavailable.description");

  let result;
  try {
    result = await listPublicContent(getPrismaClient(), {
      resource: config.resource,
      locale,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch {
    result = {ok: false as const, code: "UNAVAILABLE" as const};
  }

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={title} description={description} />

      <div className="mt-10">
        {!result.ok ? (
          <PublicContentStateNotice variant="unavailable" title={unavailableTitle} description={unavailableDescription} />
        ) : result.items.length === 0 ? (
          <PublicContentStateNotice variant="empty" title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item) => (
              <PublicContentCard
                key={item.id}
                item={item as unknown as PublicContentCardData}
                detailHref={detailHref(config.resource, item.slug, item.id)}
                titleLabel={title}
                badgeLabel={item.badge ?? undefined}
                readMoreLabel={readMore}
                hasDetail={config.hasDetail}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
