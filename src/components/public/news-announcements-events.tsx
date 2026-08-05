import { ArrowRight, Calendar, MapPin } from "lucide-react";
import NextImage from "next/image";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { dummyAnnouncements } from "@/lib/data/dummy-announcements";
import { dummyEvents } from "@/lib/data/dummy-events";
import { dummyNews } from "@/lib/data/dummy-news";

function formatDate(dateString: string, locale: AppLocale) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ][d.getMonth()];
  const year = d.getFullYear();
  if (locale === "ar") {
    return `${year}/${String(d.getMonth() + 1).padStart(2, "0")}/${day}`;
  }
  if (locale === "en") {
    return `${month} ${day}, ${year}`;
  }
  return `${day} ${month} ${year}`;
}

function monthShort(dateString: string, locale: AppLocale) {
  const d = new Date(dateString);
  if (locale === "ar") {
    return d.toLocaleString("ar", {month: "short"});
  }
  if (locale === "en") {
    return d.toLocaleString("en", {month: "short"});
  }
  return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getMonth()];
}

function dayNumber(dateString: string) {
  const d = new Date(dateString);
  return String(d.getDate()).padStart(2, "0");
}

export async function NewsAnnouncementsEvents({locale}: {locale: AppLocale}) {
  const t = await getTranslations("Home");

  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-3">
          {/* News */}
          <div className="lg:col-span-1">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">{t("newsTitle")}</h2>
              <Link
                href="/berita"
                className="inline-flex items-center gap-1 text-xs font-medium text-royal-600 hover:text-royal-700"
              >
                {t("viewAll")}
                <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="space-y-5">
              {dummyNews.slice(0, 3).map((news) => {
                const title = news.title[locale] ?? news.title.id;
                const category = news.category[locale] ?? news.category.id;
                return (
                  <Link
                    key={news.id}
                    href={`/berita/${news.slug}`}
                    className="group flex gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
                      <NextImage
                        src={news.image}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="80px"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-royal-600">
                        {category}
                      </span>
                      <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold text-slate-900 group-hover:text-royal-700">
                        {title}
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatDate(news.date, locale)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Announcements */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">{t("announcementsTitle")}</h2>
              <Link
                href="/pengumuman"
                className="inline-flex items-center gap-1 text-xs font-medium text-royal-600 hover:text-royal-700"
              >
                {t("viewAll")}
                <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="space-y-3">
              {dummyAnnouncements.map((item) => {
                const title = item.title[locale] ?? item.title.id;
                return (
                  <Link
                    key={item.id}
                    href={`/pengumuman/${item.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <time className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                      <span className="text-[10px] font-medium uppercase text-slate-400">
                        {monthShort(item.date, locale)}
                      </span>
                      <span className="font-display text-lg font-bold text-slate-700">
                        {dayNumber(item.date)}
                      </span>
                    </time>
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-700 group-hover:text-royal-700">
                      {title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">{t("eventsTitle")}</h2>
              <Link
                href="/agenda"
                className="inline-flex items-center gap-1 text-xs font-medium text-royal-600 hover:text-royal-700"
              >
                {t("viewAll")}
                <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="space-y-3">
              {dummyEvents.map((item) => {
                const title = item.title[locale] ?? item.title.id;
                const location = item.location[locale] ?? item.location.id;
                return (
                  <Link
                    key={item.id}
                    href={`/agenda/${item.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <time className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                      <span className="text-[10px] font-medium uppercase text-slate-400">
                        {monthShort(item.date, locale)}
                      </span>
                      <span className="font-display text-lg font-bold text-slate-700">
                        {dayNumber(item.date)}
                      </span>
                    </time>
                    <div>
                      <h3 className="line-clamp-2 text-sm font-medium text-slate-700 group-hover:text-royal-700">
                        {title}
                      </h3>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Calendar aria-hidden className="size-3" strokeWidth={1.5} />
                        {item.time}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin aria-hidden className="size-3" strokeWidth={1.5} />
                        {location}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
