"use client";

import {CalendarDays} from "lucide-react";
import {useMemo, useState} from "react";

type Course = {
  code: string;
  name: string;
  credits: number;
  semester: number;
  program: string;
  type: "core" | "elective";
};

export type AcademicCourseCatalogLabels = {
  semester: string;
  allSemesters: string;
  courseCode: string;
  courseName: string;
  program: string;
  credits: string;
  type: string;
  typeCore: string;
  typeElective: string;
  semesterGroup: string;
  noCourses: string;
};

type Props = {
  courses: readonly Course[];
  programNames: Readonly<Record<string, string>>;
  labels: AcademicCourseCatalogLabels;
};

export function AcademicCourseCatalog({courses, programNames, labels}: Props) {
  const [selectedSemester, setSelectedSemester] = useState<number | "all">("all");
  const semesters = useMemo(
    () => [...new Set(courses.map((course) => course.semester))].sort((a, b) => a - b),
    [courses],
  );
  const visibleSemesters = selectedSemester === "all"
    ? semesters
    : semesters.filter((semester) => semester === selectedSemester);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-3">
        <label htmlFor="course-semester" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays aria-hidden className="size-4 text-royal-600" strokeWidth={1.6} />
          {labels.semester}
        </label>
        <select
          id="course-semester"
          value={selectedSemester}
          onChange={(event) => setSelectedSemester(event.target.value === "all" ? "all" : Number(event.target.value))}
          className="min-h-10 border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
        >
          <option value="all">{labels.allSemesters}</option>
          {semesters.map((semester) => <option key={semester} value={semester}>{labels.semester} {semester}</option>)}
        </select>
      </div>

      {visibleSemesters.length > 0 ? (
        <div className="mt-8 grid gap-10">
          {visibleSemesters.map((semester) => {
            const semesterCourses = courses.filter((course) => course.semester === semester);
            return (
              <section key={semester} aria-labelledby={`catalog-semester-${semester}`}>
                <h2 id={`catalog-semester-${semester}`} className="border-b border-slate-200 pb-3 font-display text-lg font-semibold tracking-tight text-slate-950">
                  {labels.semesterGroup.replace("{n}", String(semester))}
                </h2>
                <div className="mt-5 overflow-x-auto border border-slate-200 bg-white">
                  <table className="w-full min-w-[42rem] border-collapse text-start text-sm">
                    <thead className="bg-navy-800 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                      <tr>
                        <th scope="col" className="w-32 px-4 py-3 text-start">{labels.courseCode}</th>
                        <th scope="col" className="px-4 py-3 text-start">{labels.courseName}</th>
                        <th scope="col" className="px-4 py-3 text-start">{labels.program}</th>
                        <th scope="col" className="w-24 px-4 py-3 text-start">{labels.credits}</th>
                        <th scope="col" className="w-28 px-4 py-3 text-start">{labels.type}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterCourses.map((course) => (
                        <tr key={course.code} className="border-b border-slate-100 last:border-b-0 hover:bg-royal-50/50">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{course.code}</td>
                          <td className="px-4 py-3 font-medium text-slate-800"><span dir="auto">{course.name}</span></td>
                          <td className="px-4 py-3 text-slate-600">{programNames[course.program] ?? course.program}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-600">{course.credits}</td>
                          <td className="px-4 py-3">
                            <span className={course.type === "core" ? "inline-flex border border-royal-200 bg-royal-50 px-2 py-0.5 text-xs font-medium text-royal-700" : "inline-flex border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600"}>
                              {course.type === "core" ? labels.typeCore : labels.typeElective}
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
      ) : (
        <p className="mt-8 border-s-2 border-slate-200 ps-4 text-sm leading-relaxed text-slate-500">{labels.noCourses}</p>
      )}
    </div>
  );
}
