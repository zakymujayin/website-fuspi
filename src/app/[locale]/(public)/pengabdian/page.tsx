import type {Metadata} from "next";
import {BookMarked, HandHeart, MessagesSquare, Stethoscope} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

const PROGRAMS = [
  {
    icon: BookMarked,
    title: {
      id: "Literasi Keagamaan untuk Pesantren",
      en: "Religious Literacy for Islamic Boarding Schools",
      ar: "محو الأمية الدينية للمعاهد الإسلامية",
    },
    description: {
      id: "Pendampingan literasi Al-Qur'an, hadis, dan keislaman dasar bagi santri tingkat dasar dan menengah.",
      en: "Support for Qur'an, hadith, and basic Islamic literacy among elementary and secondary students.",
      ar: "دعم محو الأمية في القرآن والحديث والدراسات الإسلامية الأساسية لطلاب المرحلتين الابتدائية والثانوية.",
    },
  },
  {
    icon: MessagesSquare,
    title: {
      id: "Moderasi Beragama di Masyarakat",
      en: "Religious Moderation in the Community",
      ar: "الاعتدال الديني في المجتمع",
    },
    description: {
      id: "Dialog lintas iman dan penguatan wawasan kebangsaan di wilayah rawan polarisasi sosial-keagamaan.",
      en: "Interfaith dialogue and civic education in areas prone to religious and social polarization.",
      ar: "حوار بين الأديان وتعزيز الوعي الوطني في مناطق معرضة للاستقطاب الديني والاجتماعي.",
    },
  },
  {
    icon: Stethoscope,
    title: {
      id: "Bimbingan Rohani dan Konseling Spiritual",
      en: "Spiritual Guidance and Counseling",
      ar: "الإرشاد الروحي والاستشارة النفسية",
    },
    description: {
      id: "Layanan konseling berbasis tasawuf bagi masyarakat terdampak bencana dan kelompok rentan.",
      en: "Sufism-informed counseling services for disaster-affected communities and vulnerable groups.",
      ar: "خدمات إرشادية قائمة على التصوف للمجتمعات المتضررة من الكوارث والفئات الضعيفة.",
    },
  },
  {
    icon: HandHeart,
    title: {
      id: "Riset Aksi Sosial-Keagamaan",
      en: "Social-Religious Action Research",
      ar: "بحوث العمل الاجتماعي الديني",
    },
    description: {
      id: "Kolaborasi dosen dan mahasiswa memetakan dan mengatasi persoalan sosial-keagamaan di desa binaan.",
      en: "Faculty-student collaboration mapping and addressing social-religious issues in partner villages.",
      ar: "تعاون بين الأساتذة والطلاب لرصد ومعالجة القضايا الاجتماعية الدينية في القرى الشريكة.",
    },
  },
] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("csTitle")};
}

export default async function PengabdianPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("csTitle")} description={t("csDescription")} />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {PROGRAMS.map((program) => (
          <article
            key={program.title.id}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
              <program.icon aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold leading-snug text-slate-900">
                {program.title[locale] ?? program.title.id}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {program.description[locale] ?? program.description.id}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Container>
  );
}
