import { ArrowRight, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { formatJakartaPublishedDate } from "@/components/public/post/format";
import { Reveal } from "@/components/public/reveal";
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
 * Photo-led plaque, not an image-then-text-panel card: the portrait fills
 * the whole tile and the name/title sit directly on it under a gradient, so
 * every item stays equal weight (no card enlarged over the others) while
 * still reading as a different treatment than Columns' image-over-white-
 * panel cards or Facilities' gallery tiles.
 */
export async function AchievementsSection({ items, locale, title, description, ctaLabel }: AchievementsSectionProps) {
  const t = await getTranslations("Home");

  if (items.length === 0) return null;

  return (
    // Royal blue, not navy: docs/03-design-system.md locks royal-500 as the
    // primary identity color and reserves navy for header/footer depth.
    <section className="relative overflow-hidden border-t border-slate-200 bg-gradient-to-br from-royal-800 to-royal-950 py-12 md:py-16">
      {/* Soft glow, not a shape: a radial-gradient blob fades to nothing at
          its own edges, so there's no hard boundary line cutting across
          the band. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 70% at 90% 10%, rgba(214,180,94,0.22), transparent 60%)",
        }}
      />
      <Container className="relative">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-brass-400 uppercase">
              <Trophy aria-hidden className="size-3.5" strokeWidth={1.5} />
              {t("achievementsEyebrow")}
            </span>
            <h2 className="section-rule mt-2 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
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
          {items.map((achievement, index) => (
            <Reveal key={achievement.id} index={index}>
              <Link
                href={`/prestasi/${achievement.slug}`}
                className="group relative flex aspect-[3/4] w-full flex-1 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 transition-all duration-200 hover:-translate-y-1"
              >
                <ImageWithFallback src={achievement.media?.url} alt="" className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" focalPoint={toFocalPoint(achievement.media)} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-transparent" />
                <span className={cn("absolute start-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold", LEVEL_BADGE[achievement.level] ?? "bg-navy-800 text-white")}>
                  {t(`achievementLevel.${LEVEL_MESSAGE_KEY[achievement.level] ?? "lokal"}`)}
                </span>
                <div className="relative flex flex-col gap-1.5 p-5">
                  <p className="truncate text-xs font-semibold text-white/80">{achievement.studentName}</p>
                  <h3 className="font-display text-base font-bold leading-snug text-balance text-white group-hover:text-brass-300">
                    {achievement.title}
                  </h3>
                  {achievement.achievedAt ? (
                    <p className="text-xs text-slate-300">
                      {formatJakartaPublishedDate(new Date(achievement.achievedAt), locale)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
