import type {Metadata} from "next";
import {ArrowRight, CalendarDays, FileText, GraduationCap, LayoutDashboard} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";

const E_LAYANAN_URL = "https://fuspi.uinbanten.ac.id/e-layanan";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("academics")};
}

export default async function AcademicPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tHome = await getTranslations("Home");

  const hubs = [
    {
      href: "/prodi",
      external: false,
      icon: GraduationCap,
      title: t("studyPrograms"),
      description: t("studyProgramsDesc"),
    },
    {
      href: "/dokumen",
      external: false,
      icon: FileText,
      title: t("academicDocs"),
      description: t("academicDocsDesc"),
    },
    {
      href: "/agenda",
      external: false,
      icon: CalendarDays,
      title: t("agendaEvents"),
      description: t("agendaEventsDesc"),
    },
    {
      href: E_LAYANAN_URL,
      external: true,
      icon: LayoutDashboard,
      title: tHome("service.sila.title"),
      description: tHome("service.sila.description"),
    },
  ] as const;

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("academicTitle")} description={t("academicDescription")} />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {hubs.map((hub) => {
          const cardClass =
            "group flex flex-col rounded-xl border border-t-4 border-slate-200 border-t-royal-500 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:border-t-royal-500 hover:shadow-md";
          const content = (
            <>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100">
                <hub.icon aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <div className="mt-4 flex-1">
                <h2 className="font-display text-base font-semibold leading-snug text-slate-900">{hub.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{hub.description}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                {t("readMore")}
                <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
              </span>
            </>
          );
          return hub.external ? (
            <a key={hub.href} href={hub.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
              {content}
            </a>
          ) : (
            <Link key={hub.href} href={hub.href} className={cardClass}>
              {content}
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
