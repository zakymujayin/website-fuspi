import {ArrowLeft} from "lucide-react";
import type {ReactNode} from "react";
import {getTranslations} from "next-intl/server";

import {ACADEMIC_RESOURCE_ICONS} from "@/components/public/academic-resource-icons";
import {
  academicResourceHref,
  academicResources,
  type AcademicResourceKey,
} from "@/components/public/academic-resources";
import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";

/** Shared table skin so the seven topic pages read as one system. */
export const tableWrapClass = "mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm";
export const tableClass = "w-full min-w-[44rem] border-collapse text-start text-sm";
export const theadClass = "bg-navy-800 text-xs font-semibold uppercase tracking-[0.12em] text-white";
export const thClass = "px-4 py-3 text-start font-semibold text-white";
export const tdClass = "border-b border-slate-100 px-4 py-3 align-top text-slate-700";
export const tbodyRowClass = "hover:bg-royal-50/60 transition-colors";

type AcademicTopicShellProps = {
  resourceKey: AcademicResourceKey;
  /** Small factual chips under the heading (academic year, term, counts). */
  meta?: readonly string[];
  children: ReactNode;
};

/**
 * Chrome every `/akademik/<topic>` page shares: trail, titled header, the
 * placeholder-data notice, and the sideways links out. The body below it is
 * designed per topic — a schedule is a timetable, a calendar is a timeline —
 * so the page answers its own question instead of forwarding to the archive.
 */
export async function AcademicTopicShell({resourceKey, meta, children}: AcademicTopicShellProps) {
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");
  const tAcademic = await getTranslations("Academic");

  const Icon = ACADEMIC_RESOURCE_ICONS[resourceKey];
  const siblings = academicResources.filter((item) => item.key !== resourceKey);

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("academicTitle"), href: "/akademik"},
          {label: tNav(resourceKey)},
        ]}
      />

      <header className="mt-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center border border-royal-100 bg-royal-50 text-royal-600">
          <Icon aria-hidden className="size-6" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <SectionHeading
            as="h1"
            title={tNav(resourceKey)}
            description={t(`${resourceKey}Desc` as never)}
          />
          {meta?.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {meta.map((chip) => (
                <li
                  key={chip}
                  className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <div className="mt-10">{children}</div>

      <footer className="mt-16 border-t border-slate-200 pt-8">
        <h2 className="font-display text-lg font-semibold text-slate-950">{t("academicOtherTopics")}</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {siblings.map((item) => (
            <li key={item.key}>
              <Link
                href={academicResourceHref(item)}
                className="inline-flex border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
              >
                {tNav(item.key)}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/akademik"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
        >
          <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          {t("academicBackToHub")}
        </Link>
      </footer>
    </Container>
  );
}
