import type {Metadata} from "next";
import {ArrowRight} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {
  academicResourceHref,
  academicResourceGroups,
  findAcademicResourceByKey,
} from "@/components/public/academic-resources";
import {ACADEMIC_RESOURCE_ICONS} from "@/components/public/academic-resource-icons";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {academicNav} from "@/components/public/nav-items";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("academics")};
}

/**
 * The hub is a directory, not a second copy of every topic: each row links to
 * the page that owns the content, so a menu choice and a hub click land in the
 * same place instead of on nested cards.
 */
export default async function AcademicPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  const studyPrograms = academicNav.filter((item) => item.key.startsWith("program."));

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("academicTitle")} description={t("academicDescription")} />

      <div className="mt-10 max-w-3xl border-s-4 border-brass-400 bg-royal-50/60 px-6 py-5">
        <p className="text-sm leading-relaxed text-slate-700">{t("academicHubNote")}</p>
      </div>

      <section id="program-studi" className="mt-14 scroll-mt-32" aria-labelledby="program-studi-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 id="program-studi-title" className="font-display text-xl font-semibold text-slate-950">
              {tNav("studyPrograms")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("studyProgramsDesc")}</p>
          </div>
          <Link
            href="/prodi"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {tNav("allStudyPrograms")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {studyPrograms.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex h-full items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 transition-colors hover:border-royal-200 hover:bg-royal-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
              >
                {tNav(item.key)}
                <ArrowRight aria-hidden className="size-4 shrink-0 text-royal-600 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {academicResourceGroups.map((group) => (
        <section key={group.titleKey} className="mt-14" aria-labelledby={group.titleKey}>
          <h2 id={group.titleKey} className="border-b border-slate-200 pb-4 font-display text-xl font-semibold text-slate-950">
            {t(group.titleKey)}
          </h2>

          <ul className="border-b border-slate-200">
            {group.keys.map((key) => {
              const resource = findAcademicResourceByKey(key);
              const Icon = ACADEMIC_RESOURCE_ICONS[key];

              return (
                <li key={key} className="border-t border-slate-200 first:border-t-0">
                  <Link
                    href={academicResourceHref(resource)}
                    className="group flex items-start gap-4 py-5 transition-colors hover:bg-royal-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-royal-500"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center border border-royal-100 bg-royal-50 text-royal-600">
                      <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display text-base font-semibold text-slate-950">
                        {tNav(key)}
                      </span>
                      <span className="mt-1.5 block max-w-2xl text-sm leading-relaxed text-slate-600">
                        {t(`${key}Desc` as never)}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Container>
  );
}
