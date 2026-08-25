import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";
import type { PublicContentDetail } from "@/contracts/public-content";

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
      resource: "ALBUM",
      slug,
      locale,
    });
    if (!result.ok) return {};
    const album = result.data as Extract<PublicContentDetail, { resource: "ALBUM" }>;
    return {
      title: album.translation.title,
      description: album.translation.description ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function AlbumDetailPage({
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
    resource: "ALBUM",
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

  const album = result.data as Extract<PublicContentDetail, { resource: "ALBUM" }>;
  const contentDir = album.translation.resolvedLocale === "ar" ? "rtl" : "ltr";

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mx-auto mb-6 max-w-5xl"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("album.listTitle"), href: "/album"},
          {label: album.translation.title, resolvedLocale: album.translation.resolvedLocale},
        ]}
      />
      <article
        lang={album.translation.resolvedLocale}
        dir={contentDir}
        className="mx-auto max-w-5xl"
      >
        <SectionHeading
          as="h1"
          title={album.translation.title}
          description={album.translation.description ?? undefined}
        />

        {album.eventDate ? (
          <time
            dateTime={album.eventDate}
            className="mt-4 inline-block text-sm text-slate-500"
          >
            {new Date(album.eventDate).toLocaleDateString(
              album.translation.resolvedLocale === "ar" ? "ar-SA" : locale,
              { year: "numeric", month: "long", day: "numeric" },
            )}
          </time>
        ) : null}

        {album.cover ? (
          <figure className="mt-8">
            <Image
              src={album.cover.url}
              alt={album.cover.isDecorative ? "" : album.cover.alt}
              width={album.cover.width ?? 640}
              height={album.cover.height ?? 360}
              className="w-full rounded-xl object-cover"
              style={{ aspectRatio: "16/9" }}
            />
          </figure>
        ) : null}

        {album.photos.length > 0 ? (
          <div className="mt-10">
            <h2 className="section-rule font-display text-xl font-bold text-slate-900">
              {t("album.photos")}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {album.photos.map((photo) => (
                <figure key={`${photo.media.id}-${photo.order}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="aspect-[4/3] overflow-hidden">
                    <Image
                      src={photo.media.url}
                      alt={photo.media.isDecorative ? "" : photo.media.alt}
                      width={photo.media.width ?? 480}
                      height={photo.media.height ?? 360}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  {photo.caption ? (
                    <figcaption className="px-4 py-3 text-sm text-slate-600">
                      {photo.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        ) : null}

        {album.translation.isFallback ? (
          <p className="mt-6 text-sm text-amber-700">
            {t("fallbackNotice")}
          </p>
        ) : null}
      </article>
    </Container>
  );
}
