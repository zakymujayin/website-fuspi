import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {PostCardHorizontal} from "@/components/public/post/post-card-horizontal";
import type {ResolvedCoverImage} from "@/components/public/post/cover-image";
import {getPrismaClient} from "@/lib/db/client";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";
import {ArrowRight} from "lucide-react";

const POST_SELECT = {
  id: true, slug: true, publishedAt: true,
  author: {select: {name: true}},
  category: {select: {slug: true, translations: {where: {status: "PUBLISHED" as const}}}},
  coverMedia: {select: {id: true, storageKey: true, storageClass: true, mimeType: true, alt: true, isDecorative: true, width: true, height: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, title: true, excerpt: true}},
} as const;

type Row = {id: string; slug: string; publishedAt: Date | null; author: {name: string} | null;
  category: {slug: string; translations: ReadonlyArray<{locale: string; title: string}>} | null;
  coverMedia: {id: string; storageKey: string; storageClass: string; mimeType: string; alt: string | null; isDecorative: boolean; width: number | null; height: number | null} | null;
  translations: ReadonlyArray<{locale: string; title: string; excerpt: string | null}>;};

const PLACEHOLDER: ResolvedCoverImage = {kind: "placeholder"};

function coverView(m: Row["coverMedia"]): ResolvedCoverImage {
  if (!m || m.storageClass !== "PUBLIC") return PLACEHOLDER;
  return {kind: "image", src: `/uploads/${m.storageKey}`, width: m.width ?? 1200, height: m.height ?? 630, alt: m.alt ?? "", isDecorative: m.isDecorative};
}

function resolveLocale<T extends {locale: string}>(items: ReadonlyArray<T>, requested: AppLocale): T | undefined {
  return items.find((t) => t.locale === requested) ?? items.find((t) => t.locale === "id");
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][d.getMonth()]} ${d.getFullYear()}`;
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("announcements")};
}

export default async function AnnouncementsPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  let rows: Row[] = [];
  try {
    const prisma = getPrismaClient();
    rows = await prisma.post.findMany({where: {status: "PUBLISHED", type: "PENGUMUMAN"}, orderBy: {publishedAt: "desc"}, take: 20, select: POST_SELECT}) as Row[];
  } catch {}

  return (
    <Container className="py-12 md:py-20">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition-colors hover:text-royal-600">{tNav("home")}</Link>
        <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
        <span className="text-slate-800">{tNav("announcements")}</span>
      </nav>
      <SectionHeading as="h1" title={t("announcementsTitle")} />
      {rows.length > 0 ? (
        <div className="mt-10 flex flex-col divide-y divide-slate-100">
          {rows.map((p) => {
            const tl = resolveLocale(p.translations, locale);
            const catTl = resolveLocale(p.category?.translations ?? [], locale);
            return (
              <PostCardHorizontal key={p.id}
                href={`/pengumuman/${p.slug}`} title={tl?.title ?? ""} excerpt={tl?.excerpt ?? null}
                resolvedLocale={locale} cover={coverView(p.coverMedia)}
                authorName={p.author?.name ?? null}
                dateLabel={p.publishedAt ? formatDate(p.publishedAt) : ""}
                dateTimeIso={p.publishedAt?.toISOString().slice(0, 10) ?? ""}
                categoryLabel={catTl?.title ?? null} />
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{t("noContent")}</p>
        </div>
      )}
    </Container>
  );
}
