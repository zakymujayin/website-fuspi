import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Reveal} from "@/components/public/reveal";
import {formatJakartaPublishedDate} from "@/components/public/post/format";
import {Container} from "@/components/ui/container";
import type {PublicHomeAchievement} from "@/features/achievement/domain";
import type {AppLocale} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";

const LEVEL_MESSAGE_KEY: Record<string, string> = {
  INTERNASIONAL: "internasional", NASIONAL: "nasional", REGIONAL: "regional", LOKAL: "lokal",
};

async function LevelChip({levelKey}: {levelKey: string}) {
  const t = await getTranslations("Home");
  return (
    <span className="inline-flex items-center rounded-full bg-royal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-royal-700">
      {t(`achievementLevel.${LEVEL_MESSAGE_KEY[levelKey] ?? "lokal"}`)}
    </span>
  );
}

export async function AchievementsSection({
  items,
  locale,
  title,
  description,
  ctaLabel,
}: {
  items: readonly PublicHomeAchievement[];
  locale: AppLocale;
  title: string;
  description: string | null;
  ctaLabel: string;
}) {
  const t = await getTranslations("Home");
  const [featured, ...rest] = items.slice(0, 4);
  if (!featured) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div className="mb-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{t("achievementsEyebrow")}</p>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{title}</h2>
          </div>
          <div className="flex flex-col items-start justify-end lg:col-span-4">
            {description ? <p className="max-w-md text-sm leading-6 text-slate-600">{description}</p> : null}
            <Link href="/prestasi" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-royal-700 hover:text-royal-500">
              {ctaLabel}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-12">
            <Link href={`/prestasi/${featured.slug}`} className="group lg:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-200">
                <ImageWithFallback
                  src={featured.media?.url}
                  alt={featured.media?.isDecorative ? "" : (featured.media?.alt ?? featured.title)}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  focalPoint={toFocalPoint(featured.media)}
                />
              </div>
              <p className="mt-4">
                <LevelChip levelKey={featured.level} />
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-snug tracking-[-0.015em] text-slate-900 group-hover:text-royal-600 md:text-[28px]">{featured.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{featured.studentName}</p>
            </Link>
            <div className="lg:col-span-5">
              <div className="border-t border-slate-900">
                {rest.map((achievement) => (
                  <Link key={achievement.id} href={`/prestasi/${achievement.slug}`} className="group block border-b border-slate-300 py-6">
                    <span className="block"><LevelChip levelKey={achievement.level} /></span>
                    <span className="mt-3 block text-xl font-bold leading-snug text-slate-900 group-hover:text-royal-600 md:text-2xl">{achievement.title}</span>
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{achievement.studentName}</span>
                      {achievement.achievedAt ? <time dateTime={new Date(achievement.achievedAt).toISOString()}>{formatJakartaPublishedDate(new Date(achievement.achievedAt), locale)}</time> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
