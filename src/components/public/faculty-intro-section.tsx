import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import type {PublicAcademicDirectoryItemSchema} from "@/contracts/academic";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";
import {ManuscriptMark, QuranMark, ReasoningMark} from "./institutional-icons";

type AcademicItem = z.infer<typeof PublicAcademicDirectoryItemSchema>;

/** Resolves a study program's official code (IAT/IH/AFI) from the frozen
 * institution contract; CMS rows carry the slug, not the code. */
const codeBySlug = new Map<string, string>(
  institution.studyPrograms.map((program) => [program.slug, program.code]),
);
const fieldByCode: Record<string, "quran" | "hadith" | "aqidah"> = {IAT: "quran", IH: "hadith", AFI: "aqidah"};
// IAT gets the mushaf, IH the ruled folio (the recorded text), AFI the lattice.
const marks = {IAT: QuranMark, IH: ManuscriptMark, AFI: ReasoningMark};

/**
 * The faculty identity moment. Copy and the study programs sit side by side so
 * the section reads as one statement instead of a heading floating above a
 * detached list, and the FUSPI lattice anchors the trailing edge.
 */
export async function FacultyIntroSection({
  programs,
  title,
  description,
}: {
  programs: readonly AcademicItem[];
  title?: string | null;
  description?: string | null;
}) {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const orderedPrograms = institution.studyPrograms.flatMap((contract) => programs.filter((program) => program.slug === contract.slug));
  // The CMS often names this section "Tentang FUSPI", which is exactly the
  // default eyebrow; showing both reads as a stutter, so the eyebrow yields.
  const heading = title || t("introTitle");
  const eyebrow = heading.trim().toLowerCase() === t("introLabel").trim().toLowerCase() ? null : t("introLabel");

  return (
    <section className={`${styles.section} ${styles.primary} ${styles.intro}`}>
      <Container>
        <div className={styles.introGrid}>
          <Reveal variant="fade" className="!block !h-auto">
            <HomeSectionHeading
              eyebrow={eyebrow}
              title={heading}
              description={description || t("introDescription")}
              accent
              action={<HomeSectionLink href="/profil">{t("introCtaProfile")}</HomeSectionLink>}
            />
            <p dir="ltr" className={styles.introSlogan}>{t("ctaSlogan")}</p>
          </Reveal>

          {orderedPrograms.length > 0 ? (
            <div>
              <HomeSectionHeading
                as="h3"
                title={tNav("studyPrograms")}
                compact
                action={<HomeSectionLink href="/prodi">{t("viewAll")}</HomeSectionLink>}
              />
              <div className={styles.programList}>
                {orderedPrograms.map((program, index) => {
                  const code = codeBySlug.get(program.slug) as keyof typeof marks;
                  const Mark = marks[code];
                  const summary = t(`advantage.${fieldByCode[code]}.description`);
                  return (
                    <Reveal key={program.id} index={index} className="!block !h-auto">
                      <Link href={`/prodi/${program.slug}`} className={`${styles.program} group`}>
                        <span className={styles.programIdentity}>
                          <Mark className="size-9" />
                          <span className={styles.programCode}>{code}</span>
                        </span>
                        <div>
                          <h4 className="text-slate-900 transition-colors group-hover:text-royal-800">{program.name}</h4>
                          <p className={styles.programDescription}>{summary}</p>
                        </div>
                        <ArrowRight aria-hidden className="size-5 text-royal-700 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" strokeWidth={1.75} />
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
