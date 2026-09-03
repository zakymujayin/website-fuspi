import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {FileCheck2} from "lucide-react";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {dummyAccreditations} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("accreditation"), description: t("accreditationDesc")};
}

export default async function AccreditationPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");
  const tNav = await getTranslations("Nav");

  const faculty = dummyAccreditations.find((item) => item.scope === "faculty");
  const programs = dummyAccreditations.filter((item) => item.scope !== "faculty");

  const scopeLabel = (scope: string) =>
    scope === "faculty" ? t("accreditationFaculty") : tNav(`program.${scope}` as never);

  return (
    <AcademicTopicShell
      resourceKey="accreditation"
      meta={faculty ? [faculty.agency, `${t("accreditationGrade")}: ${faculty.grade}`] : undefined}
    >
      {faculty ? (
        <section
          className="border-y border-slate-200 bg-white py-7 md:py-8"
          aria-labelledby="accreditation-faculty"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">
                {t("accreditationFaculty")}
              </p>
              <h2 id="accreditation-faculty" className="mt-2 font-display text-2xl font-semibold text-slate-950">
                {faculty.grade}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600">
              {faculty.agency} · {faculty.decreeNumber}
            </p>
          </div>

          <dl className="mt-7 grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-3">
            {[
              {label: t("accreditationAgency"), value: faculty.agency},
              {label: t("accreditationDecree"), value: faculty.decreeNumber},
              {label: t("accreditationValidUntil"), value: faculty.validUntil},
            ].map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  {row.label}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="accreditation-programs">
        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{tNav("studyPrograms")}</p>
            <h2 id="accreditation-programs" className="mt-2 font-display text-2xl font-semibold text-slate-950">
              {tNav("studyPrograms")}
            </h2>
          </div>
          <span className="hidden font-display text-sm font-semibold text-slate-400 sm:block">{programs.length}</span>
        </div>

        <ol className="mt-10 grid gap-12">
          {programs.map((program, index) => (
            <li key={program.id} className="border-b border-slate-200 pb-12 last:border-b-0">
              <header className="flex items-start gap-4">
                <span className="pt-1 font-display text-sm font-semibold tracking-[0.12em] text-brass-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{tNav("studyPrograms")}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-slate-950 md:text-3xl">
                    {scopeLabel(program.scope)}
                  </h3>
                  <span aria-hidden className="mt-4 block h-0.5 w-20 bg-brass-500" />
                </div>
              </header>

              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.78fr)] lg:items-start">
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">{t("accreditationHistory")}</p>
                  <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                    {[
                      {label: t("accreditationGrade"), value: program.grade},
                      {label: t("accreditationAgency"), value: program.agency},
                      {label: t("accreditationValidUntil"), value: program.validUntil},
                      {label: t("accreditationDecree"), value: program.decreeNumber},
                    ].map((row) => (
                      <div key={row.label} className="sm:col-span-1">
                        <dt className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{row.label}</dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-slate-800">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="border border-slate-200 bg-slate-50 p-3">
                  <div className="flex aspect-[4/3] flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 text-center">
                    <FileCheck2 aria-hidden className="size-10 text-royal-500" strokeWidth={1.5} />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("accreditationCertificate")}</p>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{t("accreditationUnavailable")}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </AcademicTopicShell>
  );
}
