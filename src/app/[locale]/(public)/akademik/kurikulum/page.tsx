import type {Metadata} from "next";
import {Check} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {academicYear, dummyCurricula} from "@/lib/data/dummy-academic";
import {Link} from "@/i18n/navigation";
import {institution} from "@/config/institution";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("curriculum"), description: t("curriculumDesc")};
}

export default async function CurriculumPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");
  const tNav = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  const slugOf = (code: string) =>
    institution.studyPrograms.find((program) => program.code === code)?.slug ?? "";

  return (
    <AcademicTopicShell
      resourceKey="curriculum"
      meta={[`${t("academicYearLabel")} ${academicYear}`]}
    >
      <div className="grid gap-12">
        {dummyCurricula.map((curriculum) => (
          <section key={curriculum.program} aria-labelledby={`curriculum-${curriculum.program}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-xl border border-navy-800 bg-navy-800 px-5 py-4 text-white sm:px-6">
              <h2
                id={`curriculum-${curriculum.program}`}
                className="font-display text-xl font-semibold text-white"
              >
                {tNav(`program.${curriculum.program}` as never)}
              </h2>
              <Link
                href={`/prodi/${slugOf(curriculum.program)}`}
                className="text-sm font-medium text-white transition-colors hover:text-brass-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-300"
              >
                {tPages("readMore")}
              </Link>
            </div>

            <dl className="grid gap-px overflow-hidden rounded-b-xl border border-slate-200 border-t-0 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {label: t("curriculumTotalCredits"), value: `${curriculum.totalCredits} ${t("creditsUnit")}`},
                {label: t("curriculumCoreCredits"), value: `${curriculum.coreCredits} ${t("creditsUnit")}`},
                {label: t("curriculumElectiveCredits"), value: `${curriculum.electiveCredits} ${t("creditsUnit")}`},
                {label: t("curriculumSemesters"), value: t("curriculumSemestersValue", {count: curriculum.semesters})},
                {label: t("curriculumDegree"), value: curriculum.degree},
              ].map((stat) => (
                <div key={stat.label} className="bg-white px-4 py-5">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 font-display text-xl font-semibold text-slate-950">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-8 font-display text-base font-semibold text-slate-950">
              {t("curriculumOutcomes")}
            </h3>
            <ul className="mt-3 grid max-w-3xl gap-3">
              {curriculum.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brass-500" strokeWidth={2} />
                  {outcome}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AcademicTopicShell>
  );
}
