import { ArrowRight, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { formatJakartaPublishedDate } from "@/components/public/post/format";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicHomeAchievement } from "@/features/achievement/domain";
import { cn } from "@/lib/utils";

/* Gradient stops all stay within the WCAG-AA-safe ranges verified earlier
   for this palette: royal-500 and up with white text, brass-400/500 only
   with dark navy text (brass-600 and royal-400 both drop below 4.5:1). */
const LEVEL_BADGE: Record<string, string> = {
  INTERNASIONAL: "bg-gradient-to-r from-brass-400 to-brass-500 text-navy-900",
  NASIONAL: "bg-gradient-to-r from-royal-700 to-royal-600 text-white",
  REGIONAL: "bg-gradient-to-r from-royal-500 to-royal-600 text-white",
  LOKAL: "bg-gradient-to-r from-navy-800 to-navy-900 text-white",
};
const LEVEL_MESSAGE_KEY: Record<string, string> = {
  INTERNASIONAL: "internasional", NASIONAL: "nasional", REGIONAL: "regional", LOKAL: "lokal",
};

type AchievementsSectionProps = {
  items: readonly PublicHomeAchievement[];
  locale: AppLocale;
  title: string;
  description: string | null;
  ctaLabel: string;
};

/**
 * A static, centered grid — not a scroll carousel. At the homepage's 3-4
 * item count a carousel reads as arbitrary rather than deliberate, and a
 * flex scroll-row can't center content without breaking scrolling (it
 * silently reverts to start-aligned once `overflow-x-auto` is present).
 * The plaque-card look (avatar + level badge, dark navy band) is kept as
 * the section's own identity so it still doesn't read as another
 * photo-grid like Facilities/Columns.
 */
export async function AchievementsSection({ items, locale, title, description, ctaLabel }: AchievementsSectionProps) {
  const t = await getTranslations("Home");

  if (items.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-navy-900 to-navy-950 py-12 md:py-16">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-brass-400 uppercase">
              <Trophy aria-hidden className="size-3.5" strokeWidth={1.5} />
              {t("achievementsEyebrow")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
              {title}
            </h2>
            {description ? <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p> : null}
          </div>
          <Link
            href="/prestasi"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brass-400 transition-colors hover:text-brass-300"
          >
            {ctaLabel}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((achievement) => (
            <Link
              key={achievement.id}
              href={`/prestasi/${achievement.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-brass-400/40 hover:bg-white/10"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <ImageWithFallback src={achievement.media?.url} alt="" className="object-cover" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                <span className={cn("absolute start-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold", LEVEL_BADGE[achievement.level] ?? "bg-navy-800 text-white")}>
                  {t(`achievementLevel.${LEVEL_MESSAGE_KEY[achievement.level] ?? "lokal"}`)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="truncate text-sm font-semibold text-white">{achievement.studentName}</p>
                <h3 className="flex-1 font-display text-lg font-bold leading-snug text-balance text-white group-hover:text-brass-300">
                  {achievement.title}
                </h3>
                {achievement.achievedAt ? (
                  <p className="text-xs text-slate-400">
                    {formatJakartaPublishedDate(new Date(achievement.achievedAt), locale)}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
