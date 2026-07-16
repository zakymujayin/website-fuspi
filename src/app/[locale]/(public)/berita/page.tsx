import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SectionHeading } from "@/components/public/section-heading";
import { Container } from "@/components/ui/container";
import { getPrismaClient } from "@/lib/db/client";
import { listPublicPosts, type PublicPostListQueryResult } from "@/lib/content/post-public-queries";

import { buildLocaleAlternates } from "@/components/public/post/hreflang";
import { resolveAppLocale } from "@/components/public/post/locale";
import { clampPageToTotalPages, parsePageCandidate, totalPagesFor } from "@/components/public/post/pagination";
import { resolveCoverImageSrc } from "@/components/public/post/cover-image";
import { formatJakartaPublishedDate, humanizeCategorySlug } from "@/components/public/post/format";
import { PostBreadcrumb } from "@/components/public/post/post-breadcrumb";
import { PostCardHorizontal } from "@/components/public/post/post-card-horizontal";
import { PostPagination } from "@/components/public/post/post-pagination";
import { PostStateNotice } from "@/components/public/post/post-state-notice";
import { PostJsonLd } from "@/components/public/post/post-json-ld";
import { buildBreadcrumbJsonLd } from "@/components/public/post/json-ld";

const PAGE_SIZE = 10;
const NEWS_PATH = "/berita";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveAppLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "Post" });
  const alternates = buildLocaleAlternates(NEWS_PATH, locale, process.env.NEXT_PUBLIC_SITE_URL);

  return {
    title: t("news.title"),
    description: t("news.metaDescription"),
    alternates: { canonical: alternates.canonical, languages: alternates.languages },
  };
}

async function fetchListPage(
  locale: ReturnType<typeof resolveAppLocale>,
  page: number,
): Promise<PublicPostListQueryResult> {
  try {
    const database = getPrismaClient();
    return await listPublicPosts(
      database,
      { locale, type: "BERITA", page, pageSize: PAGE_SIZE },
      process.env.UPLOAD_PUBLIC_URL ?? "",
    );
  } catch {
    return { ok: false, code: "QUERY_UNAVAILABLE" };
  }
}

export default async function NewsListPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveAppLocale(rawLocale);
  setRequestLocale(locale);

  const t = await getTranslations("Post");
  const { page: rawPage } = await searchParams;

  const candidatePage = parsePageCandidate(rawPage);
  let result = await fetchListPage(locale, candidatePage);
  let currentPage = candidatePage;

  if (result.ok) {
    const totalPages = totalPagesFor(result.data.total, result.data.pageSize);
    const clamped = clampPageToTotalPages(candidatePage, totalPages);
    if (clamped !== candidatePage) {
      currentPage = clamped;
      result = await fetchListPage(locale, clamped);
    }
  }

  const breadcrumbItems = [
    { label: t("breadcrumbHome"), href: "/" },
    { label: t("news.breadcrumbLabel") },
  ];

  return (
    <Container className="py-12 md:py-20">
      <PostJsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: buildLocaleAlternates("/", locale, process.env.NEXT_PUBLIC_SITE_URL).canonical },
          { name: t("news.breadcrumbLabel"), url: buildLocaleAlternates(NEWS_PATH, locale, process.env.NEXT_PUBLIC_SITE_URL).canonical },
        ])}
      />
      <PostBreadcrumb items={breadcrumbItems} ariaLabel={t("news.breadcrumbLabel")} />

      <div className="mt-6">
        <SectionHeading as="h1" title={t("news.title")} description={t("news.description")} />
      </div>

      <div className="mt-10">
        {!result.ok ? (
          <PostStateNotice
            variant="unavailable"
            title={t("unavailable.title")}
            description={t("unavailable.description")}
          />
        ) : result.data.total === 0 ? (
          <PostStateNotice variant="empty" title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <>
            <div className="flex flex-col">
              {result.data.items.map((item) => (
                <PostCardHorizontal
                  key={item.id}
                  href={`${NEWS_PATH}/${item.slug}`}
                  title={item.translation.value.title}
                  excerpt={item.translation.value.excerpt}
                  cover={resolveCoverImageSrc(item.cover, process.env.NEXT_PUBLIC_SITE_URL)}
                  authorName={item.authorName}
                  dateLabel={formatJakartaPublishedDate(item.publishedAt, locale)}
                  categoryLabel={item.categorySlug ? humanizeCategorySlug(item.categorySlug) : null}
                  readMoreLabel={t("readMore")}
                  fallbackNoticeMessage={item.translation.isFallback ? t("fallbackNotice") : null}
                />
              ))}
            </div>

            <PostPagination
              current={currentPage}
              totalPages={totalPagesFor(result.data.total, result.data.pageSize)}
              basePath={NEWS_PATH}
              ariaLabel={t("news.breadcrumbLabel")}
              previousLabel={t("pagination.previous")}
              nextLabel={t("pagination.next")}
              pageStatusLabel={t("pagination.pageStatus", {
                page: currentPage,
                totalPages: totalPagesFor(result.data.total, result.data.pageSize),
              })}
              goToPageLabel={(page) => t("pagination.goToPage", { page })}
            />
          </>
        )}
      </div>
    </Container>
  );
}
