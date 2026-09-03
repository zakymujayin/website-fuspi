import type {Metadata} from "next";
import {MapPin, User} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {
  AcademicTopicShell,
  tbodyRowClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
  theadClass,
} from "@/components/public/academic-topic-shell";
import {
  academicTermKey,
  academicYear,
  dummyLectureSchedule,
  weekDays,
} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("lectureSchedule"), description: t("lectureScheduleDesc")};
}

export default async function LectureSchedulePage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");
  const tNav = await getTranslations("Nav");

  const programName = (code: string) => tNav(`program.${code}` as never);

  return (
    <AcademicTopicShell
      resourceKey="lectureSchedule"
      meta={[
        `${t("academicYearLabel")} ${academicYear}`,
        t(academicTermKey),
        t("scheduleClassCount", {count: dummyLectureSchedule.length}),
      ]}
    >
      <div className="grid gap-10">
        {weekDays.map((day) => {
          const slots = dummyLectureSchedule.filter((slot) => slot.day === day);
          if (slots.length === 0) return null;

          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <div className="flex items-baseline gap-3 border-b border-slate-200 pb-3">
                <h2 id={`day-${day}`} className="font-display text-lg font-semibold text-slate-950">
                  {t(`day.${day}` as never)}
                </h2>
                <span className="text-xs text-slate-500">
                  {t("scheduleClassCount", {count: slots.length})}
                </span>
              </div>

              {/* Table on desktop, stacked records on phones: a timetable
                  squeezed into 360px becomes unreadable either way. */}
              <div className={`${tableWrapClass} hidden md:block`}>
                <table className={tableClass}>
                  <thead className={theadClass}>
                    <tr>
                      <th scope="col" className={`${thClass} w-32`}>{t("scheduleTime")}</th>
                      <th scope="col" className={thClass}>{t("scheduleCourse")}</th>
                      <th scope="col" className={thClass}>{t("scheduleProgram")}</th>
                      <th scope="col" className={thClass}>{t("scheduleLecturer")}</th>
                      <th scope="col" className={`${thClass} w-28`}>{t("scheduleRoom")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                        <tr key={slot.id} className={`last:[&>td]:border-b-0 ${tbodyRowClass}`}>
                        <td className={`${tdClass} whitespace-nowrap font-medium text-slate-900`}>
                          {slot.start}&ndash;{slot.end}
                        </td>
                        <td className={tdClass}>
                          <span className="font-medium text-slate-900">{slot.course}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{slot.code}</span>
                        </td>
                        <td className={tdClass}>
                          <span>{programName(slot.program)}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t("semesterShort", {n: slot.semester})}
                          </span>
                        </td>
                        <td className={tdClass}>{slot.lecturer}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>{slot.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="mt-4 grid gap-px bg-slate-200 md:hidden">
                {slots.map((slot) => (
                  <li key={slot.id} className="bg-white p-4">
                    <p className="text-xs font-medium text-royal-600">
                      {slot.start}&ndash;{slot.end}
                    </p>
                    <p className="mt-1 font-display text-base font-semibold text-slate-950">
                      {slot.course}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {slot.code} &middot; {programName(slot.program)} &middot;{" "}
                      {t("semesterShort", {n: slot.semester})}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      <User aria-hidden className="size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      {slot.lecturer}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin aria-hidden className="size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      {slot.room}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AcademicTopicShell>
  );
}
