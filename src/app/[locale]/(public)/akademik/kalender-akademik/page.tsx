import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {
  academicTermKey,
  academicYear,
  calendarPhases,
  dummyAcademicCalendar,
  type CalendarPhase,
} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

const PHASE_LABEL_KEY: Record<CalendarPhase, string> = {
  registration: "phaseRegistration",
  lectures: "phaseLectures",
  assessment: "phaseAssessment",
  closing: "phaseClosing",
};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("academicCalendar"), description: t("academicCalendarDesc")};
}

export default async function AcademicCalendarPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");

  return (
    <AcademicTopicShell
      resourceKey="academicCalendar"
      meta={[`${t("academicYearLabel")} ${academicYear}`, t(academicTermKey)]}
    >
      {/* A calendar is a sequence, so it is drawn as one continuous rail:
          phases are markers along it, not separate boxes to compare. */}
      <ol className="relative border-s-2 border-slate-200 ps-6 md:ps-8">
        {calendarPhases.map((phase) => {
          const entries = dummyAcademicCalendar.filter((entry) => entry.phase === phase);
          if (entries.length === 0) return null;

          return (
            <li key={phase} className="pb-10 last:pb-0">
              <span
                aria-hidden
                className="absolute -start-[9px] mt-1.5 size-4 rounded-full border-2 border-white bg-brass-500"
              />
              <h2 className="font-display text-lg font-semibold text-slate-950">
                {t(PHASE_LABEL_KEY[phase] as never)}
              </h2>

              <ul className="mt-4 grid gap-px bg-slate-200">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid gap-1 bg-white p-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <span className="text-sm font-medium text-royal-700">{entry.period}</span>
                    <span className="text-sm leading-relaxed text-slate-700">{entry.activity}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </AcademicTopicShell>
  );
}
