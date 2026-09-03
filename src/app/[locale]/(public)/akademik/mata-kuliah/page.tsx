import type {Metadata} from "next";
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
import {academicYear, dummyCourses} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("courseCatalog"), description: t("courseCatalogDesc")};
}

export default async function CourseCatalogPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");
  const tNav = await getTranslations("Nav");

  const semesters = [...new Set(dummyCourses.map((course) => course.semester))].sort((a, b) => a - b);
  const totalCredits = dummyCourses.reduce((sum, course) => sum + course.credits, 0);

  const programName = (code: string) =>
    code === "FUS" ? t("facultyWide") : tNav(`program.${code}` as never);

  return (
    <AcademicTopicShell
      resourceKey="courseCatalog"
      meta={[
        `${t("academicYearLabel")} ${academicYear}`,
        `${dummyCourses.length} ${t("courseName")}`,
        `${totalCredits} ${t("creditsUnit")}`,
      ]}
    >
      <div className="grid gap-10">
        {semesters.map((semester) => {
          const courses = dummyCourses.filter((course) => course.semester === semester);

          return (
            <section key={semester} aria-labelledby={`semester-${semester}`}>
              <h2
                id={`semester-${semester}`}
                className="border-b border-slate-200 pb-3 font-display text-lg font-semibold text-slate-950"
              >
                {t("courseSemesterGroup", {n: semester})}
              </h2>

              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead className={theadClass}>
                    <tr>
                      <th scope="col" className={`${thClass} w-32`}>{t("courseCode")}</th>
                      <th scope="col" className={thClass}>{t("courseName")}</th>
                      <th scope="col" className={thClass}>{t("scheduleProgram")}</th>
                      <th scope="col" className={`${thClass} w-24`}>{t("courseCredits")}</th>
                      <th scope="col" className={`${thClass} w-28`}>{t("courseType")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                        <tr key={course.code} className={`last:[&>td]:border-b-0 ${tbodyRowClass}`}>
                        <td className={`${tdClass} whitespace-nowrap font-mono text-xs text-slate-500`}>
                          {course.code}
                        </td>
                        <td className={`${tdClass} font-medium text-slate-900`}>{course.name}</td>
                        <td className={tdClass}>{programName(course.program)}</td>
                        <td className={tdClass}>{course.credits}</td>
                        <td className={tdClass}>
                          <span
                            className={
                              course.type === "core"
                                ? "inline-flex border border-royal-200 bg-royal-50 px-2 py-0.5 text-xs font-medium text-royal-700"
                                : "inline-flex border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {course.type === "core" ? t("courseTypeCore") : t("courseTypeElective")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </AcademicTopicShell>
  );
}
