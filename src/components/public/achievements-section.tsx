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
import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";

const LEVEL_MESSAGE_KEY: Record<string, string> = {
  INTERNASIONAL: "internasional", NASIONAL: "nasional", REGIONAL: "regional", LOKAL: "lokal",
};

async function LevelChip({levelKey}: {levelKey: string}) {
  const t = await getTranslations("Home");
  return (
    <span className="inline-flex items-center border-s-2 border-royal-500 ps-3 text-sm font-semibold text-royal-800">
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
    <section className={`${styles.section} bg-slate-100`} aria-labelledby="achievements-title">
      <Container>
        <HomeSectionHeading
          id="achievements-title"
          eyebrow={t("achievementsEyebrow")}
          title={title}
          description={description || t("achievementsDescription")}
          action={<HomeSectionLink href="/prestasi">{ctaLabel}</HomeSectionLink>}
        />
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:gap-12">
          <Link
            href={`/prestasi/${featured.slug}`}
            className={cn("group", rest.length ? "lg:col-span-7" : "grid items-center gap-8 lg:col-span-12 lg:grid-cols-2 lg:gap-12")}
          >
            <Reveal variant="image" className="!block !h-auto">
              <div className={`${styles.media} ${styles.ratioFeature}`}>
                <ImageWithFallback
                  src={featured.media?.url}
                  alt={featured.media?.isDecorative ? "" : (featured.media?.alt ?? featured.title)}
                  className="object-cover"
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  focalPoint={toFocalPoint(featured.media)}
                />
              </div>
            </Reveal>
            <Reveal index={1} className="!block !h-auto">
              <p className="mt-5"><LevelChip levelKey={featured.level} /></p>
              <h3 className="mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.22] tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-royal-800">
                {featured.title}
              </h3>
              <p className={styles.academicMeta}>
                <span className={styles.academicAuthor}>{featured.studentName}</span>
                {featured.achievedAt ? (
                  <time dateTime={new Date(featured.achievedAt).toISOString()}>
                    {formatJakartaPublishedDate(new Date(featured.achievedAt), locale)}
                  </time>
                ) : null}
              </p>
              <span className={`${styles.sectionLink} mt-4`}>{t("readMore")}<ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.75} /></span>
            </Reveal>
          </Link>

          {rest.length > 0 ? (
            <div className={`${styles.rowList} lg:col-span-5`}>
              {rest.map((achievement, index) => (
                <Reveal key={achievement.id} index={index + 1} className="!block !h-auto">
                  <Link href={`/prestasi/${achievement.slug}`} className={`${styles.rowLink} block group`}>
                    <span className="block"><LevelChip levelKey={achievement.level} /></span>
                    <span className="mt-3 block text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-royal-800 md:text-2xl">
                      {achievement.title}
                    </span>
                    <span className={styles.academicMeta}>
                      <span className={styles.academicAuthor}>{achievement.studentName}</span>
                      {achievement.achievedAt ? (
                        <time dateTime={new Date(achievement.achievedAt).toISOString()}>
                          {formatJakartaPublishedDate(new Date(achievement.achievedAt), locale)}
                        </time>
                      ) : null}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
