import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import type {PublicAcademicDirectoryItemSchema} from "@/contracts/academic";
import {Link} from "@/i18n/navigation";

type AcademicItem = z.infer<typeof PublicAcademicDirectoryItemSchema>;

/** Resolves a study program's official code (IAT/IH/AFI) from the frozen
 * institution contract; CMS rows carry the slug, not the code. */
const codeBySlug = new Map<string, string>(
  institution.studyPrograms.map((program) => [program.slug, program.code]),
);

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

  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{t("introLabel")}</p>
        <h2 className="mt-4 max-w-3xl text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900 md:text-[34px]">
          {title || t("introTitle")}
        </h2>
        <Reveal>
          <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                {description || t("introDescription")}
              </p>
              <Link href="/profil" className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-royal-500 text-sm font-semibold text-royal-700 transition-colors hover:text-royal-500">
                {t("introCtaProfile")}
                <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="lg:col-span-6">
              {programs.length > 0 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{tNav("studyPrograms")}</p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-3">
                    {programs.map((program, index) => (
                      <Reveal key={program.id} index={index}>
                        <Link
                          href={`/prodi/${program.slug}`}
                          className="group block h-full border border-slate-200 border-t-[3px] border-t-royal-500 bg-white p-5 transition-colors duration-200 hover:border-royal-400"
                        >
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-royal-600">{codeBySlug.get(program.slug) ?? "S1"}</span>
                          <span className="mt-3 block text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-royal-700">
                            {program.name}
                          </span>
                          {program.secondaryText ? (
                            <span className="mt-2 block text-sm leading-6 text-slate-600">{program.secondaryText}</span>
                          ) : null}
                          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700">
                            {t("introCtaPrograms")}
                            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                          </span>
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
