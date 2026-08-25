import { ArrowRight, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicPostView } from "@/contracts/post";
import type { PublicContentCardSchema } from "@/contracts/public-content";

type EventCard = z.infer<typeof PublicContentCardSchema>;

function monthShort(date: Date, locale: AppLocale) {
  if (locale === "ar") return date.toLocaleString("ar", { month: "short" });
  if (locale === "en") return date.toLocaleString("en", { month: "short" });
  return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][date.getMonth()];
}

function dayNumber(date: Date) {
  return String(date.getDate()).padStart(2, "0");
}

type AnnouncementsAgendaSectionProps = {
  locale: AppLocale;
  announcements: readonly PublicPostView[];
  events: readonly EventCard[];
};

export async function AnnouncementsAgendaSection({ locale, announcements, events }: AnnouncementsAgendaSectionProps) {
  const t = await getTranslations("Home");

  if (announcements.length === 0 && events.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-slate-50 via-slate-50 to-royal-50/60 py-12 md:py-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2">
          {announcements.length > 0 && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">{t("announcementsTitle")}</h2>
                <Link
                  href="/pengumuman"
                  className="inline-flex items-center gap-1 text-xs font-medium text-royal-600 hover:text-royal-700"
                >
                  {t("viewAll")}
                  <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                </Link>
              </div>
              <div className="space-y-3">
                {announcements.map((item) => (
                  <Link
                    key={item.id}
                    href={`/pengumuman/${item.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <time className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-royal-100 bg-gradient-to-b from-royal-50 to-white px-3 py-2 text-center">
                      <span className="text-xs font-medium uppercase text-royal-500">{monthShort(item.publishedAt, locale)}</span>
                      <span className="font-display text-lg font-bold text-royal-700">{dayNumber(item.publishedAt)}</span>
                    </time>
                    <h3 className="line-clamp-2 text-sm font-medium text-slate-700 group-hover:text-royal-700">
                      {item.translation.value.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">{t("eventsTitle")}</h2>
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-1 text-xs font-medium text-royal-600 hover:text-royal-700"
                >
                  {t("viewAll")}
                  <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                </Link>
              </div>
              <div className="space-y-3">
                {events.map((item) => {
                  const startsAt = item.startsAt ? new Date(item.startsAt) : null;
                  return (
                    <Link
                      key={item.id}
                      href={`/agenda/${item.slug}`}
                      className="group flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {startsAt ? (
                        <time className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-royal-100 bg-gradient-to-b from-royal-50 to-white px-3 py-2 text-center">
                          <span className="text-xs font-medium uppercase text-royal-500">{monthShort(startsAt, locale)}</span>
                          <span className="font-display text-lg font-bold text-royal-700">{dayNumber(startsAt)}</span>
                        </time>
                      ) : null}
                      <div>
                        <h3 className="line-clamp-2 text-sm font-medium text-slate-700 group-hover:text-royal-700">
                          {item.title}
                        </h3>
                        {item.badge ? (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                            <MapPin aria-hidden className="size-3" strokeWidth={1.5} />
                            {item.badge}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
