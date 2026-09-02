import type {Metadata} from "next";
import {BookOpen, Brain, Scale} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

const FOCUS_AREAS = [
  {
    icon: BookOpen,
    title: {
      id: "Kajian Al-Qur'an dan Tafsir Kontekstual",
      en: "Qur'anic Studies and Contextual Tafsir",
      ar: "دراسات القرآن والتفسير السياقي",
    },
    description: {
      id: "Penelitian metodologi tafsir yang menjawab persoalan sosial-keagamaan kontemporer.",
      en: "Research on tafsir methodology addressing contemporary social and religious issues.",
      ar: "بحث في منهجية التفسير يعالج القضايا الاجتماعية والدينية المعاصرة.",
    },
  },
  {
    icon: Scale,
    title: {
      id: "Kritik dan Living Hadis",
      en: "Hadith Criticism and Living Hadith",
      ar: "نقد الحديث والحديث الحي",
    },
    description: {
      id: "Kajian sanad dan matan hadis serta praktik keagamaan masyarakat yang bersumber dari hadis.",
      en: "Study of hadith chains and texts, and the lived religious practices they inform.",
      ar: "دراسة أسانيد ومتون الحديث والممارسات الدينية المجتمعية المستمدة منه.",
    },
  },
  {
    icon: Brain,
    title: {
      id: "Filsafat dan Teologi Islam Kontemporer",
      en: "Contemporary Islamic Philosophy and Theology",
      ar: "الفلسفة وعلم الكلام الإسلامي المعاصر",
    },
    description: {
      id: "Penelitian pemikiran rasional Islam dalam merespons wacana filsafat dan sains modern.",
      en: "Research on rational Islamic thought in dialogue with modern philosophy and science.",
      ar: "بحث في الفكر الإسلامي العقلاني في تفاعله مع الفلسفة والعلوم الحديثة.",
    },
  },
] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("research")};
}

export default async function PenelitianPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("researchFocusTitle")} description={t("researchFocusDesc")} />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FOCUS_AREAS.map((area) => (
          <article
            key={area.title.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <area.icon aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 font-display text-base font-semibold leading-snug text-slate-900">
              {area.title[locale] ?? area.title.id}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {area.description[locale] ?? area.description.id}
            </p>
          </article>
        ))}
      </div>
    </Container>
  );
}
