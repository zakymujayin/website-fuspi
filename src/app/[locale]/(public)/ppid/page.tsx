import type {Metadata} from "next";
import {ArrowRight, Clock3, FileLock2, FileText, Zap} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";

const CATEGORIES = [
  {
    icon: FileText,
    title: {
      id: "Informasi Berkala",
      en: "Periodic Information",
      ar: "المعلومات الدورية",
    },
    description: {
      id: "Profil fakultas, laporan kinerja, dan data akademik yang diterbitkan secara rutin.",
      en: "Faculty profile, performance reports, and academic data published on a regular schedule.",
      ar: "الملف التعريفي للكلية وتقارير الأداء والبيانات الأكاديمية التي تُنشر بشكل دوري.",
    },
  },
  {
    icon: Zap,
    title: {
      id: "Informasi Serta-Merta",
      en: "Immediate Information",
      ar: "المعلومات الفورية",
    },
    description: {
      id: "Informasi yang wajib diumumkan segera karena berkaitan dengan keselamatan sivitas akademika.",
      en: "Information that must be disclosed immediately due to its bearing on community safety.",
      ar: "معلومات يجب الإعلان عنها فوراً لتعلقها بسلامة المجتمع الأكاديمي.",
    },
  },
  {
    icon: Clock3,
    title: {
      id: "Informasi Setiap Saat",
      en: "Information Available Upon Request",
      ar: "المعلومات المتاحة عند الطلب",
    },
    description: {
      id: "Informasi yang tersedia dan dapat diminta pemohon sesuai prosedur permohonan resmi.",
      en: "Information available on request through the official request procedure.",
      ar: "معلومات متاحة يمكن طلبها عبر إجراءات الطلب الرسمية.",
    },
  },
  {
    icon: FileLock2,
    title: {
      id: "Informasi Dikecualikan",
      en: "Restricted Information",
      ar: "المعلومات المستثناة",
    },
    description: {
      id: "Informasi yang dikecualikan dari akses publik sesuai ketentuan perundang-undangan yang berlaku.",
      en: "Information excluded from public access under applicable laws and regulations.",
      ar: "معلومات مستثناة من الوصول العام وفقاً للأنظمة والقوانين المعمول بها.",
    },
  },
] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("ppidTitle")};
}

export default async function PpidPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("ppidTitle")} description={t("ppidDescription")} />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {CATEGORIES.map((category) => (
          <article
            key={category.title.id}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <category.icon aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold leading-snug text-slate-900">
                {category.title[locale] ?? category.title.id}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {category.description[locale] ?? category.description.id}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900">{t("contactUs")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("contactUsDesc")}</p>
        </div>
        <Link
          href="/kontak"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-royal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-royal-600"
        >
          {t("contactUs")}
          <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      </div>
    </Container>
  );
}
