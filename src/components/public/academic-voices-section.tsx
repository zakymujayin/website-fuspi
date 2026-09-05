import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {LecturerRail, type LecturerRailItem} from "@/components/public/lecturer-rail";
import {Reveal} from "@/components/public/reveal";
import {formatJakartaPublishedDate} from "@/components/public/post/format";
import {Container} from "@/components/ui/container";
import type {PublicAcademicDirectoryItemSchema} from "@/contracts/academic";
import type {PublicPostView} from "@/contracts/post";
import type {AppLocale} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";

type Lecturer = z.infer<typeof PublicAcademicDirectoryItemSchema>;
type ColumnGroup = {role: "DEKAN" | "DOSEN" | "MAHASISWA"; items: readonly PublicPostView[]};
const ROLE_KEY = {DEKAN: "dean", DOSEN: "lecturer", MAHASISWA: "student"} as const;

// Existing, supplied leadership portraits; CMS media remains the first choice.
const leadershipPortraits = [
  {name: "Masrukhin Muhsin", url: "/images/leadership/wd1-masrukhin.webp"},
  {name: "Endang Saeful Anwar", url: "/images/leadership/wd2-endang.webp"},
  {name: "Ade Fakih Kurniawan", url: "/images/leadership/wd3-ade-fakih.webp"},
  {name: "Ade Faqih Kurniawan", url: "/images/leadership/wd3-ade-fakih.webp"},
] as const;
const portraitFor = (lecturer: Lecturer) => lecturer.photo?.url ?? leadershipPortraits.find((portrait) => lecturer.name.includes(portrait.name))?.url ?? null;

export async function AcademicVoicesSection({
  groups,
  lecturers,
  locale,
}: {
  groups: readonly ColumnGroup[];
  lecturers: readonly Lecturer[];
  locale: AppLocale;
}) {
  const t = await getTranslations("Home");
  const columns = groups.flatMap((group) => group.items.slice(0, 2).map((item) => ({...item, role: group.role})));
  const [featured, ...rest] = columns;
  // Profiles with a portrait lead the rail so the first page always reads as curated.
  const rail: LecturerRailItem[] = [...lecturers]
    .sort((a, b) => Number(Boolean(portraitFor(b))) - Number(Boolean(portraitFor(a))))
    .slice(0, 9)
    .map((lecturer) => ({
      id: lecturer.id,
      slug: lecturer.slug,
      name: lecturer.name,
      role: lecturer.secondaryText ?? null,
      program: lecturer.studyProgram?.name ?? null,
      photoUrl: portraitFor(lecturer),
      photoAlt: lecturer.photo?.isDecorative ? "" : (lecturer.photo?.alt ?? lecturer.name),
    }));

  if (!featured && rail.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.primary} ${styles.academic}`} aria-labelledby="academic-title">
      <Container>
        <HomeSectionHeading
          id="academic-title"
          eyebrow={t("columnsEyebrow")}
          title={t("columnsTitle")}
          description={t("columnsDescription")}
          accent
          action={<HomeSectionLink href="/kolom">{t("viewAll")}</HomeSectionLink>}
        />

        {featured ? (
          <div className="grid w-full gap-10 lg:grid-cols-12 lg:gap-12">
            <Reveal variant="image" className={rest.length ? "lg:col-span-7" : "lg:col-span-12"}>
              <Link href={`/kolom/${featured.slug}`} className={`group w-full ${styles.academicFeature}`}>
                <div className={`${styles.media} ${styles.ratioWide}`}>
                  <ImageWithFallback
                    src={featured.cover?.url}
                    alt={featured.cover?.isDecorative ? "" : (featured.cover?.alt ?? featured.translation.value.title)}
                    className="object-cover"
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    focalPoint={toFocalPoint(featured.cover)}
                  />
                </div>
                <p className={`${styles.academicKicker} mt-5`}>{t(`columnRole.${ROLE_KEY[featured.role]}`)}</p>
                <h3 className="mt-3 max-w-3xl text-[clamp(1.625rem,2.6vw,2.125rem)] font-bold leading-[1.22] tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-royal-800">
                  {featured.translation.value.title}
                </h3>
                {featured.translation.value.excerpt ? (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{featured.translation.value.excerpt}</p>
                ) : null}
                <p className={styles.academicMeta}>
                  <span className={styles.academicAuthor}>{featured.authorName}</span>
                  <time dateTime={featured.publishedAt.toISOString()}>{formatJakartaPublishedDate(featured.publishedAt, locale)}</time>
                </p>
              </Link>
            </Reveal>

            {rest.length > 0 ? (
              <div className={`${styles.rowList} lg:col-span-5`}>
                {rest.slice(0, 3).map((column, index) => (
                  <Reveal key={column.id} index={index + 1} className="!block !h-auto">
                    <Link href={`/kolom/${column.slug}`} className={`${styles.rowLink} block group`}>
                      <span className={styles.academicKicker}>{t(`columnRole.${ROLE_KEY[column.role]}`)}</span>
                      <span className="mt-2 block text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-royal-800 md:text-xl">
                        {column.translation.value.title}
                      </span>
                      <span className={styles.academicMeta}>
                        <span className={styles.academicAuthor}>{column.authorName}</span>
                        <time dateTime={column.publishedAt.toISOString()}>{formatJakartaPublishedDate(column.publishedAt, locale)}</time>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {rail.length > 0 ? (
          <div className={styles.railDivide}>
            <HomeSectionHeading
              as="h3"
              title={t("lecturersTitle")}
              description={t("lecturersDescription")}
              compact
              action={<HomeSectionLink href="/dosen">{t("viewAll")}</HomeSectionLink>}
            />
            <LecturerRail items={rail} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
