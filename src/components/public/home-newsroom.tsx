import {ArrowRight, MapPin} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Reveal} from "@/components/public/reveal";
import {formatJakartaPublishedDate} from "@/components/public/post/format";
import {Container} from "@/components/ui/container";
import type {PublicPostView} from "@/contracts/post";
import type {PublicContentCardSchema} from "@/contracts/public-content";
import type {AppLocale} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";

type EventCard = z.infer<typeof PublicContentCardSchema>;

function compactDate(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, {day: "2-digit", month: "short", timeZone: "Asia/Jakarta"}).format(date);
}

function LedgerHeading({title, href, label}: {title: string; href: string; label: string}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-slate-900 pb-3">
      <h3 className="text-xl font-bold tracking-[-0.01em] text-slate-900 md:text-2xl">{title}</h3>
      <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-royal-700 hover:text-royal-500">
        {label}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

export async function HomeNewsroom({
  news,
  announcements,
  events,
  locale,
}: {
  news: readonly PublicPostView[];
  announcements: readonly PublicPostView[];
  events: readonly EventCard[];
  locale: AppLocale;
}) {
  const t = await getTranslations("Home");
  const [featured, ...rest] = news;
  if (!featured && announcements.length === 0 && events.length === 0) return null;

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-slate-300 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{t("newsroomEyebrow")}</p>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("newsTitle")}</h2>
          </div>
          <Link href="/berita" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-royal-700 hover:text-royal-500">
            {t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        {featured ? (
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              <Link href={`/berita/${featured.slug}`} className="group lg:col-span-8">
                <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-slate-200">
                  <ImageWithFallback
                    src={featured.cover?.url}
                    alt={featured.cover?.isDecorative ? "" : (featured.cover?.alt ?? featured.translation.value.title)}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    focalPoint={toFocalPoint(featured.cover)}
                  />
                </div>
                <p className="mt-4 text-xs tabular-nums tracking-[0.08em] text-slate-600">
                  <time dateTime={featured.publishedAt.toISOString()}>{formatJakartaPublishedDate(featured.publishedAt, locale)}</time>
                </p>
                <h3 className="mt-2 max-w-4xl text-2xl font-bold leading-snug tracking-[-0.015em] text-slate-900 transition-colors group-hover:text-royal-600 md:text-[28px]">
                  {featured.translation.value.title}
                </h3>
                {featured.translation.value.excerpt ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">{featured.translation.value.excerpt}</p> : null}
              </Link>
              <div className="border-t border-slate-900 lg:col-span-4">
                {rest.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/berita/${item.slug}`} className="group block border-b border-slate-300 py-5">
                    <span className="block font-semibold leading-snug text-slate-900 group-hover:text-royal-600">{item.translation.value.title}</span>
                    <time dateTime={item.publishedAt.toISOString()} className="mt-2 block text-xs text-slate-600">{formatJakartaPublishedDate(item.publishedAt, locale)}</time>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        ) : null}

        {(announcements.length > 0 || events.length > 0) ? (
          <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
            {announcements.length > 0 ? (
              <div>
                <LedgerHeading title={t("announcementsTitle")} href="/pengumuman" label={t("viewAll")} />
                {announcements.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/pengumuman/${item.slug}`} className="group grid min-h-24 grid-cols-[5.5rem_1fr] items-center gap-4 border-b border-slate-300 py-4">
                    <time dateTime={item.publishedAt.toISOString()} className="text-xs font-semibold uppercase tracking-[0.08em] text-royal-600">{compactDate(item.publishedAt, locale)}</time>
                    <span className="font-semibold leading-snug text-slate-900 group-hover:text-royal-600">{item.translation.value.title}</span>
                  </Link>
                ))}
              </div>
            ) : null}
            {events.length > 0 ? (
              <div>
                <LedgerHeading title={t("eventsTitle")} href="/agenda" label={t("viewAll")} />
                {events.slice(0, 3).map((item) => {
                  const startsAt = item.startsAt ? new Date(item.startsAt) : null;
                  return (
                    <Link key={item.id} href={`/agenda/${item.slug}`} className="group grid min-h-24 grid-cols-[5.5rem_1fr] items-center gap-4 border-b border-slate-300 py-4">
                      {startsAt ? <time dateTime={startsAt.toISOString()} className="text-xs font-semibold uppercase tracking-[0.08em] text-royal-600">{compactDate(startsAt, locale)}</time> : <span />}
                      <span>
                        <span className="block font-semibold leading-snug text-slate-900 group-hover:text-royal-600">{item.title}</span>
                        {item.badge ? <span className="mt-2 flex items-center gap-1 text-xs text-slate-600"><MapPin aria-hidden className="size-3.5" strokeWidth={1.5} />{item.badge}</span> : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
