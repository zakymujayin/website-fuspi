import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import type {Metadata} from "next";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {BreadcrumbJsonLd} from "@/components/public/json-ld";
import {Container} from "@/components/ui/container";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

const PAGE_SELECT = {
  id: true, slug: true, status: true, createdAt: true, updatedAt: true,
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {locale: true, title: true, content: true, metaTitle: true, metaDesc: true},
  },
} as const;

type PageRow = {
  id: string; slug: string; status: string; createdAt: Date; updatedAt: Date;
  translations: ReadonlyArray<{locale: string; title: string; content: string; metaTitle: string | null; metaDesc: string | null}>;
};

function resolveLocale<T extends {locale: string}>(items: ReadonlyArray<T>, locale: string): T | undefined {
  return items.find((t) => t.locale === locale) ?? items.find((t) => t.locale === "id");
}

async function getPage(slug: string): Promise<PageRow | null> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.page.findMany({where: {slug, status: "PUBLISHED"}, select: PAGE_SELECT}) as PageRow[];
    return rows[0] ?? null;
  } catch { return null; }
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}): Promise<Metadata> {
  const {locale, slug} = await params;
  const page = await getPage(slug);
  if (!page) return {title: slug};
  const tl = resolveLocale(page.translations, locale);
  const url = `${SITE_URL}/${locale}/halaman/${slug}`;
  return {
    title: tl?.metaTitle ?? tl?.title ?? slug,
    description: tl?.metaDesc ?? undefined,
    openGraph: {
      type: "article",
      url,
      siteName: "FUSPI",
      modifiedTime: page.updatedAt.toISOString(),
    },
    alternates: {
      languages: {id: `${SITE_URL}/id/halaman/${slug}`, en: `${SITE_URL}/en/halaman/${slug}`, ar: `${SITE_URL}/ar/halaman/${slug}`},
    },
  };
}

export default async function PageDetail({params}: {params: Promise<{locale: AppLocale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("Nav");
  const page = await getPage(slug);
  if (!page) notFound();

  const tl = resolveLocale(page.translations, locale);
  if (!tl) notFound();
  const url = `${SITE_URL}/${locale}/halaman/${slug}`;

  return (
    <Container className="py-12 md:py-20">
      <BreadcrumbJsonLd items={[
        {name: "FUSPI", url: `${SITE_URL}/${locale}`},
        {name: tl.title, url},
      ]} />
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mx-auto mb-6 max-w-3xl"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tl.title},
        ]}
      />
      <article className="mx-auto max-w-3xl">
        <SectionHeading as="h1" title={tl.title} />
        <div
          className="rich-text mt-8"
          dangerouslySetInnerHTML={{__html: tl.content}}
        />
      </article>
    </Container>
  );
}
