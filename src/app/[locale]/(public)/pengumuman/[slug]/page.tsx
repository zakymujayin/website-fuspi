import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Container } from "@/components/ui/container";
import { getPrismaClient } from "@/lib/db/client";
import {
  getPublicPostDetail,
  listPublicPosts,
  type PublicPostDetailQueryResult,
} from "@/lib/content/post-public-queries";

import { buildLocaleAlternates } from "@/components/public/post/hreflang";
import { LOCALE_DIRECTION, resolveAppLocale } from "@/components/public/post/locale";
import { resolveCoverImageSrc } from "@/components/public/post/cover-image";
import { validateSiteOrigin } from "@/components/public/post/site-origin";
import { formatJakartaPublishedDate, estimateReadingMinutes, humanizeCategorySlug } from "@/components/public/post/format";
import { sanitizeStoredContentOrNull } from "@/components/public/post/sanitize";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/components/public/post/json-ld";
import { PostJsonLd } from "@/components/public/post/post-json-ld";
import { PostBreadcrumb } from "@/components/public/post/post-breadcrumb";
import { PostMetaRow } from "@/components/public/post/post-meta-row";
import { PostCoverImage } from "@/components/public/post/post-cover-image";
import { PostFallbackBanner } from "@/components/public/post/post-fallback-banner";
import { PostArticleBody } from "@/components/public/post/post-article-body";
import { PostImageGallery } from "@/components/public/post/post-image-gallery";
import { PostStateNotice } from "@/components/public/post/post-state-notice";
import { PostSidebarLatest, type PostSidebarItem } from "@/components/public/post/post-sidebar-latest";

const ANNOUNCEMENTS_PATH = "/pengumuman";
const SIDEBAR_FETCH_SIZE = 6;
const SIDEBAR_DISPLAY_SIZE = 5;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

type DetailLoadResult =
  | { kind: "unavailable" }
  | { kind: "result"; result: PublicPostDetailQueryResult };

const loadPostDetail = cache(
  async (locale: ReturnType<typeof resolveAppLocale>, slug: string): Promise<DetailLoadResult> => {
    try {
      const database = getPrismaClient();
      const result = await getPublicPostDetail(
        database,
        { locale, type: "PENGUMUMAN", slug },
        process.env.UPLOAD_PUBLIC_URL ?? "",
      );
      return { kind: "result", result };
    } catch {
      return { kind: "unavailable" };
    }
  },
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveAppLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "Post" });
  const load = await loadPostDetail(locale, slug);

  if (load.kind === "unavailable" || !load.result.ok) {
    return { title: t("pengumuman.title"), description: t("pengumuman.metaDescription") };
  }

  const post = load.result.data;
  const { value } = post.translation;
  const siteOrigin = validateSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const alternates = buildLocaleAlternates(`${ANNOUNCEMENTS_PATH}/${slug}`, locale, siteOrigin);
  const cover = resolveCoverImageSrc(post.cover, siteOrigin);
  const absoluteCoverUrl =
    cover.kind === "image" && siteOrigin ? new URL(cover.src, siteOrigin).toString() : undefined;

  return {
    title: value.metaTitle ?? value.title,
    description: value.metaDesc ?? value.excerpt ?? undefined,
    alternates: { canonical: alternates.canonical, languages: alternates.languages },
    openGraph: {
      type: "article",
      title: value.metaTitle ?? value.title,
      description: value.metaDesc ?? value.excerpt ?? undefined,
      publishedTime: post.publishedAt.toISOString(),
      authors: post.authorName ?? undefined,
      images: absoluteCoverUrl ? [absoluteCoverUrl] : undefined,
    },
  };
}

async function fetchSidebarItems(
  locale: ReturnType<typeof resolveAppLocale>,
  excludeId: string,
  siteOrigin: string | null,
): Promise<PostSidebarItem[]> {
  try {
    const database = getPrismaClient();
    const result = await listPublicPosts(
      database,
      { locale, type: "PENGUMUMAN", page: 1, pageSize: SIDEBAR_FETCH_SIZE },
      process.env.UPLOAD_PUBLIC_URL ?? "",
    );
    if (!result.ok) return [];
    return result.data.items
      .filter((item) => item.id !== excludeId)
      .slice(0, SIDEBAR_DISPLAY_SIZE)
      .map((item) => ({
        id: item.id,
        href: `${ANNOUNCEMENTS_PATH}/${item.slug}`,
        title: item.translation.value.title,
        resolvedLocale: item.translation.resolvedLocale,
        dateLabel: formatJakartaPublishedDate(item.publishedAt, locale),
        dateTimeIso: item.publishedAt.toISOString(),
        cover: resolveCoverImageSrc(item.cover, siteOrigin),
      }));
  } catch {
    return [];
  }
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveAppLocale(rawLocale);
  setRequestLocale(locale);

  const t = await getTranslations("Post");
  const load = await loadPostDetail(locale, slug);

  if (load.kind === "unavailable") {
    return (
      <Container className="py-12 md:py-20">
        <PostStateNotice
          variant="unavailable"
          headingAs="h1"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </Container>
    );
  }

  if (!load.result.ok) {
    notFound();
  }

  const post = load.result.data;
  const sanitizedContent = sanitizeStoredContentOrNull(post.translation.value.content);
  const contentDir = LOCALE_DIRECTION[post.translation.resolvedLocale];

  const siteOrigin = validateSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const detailUrl = buildLocaleAlternates(`${ANNOUNCEMENTS_PATH}/${slug}`, locale, siteOrigin).canonical;
  const homeUrl = buildLocaleAlternates("/", locale, siteOrigin).canonical;
  const listUrl = buildLocaleAlternates(ANNOUNCEMENTS_PATH, locale, siteOrigin).canonical;
  const cover = resolveCoverImageSrc(post.cover, siteOrigin);
  const absoluteCoverUrl = cover.kind === "image" && siteOrigin ? new URL(cover.src, siteOrigin).toString() : null;

  const breadcrumbItems = [
    { label: t("breadcrumbHome"), href: "/" },
    { label: t("pengumuman.breadcrumbLabel"), href: ANNOUNCEMENTS_PATH },
    { label: post.translation.value.title, resolvedLocale: post.translation.resolvedLocale },
  ];

  const sidebarItems = await fetchSidebarItems(locale, post.id, siteOrigin);

  return (
    <Container className="py-12 md:py-20">
      {siteOrigin ? (
        <>
          <PostJsonLd
            data={buildBreadcrumbJsonLd([
              { name: t("breadcrumbHome"), url: homeUrl },
              { name: t("pengumuman.breadcrumbLabel"), url: listUrl },
              { name: post.translation.value.title, url: detailUrl },
            ])}
          />
          <PostJsonLd
            data={buildNewsArticleJsonLd({
              url: detailUrl,
              headline: post.translation.value.title,
              description: post.translation.value.excerpt ?? null,
              imageUrl: absoluteCoverUrl,
              datePublished: post.publishedAt.toISOString(),
              authorName: post.authorName,
            })}
          />
        </>
      ) : null}

      <PostBreadcrumb items={breadcrumbItems} ariaLabel={t("pengumuman.breadcrumbLabel")} />

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <article className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          {post.translation.isFallback ? <PostFallbackBanner message={t("fallbackNotice")} /> : null}

          <h1
            lang={post.translation.resolvedLocale}
            dir={contentDir}
            className="text-balance font-display text-3xl leading-tight font-bold break-words text-slate-900 md:text-4xl"
          >
            {post.translation.value.title}
          </h1>

          <PostMetaRow
            authorName={post.authorName}
            dateLabel={formatJakartaPublishedDate(post.publishedAt, locale)}
            dateTimeIso={post.publishedAt.toISOString()}
            categoryLabel={post.categorySlug ? humanizeCategorySlug(post.categorySlug) : null}
            readingLabel={
              sanitizedContent ? t("readingTime", { minutes: estimateReadingMinutes(sanitizedContent) }) : undefined
            }
          />

          <figure>
            <PostCoverImage
              cover={cover}
              sizes="(min-width: 1024px) 66vw, 100vw"
              priority
              className="aspect-video w-full rounded-xl"
            />
            {cover.kind === "image" && post.translation.value.coverCaption ? (
              <figcaption
                lang={post.translation.resolvedLocale}
                dir={contentDir}
                className="mt-2 text-[13px] break-words text-slate-500 italic"
              >
                {post.translation.value.coverCaption}
              </figcaption>
            ) : null}
          </figure>

          {sanitizedContent ? (
            <PostArticleBody html={sanitizedContent} resolvedLocale={post.translation.resolvedLocale} />
          ) : (
            <PostStateNotice
              variant="unavailable"
              headingAs="h2"
              title={t("unavailable.title")}
              description={t("unavailable.description")}
            />
          )}

          <PostImageGallery images={post.images} heading={t("galleryHeading")} />
        </article>

        <div className="min-w-0 lg:col-span-4">
          <PostSidebarLatest
            heading={t("sidebar.latestTitle")}
            items={sidebarItems}
            seeAllLabel={t("sidebar.seeAll")}
            seeAllHref={ANNOUNCEMENTS_PATH}
          />
        </div>
      </div>
    </Container>
  );
}
