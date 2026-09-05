import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import type {PublicAcademicDirectoryItemSchema} from "@/contracts/academic";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {ManuscriptMark, ReasoningMark, TransmissionMark} from "./institutional-icons";

type AcademicItem = z.infer<typeof PublicAcademicDirectoryItemSchema>;

/** Resolves a study program's official code (IAT/IH/AFI) from the frozen
 * institution contract; CMS rows carry the slug, not the code. */
const codeBySlug = new Map<string, string>(
  institution.studyPrograms.map((program) => [program.slug, program.code]),
);
const fieldByCode: Record<string, "quran" | "hadith" | "aqidah"> = {IAT: "quran", IH: "hadith", AFI: "aqidah"};
const marks = {IAT: ManuscriptMark, IH: TransmissionMark, AFI: ReasoningMark};

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

  return (
    <section className={`${styles.section} ${styles.primary} ${styles.intro}`}>
      <Container>
        <Reveal variant="fade" className="!block">
        <div className="grid items-end gap-6 border-b border-royal-200 pb-8 md:grid-cols-2 md:gap-12">
          <h2 className="max-w-xl font-bold text-slate-900">
            {title || t("introTitle")}
          </h2>
          <div>
            <p className="max-w-xl text-lg leading-8 text-slate-700">
              {description || t("introDescription")}
            </p>
            <Link href="/profil" className="mt-3 inline-flex min-h-11 items-center gap-2 border-b border-royal-500 text-sm font-semibold text-royal-800 transition-colors hover:text-navy-950">
              {t("introCtaProfile")}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        </Reveal>
        {orderedPrograms.length > 0 ? (
          <>
            <h3 className="mb-4 mt-8 text-lg font-semibold text-royal-800">{tNav("studyPrograms")}</h3>
            <div className="border-t-2 border-royal-500">
              {orderedPrograms.map((program, index) => {
                const Mark = marks[codeBySlug.get(program.slug) as keyof typeof marks];
                return (
                <Reveal key={program.id} index={index} className="w-full">
                  <Link
                    href={`/prodi/${program.slug}`}
                    className={`${styles.program} group w-full`}
                  >
                    <span className={styles.programIdentity}><Mark className="size-10 md:size-12" /><span className="text-sm font-bold tracking-wide">{codeBySlug.get(program.slug)}</span></span>
                    <div className="flex items-center gap-6">
                      {program.photo ? (
                        <span className="relative hidden h-20 w-28 shrink-0 overflow-hidden md:block">
                          <ImageWithFallback
                            src={program.photo.url}
                            alt={program.photo.isDecorative ? "" : program.photo.alt}
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            sizes="112px"
                          />
                        </span>
                      ) : null}
                      <div>
                        <h3 className="text-slate-900 group-hover:text-royal-800">{program.name}</h3>
                        {program.secondaryText ? (
                          <span className="mt-2 block text-sm leading-6 text-slate-700">{program.secondaryText}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="hidden border-s border-royal-200 ps-6 text-base leading-7 text-slate-700 sm:block">
                      {t(`advantage.${fieldByCode[codeBySlug.get(program.slug)!]}.description`)}
                    </span>
                    <ArrowRight aria-hidden className="size-5 text-royal-800 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" strokeWidth={1.5} />
                  </Link>
                </Reveal>
                );
              })}
            </div>
          </>
        ) : null}
      </Container>
    </section>
  );
}
