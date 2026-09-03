import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicCourseCatalog} from "@/components/public/academic-course-catalog";
import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
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

  const totalCredits = dummyCourses.reduce((sum, course) => sum + course.credits, 0);

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
        <AcademicCourseCatalog
          courses={dummyCourses}
          programNames={{FUS: t("facultyWide"), IAT: tNav("program.IAT"), IH: tNav("program.IH"), AFI: tNav("program.AFI")}}
          labels={{
            semester: t("semesterLabel"),
            allSemesters: t("allSemesters"),
            courseCode: t("courseCode"),
            courseName: t("courseName"),
            program: t("scheduleProgram"),
            credits: t("courseCredits"),
            type: t("courseType"),
            typeCore: t("courseTypeCore"),
            typeElective: t("courseTypeElective"),
            semesterGroup: t("courseSemesterGroup", {n: "{n}"}),
            noCourses: t("noCourses"),
          }}
        />
      </div>
    </AcademicTopicShell>
  );
}
