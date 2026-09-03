import type {Metadata} from "next";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LibraryBig,
  Search,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {academicNav} from "@/components/public/nav-items";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";

const RESOURCE_ICONS = {
  studyPrograms: GraduationCap,
  lectureSchedule: ClipboardList,
  academicCalendar: CalendarDays,
  curriculum: BookOpenText,
  courseCatalog: LibraryBig,
  academicDocs: FileText,
  accreditation: ShieldCheck,
  academicGuidelines: ScrollText,
} as const;

const ACADEMIC_RESOURCE_DETAILS = [
  {
    key: "lectureSchedule",
    anchor: "jadwal-perkuliahan",
    documentHref: "/dokumen?kategori=jadwal-perkuliahan",
  },
  {
    key: "academicCalendar",
    anchor: "kalender-akademik",
    documentHref: "/dokumen?kategori=kalender-akademik",
  },
  {
    key: "curriculum",
    anchor: "kurikulum",
    documentHref: "/dokumen?kategori=kurikulum",
  },
  {
    key: "courseCatalog",
    anchor: "mata-kuliah",
    documentHref: "/dokumen?kategori=mata-kuliah",
  },
  {
    key: "academicDocs",
    anchor: "dokumen-akademik",
    documentHref: "/dokumen?kategori=akademik",
  },
  {
    key: "accreditation",
    anchor: "akreditasi",
    documentHref: "/dokumen?kategori=akreditasi",
  },
  {
    key: "academicGuidelines",
    anchor: "pedoman-akademik",
    documentHref: "/dokumen?kategori=pedoman-akademik",
  },
] as const;

const ACADEMIC_SECTIONS = [
  {
    titleKey: "academicHubPrimary",
    items: ["studyPrograms", "lectureSchedule", "academicCalendar", "curriculum", "courseCatalog"],
  },
  {
    titleKey: "academicHubArchive",
    items: ["academicDocs", "accreditation", "academicGuidelines"],
  },
] as const;

function academicHref(key: string) {
  return academicNav.find((item) => item.key === key)?.href ?? "/akademik";
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("academics")};
}

export default async function AcademicPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("academicTitle")} description={t("academicDescription")} />

      <div className="mt-10 border-s-4 border-brass-400 bg-royal-50/60 px-6 py-5">
        <p className="prose-measure text-sm leading-relaxed text-slate-700">{t("academicHubNote")}</p>
      </div>

      <div className="mt-12 grid gap-12" aria-label={t("academicQuickAccess")}>
        {ACADEMIC_SECTIONS.map((section) => (
          <section key={section.titleKey} aria-labelledby={section.titleKey}>
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <h2 id={section.titleKey} className="font-display text-xl font-semibold text-slate-950">
                {t(section.titleKey)}
              </h2>
            </div>

            <div className="mt-6 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2">
              {section.items.map((key) => {
                const Icon = RESOURCE_ICONS[key];

                return (
                  <Link
                    key={key}
                    href={academicHref(key)}
                    className="group flex min-h-36 gap-4 bg-white p-5 transition-colors hover:bg-royal-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-royal-500"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center border border-royal-100 bg-royal-50 text-royal-600 transition-colors group-hover:border-royal-200 group-hover:bg-white">
                      <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-display text-base font-semibold leading-snug text-slate-950">
                        {tNav(key)}
                      </span>
                      <span className="mt-2 text-sm leading-relaxed text-slate-600">
                        {t(`${key}Desc`)}
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                        {t("readMore")}
                        <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section id="program-studi" className="scroll-mt-32 pt-16" aria-labelledby="program-studi-title">
        <div className="border-y border-slate-200 py-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">
                {t("academicResourceDetail")}
              </p>
              <h2 id="program-studi-title" className="mt-3 font-display text-2xl font-semibold text-slate-950">
                {tNav("studyPrograms")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("studyProgramsDesc")}</p>
            </div>
            <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-3">
              {academicNav
                .filter((item) => item.key.startsWith("program."))
                .map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="group flex min-h-32 flex-col justify-between bg-white p-5 transition-colors hover:bg-royal-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-royal-500"
                  >
                    <span className="font-display text-base font-semibold leading-snug text-slate-950">
                      {tNav(item.key)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                      {t("readMore")}
                      <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 pt-12">
        {ACADEMIC_RESOURCE_DETAILS.map((resource, index) => {
          const Icon = RESOURCE_ICONS[resource.key];

          return (
            <section
              key={resource.key}
              id={resource.anchor}
              className="scroll-mt-32 border border-slate-200 bg-white"
              aria-labelledby={`${resource.anchor}-title`}
            >
              <div className="grid gap-0 lg:grid-cols-[18rem_1fr]">
                <div className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-e">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center border border-royal-100 bg-white text-royal-600">
                      <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 id={`${resource.anchor}-title`} className="mt-5 font-display text-2xl font-semibold text-slate-950">
                    {tNav(resource.key)}
                  </h2>
                </div>

                <div className="p-6 md:p-8">
                  <p className="max-w-3xl text-base leading-relaxed text-slate-700">
                    {t(`${resource.key}Desc`)}
                  </p>

                  <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="border-s-2 border-brass-400 ps-4">
                      <p className="font-medium text-slate-950">{t("academicContentStatusTitle")}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {t("academicContentStatusDesc")}
                      </p>
                    </div>
                    <Link
                      href={resource.documentHref}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:border-royal-300 hover:text-royal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
                    >
                      <Search aria-hidden className="size-4" strokeWidth={1.5} />
                      {t("academicDocumentAction")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </Container>
  );
}
