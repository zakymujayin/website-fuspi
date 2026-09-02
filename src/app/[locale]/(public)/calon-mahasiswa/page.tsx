import {ArrowRight, BookOpen, Calendar, FileText, GraduationCap, Search} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("prospectiveStudentTitle")};
}

export default async function CalonMahasiswaPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("prospectiveStudentTitle")} description={t("prospectiveStudentDesc")} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {href: "/prodi", icon: BookOpen, label: t("studyPrograms"), desc: t("studyProgramsDesc")},
          {href: "https://pmb.uinbanten.ac.id/", icon: GraduationCap, label: t("pmbPortal"), desc: t("pmbPortalDesc"), ext: true},
          {href: "/beasiswa", icon: FileText, label: t("scholarships"), desc: t("scholarshipsDesc")},
          {href: "/agenda", icon: Calendar, label: t("agendaEvents"), desc: t("agendaEventsDesc")},
          {href: "/faq", icon: Search, label: t("faqPage"), desc: t("faqPageDesc")},
          {href: "/profil", icon: BookOpen, label: t("facultyProfile"), desc: t("facultyProfileDesc")},
          {href: "/dokumen", icon: FileText, label: t("academicDocs"), desc: t("academicDocsDesc")},
          {href: "/kontak", icon: Search, label: t("contactUs"), desc: t("contactUsDesc")},
        ].map((item) => (
          <Link key={item.href} href={item.href}
            target={item.ext ? "_blank" : undefined}
            rel={item.ext ? "noopener noreferrer" : undefined}
            className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <item.icon data-icon aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-slate-900">{item.label}</h2>
              <p className="mt-1.5 text-sm text-slate-500">{item.desc}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              {t("readMore")}
              <ArrowRight aria-hidden className="size-3" strokeWidth={1.5} />
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
