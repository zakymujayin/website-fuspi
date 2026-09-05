import {MapPin} from "lucide-react";
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
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";

type EventCard = z.infer<typeof PublicContentCardSchema>;

function compactDate(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, {day: "2-digit", month: "short", timeZone: "Asia/Jakarta"}).format(date);
}

function LedgerHeading({title, href, label}: {title: string; href: string; label: string}) {
  return <HomeSectionHeading as="h3" title={title} compact action={<HomeSectionLink href={href}>{label}</HomeSectionLink>} />;
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
    <section className={`${styles.section} ${styles.primary} bg-white`} aria-labelledby="newsroom-title">
      <Container>
        <HomeSectionHeading
          id="newsroom-title"
          eyebrow={t("newsroomEyebrow")}
          title={t("newsTitle")}
          action={<HomeSectionLink href="/berita">{t("viewAll")}</HomeSectionLink>}
        />

        {featured ? (
          <div className="grid w-full gap-8 lg:grid-cols-12 lg:gap-12">
            <Reveal variant="image" className="lg:col-span-7">
              <Link href={`/berita/${featured.slug}`} className="group w-full">
                <div className={`${styles.media} ${styles.ratioWide}`}>
                  <ImageWithFallback
                    src={featured.cover?.url}
                    alt={featured.cover?.isDecorative ? "" : (featured.cover?.alt ?? featured.translation.value.title)}
                    className="object-cover"
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    focalPoint={toFocalPoint(featured.cover)}
                  />
                </div>
                <p className="mt-4 text-sm tabular-nums text-slate-600">
                  <time dateTime={featured.publishedAt.toISOString()}>{formatJakartaPublishedDate(featured.publishedAt, locale)}</time>
                </p>
                <h3 className="mt-2 max-w-4xl text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.22] tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-royal-800">
                  {featured.translation.value.title}
                </h3>
                {featured.translation.value.excerpt ? (
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">{featured.translation.value.excerpt}</p>
                ) : null}
              </Link>
            </Reveal>

            <div className={`${styles.rowList} lg:col-span-5`}>
              {rest.slice(0, 3).map((item, index) => (
                <Reveal key={item.id} index={index + 1} className="!block !h-auto">
                  <Link href={`/berita/${item.slug}`} className={`${styles.rowLink} group grid grid-cols-[1fr_5rem] items-start gap-4 sm:grid-cols-[1fr_6.5rem]`}>
                    <span>
                      <span className="block text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-royal-800">
                        {item.translation.value.title}
                      </span>
                      <time dateTime={item.publishedAt.toISOString()} className="mt-3 block text-sm text-slate-700">
                        {formatJakartaPublishedDate(item.publishedAt, locale)}
                      </time>
                    </span>
                    {item.cover ? (
                      <span className={`${styles.media} block aspect-square`}>
                        <ImageWithFallback
                          src={item.cover.url}
                          alt={item.cover.isDecorative ? "" : item.cover.alt}
                          className="object-cover"
                          sizes="104px"
                          focalPoint={toFocalPoint(item.cover)}
                        />
                      </span>
                    ) : null}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}

        {(announcements.length > 0 || events.length > 0) ? (
          <div className="mt-14 grid gap-10 rounded-md bg-slate-50 p-6 sm:p-8 lg:grid-cols-2 lg:gap-14">
            {announcements.length > 0 ? (
              <div>
                <LedgerHeading title={t("announcementsTitle")} href="/pengumuman" label={t("viewAll")} />
                <div className={styles.rowList}>
                  {announcements.slice(0, 3).map((item) => (
                    <Link key={item.id} href={`/pengumuman/${item.slug}`} className={`${styles.rowLink} group grid min-h-20 grid-cols-[5.5rem_1fr] items-center gap-4`}>
                      <time dateTime={item.publishedAt.toISOString()} className="text-sm font-semibold uppercase tracking-[0.08em] text-royal-700">
                        {compactDate(item.publishedAt, locale)}
                      </time>
                      <span className="font-semibold leading-snug text-slate-900 transition-colors group-hover:text-royal-800">
                        {item.translation.value.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {events.length > 0 ? (
              <div>
                <LedgerHeading title={t("eventsTitle")} href="/agenda" label={t("viewAll")} />
                <div className={styles.rowList}>
                  {events.slice(0, 3).map((item) => {
                    const startsAt = item.startsAt ? new Date(item.startsAt) : null;
                    return (
                      <Link key={item.id} href={`/agenda/${item.slug}`} className={`${styles.rowLink} group grid min-h-20 grid-cols-[5.5rem_1fr] items-center gap-4`}>
                        {startsAt ? (
                          <time dateTime={startsAt.toISOString()} className="text-sm font-semibold uppercase tracking-[0.08em] text-royal-700">
                            {compactDate(startsAt, locale)}
                          </time>
                        ) : <span />}
                        <span>
                          <span className="block font-semibold leading-snug text-slate-900 transition-colors group-hover:text-royal-800">{item.title}</span>
                          {item.badge ? (
                            <span className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                              <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />{item.badge}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
