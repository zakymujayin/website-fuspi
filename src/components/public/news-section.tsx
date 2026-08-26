import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicPostView } from "@/contracts/post";
import { formatJakartaPublishedDate } from "@/components/public/post/format";

type NewsSectionProps = { items: readonly PublicPostView[]; locale: AppLocale };

export async function NewsSection({ items, locale }: NewsSectionProps) {
  const t = await getTranslations("Home");
  const [featured, ...rest] = items;
  const secondary = rest.slice(0, 4);

  if (!featured) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-b from-white to-royal-100/70 py-12 md:py-16">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="section-rule font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {t("newsTitle")}
          </h2>
          <Link
            href="/berita"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <Link
              href={`/berita/${featured.slug}`}
              className="group flex w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={featured.cover?.url}
                  alt={featured.cover?.isDecorative ? "" : (featured.cover?.alt ?? featured.translation.value.title)}
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  focalPoint={toFocalPoint(featured.cover)}
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-xl font-semibold leading-snug text-slate-900 group-hover:text-royal-700">
                  {featured.translation.value.title}
                </h3>
                {featured.translation.value.excerpt ? (
                  <p className="mt-3 line-clamp-2 max-w-[60ch] text-sm leading-relaxed text-slate-500">
                    {featured.translation.value.excerpt}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-slate-400">{formatJakartaPublishedDate(featured.publishedAt, locale)}</p>
              </div>
            </Link>
          </Reveal>

          <div className="flex flex-col gap-5 lg:col-span-2">
            {secondary.map((news, index) => (
              <Reveal key={news.id} index={index + 1}>
                <Link
                  href={`/berita/${news.slug}`}
                  className="group flex w-full flex-1 gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <ImageWithFallback
                      src={news.cover?.url}
                      alt={news.cover?.isDecorative ? "" : (news.cover?.alt ?? news.translation.value.title)}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="80px"
                      focalPoint={toFocalPoint(news.cover)}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="line-clamp-2 font-display text-sm font-semibold text-slate-900 group-hover:text-royal-700">
                      {news.translation.value.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatJakartaPublishedDate(news.publishedAt, locale)}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
