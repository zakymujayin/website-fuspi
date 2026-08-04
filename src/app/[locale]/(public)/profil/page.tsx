import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {ArrowRight} from "lucide-react";
import {institution} from "@/config/institution";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("profile")};
}

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("profileTitle")} description={t("profileDescription")} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {href: "/profil/sejarah", label: t("history"), desc: t("historyDesc")},
          {href: "/profil/visi-misi", label: t("visionMission"), desc: t("visionMissionDesc")},
          {href: "/profil/struktur", label: t("structure"), desc: t("structureDesc")},
          {href: "/profil/pimpinan", label: t("leadership"), desc: t("leadershipDesc")},
          {href: "/dosen", label: t("lecturers"), desc: t("lecturersDesc")},
          {href: "/profil/fasilitas", label: t("facilities"), desc: t("facilitiesDesc")},
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="font-display text-[17px] font-semibold text-slate-900">{item.label}</h2>
            <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
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
