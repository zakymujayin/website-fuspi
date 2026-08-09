import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

const MILESTONES = [
  {
    year: "2015",
    title: {
      id: "Pendirian Fakultas",
      en: "Faculty Founded",
      ar: "تأسيس الكلية",
    },
    description: {
      id: "Fakultas Ushuluddin dan Pemikiran Islam berdiri bersamaan dengan alih status IAIN menjadi UIN Sultan Maulana Hasanuddin Banten, membuka dua program studi pertama: Ilmu Al-Qur'an dan Tafsir, serta Ilmu Hadis.",
      en: "The Faculty of Ushuluddin and Islamic Thought was established alongside IAIN's transition to UIN Sultan Maulana Hasanuddin Banten, opening its first two study programs: Qur'anic Sciences and Tafsir, and Hadith Sciences.",
      ar: "تأسست كلية أصول الدين والفكر الإسلامي بالتزامن مع تحول المعهد إلى جامعة سلطان مولانا حسن الدين بانتن، وافتتحت أول برنامجين دراسيين: علوم القرآن والتفسير وعلوم الحديث.",
    },
  },
  {
    year: "2017",
    title: {
      id: "Pembukaan Program Aqidah dan Filsafat Islam",
      en: "Aqidah and Islamic Philosophy Program Opens",
      ar: "افتتاح برنامج العقيدة والفلسفة الإسلامية",
    },
    description: {
      id: "Menjawab kebutuhan kajian teologi dan pemikiran rasional Islam, program studi Aqidah dan Filsafat Islam resmi dibuka dan menerima angkatan pertama.",
      en: "Responding to the need for theological and rational Islamic thought studies, the Aqidah and Islamic Philosophy program officially opened and welcomed its first cohort.",
      ar: "استجابةً للحاجة إلى دراسات علم الكلام والفكر الإسلامي العقلاني، افتُتح برنامج العقيدة والفلسفة الإسلامية رسمياً واستقبل دفعته الأولى.",
    },
  },
  {
    year: "2019",
    title: {
      id: "Akreditasi B Seluruh Program Studi",
      en: "All Programs Accredited B",
      ar: "اعتماد جميع البرامج بتصنيف B",
    },
    description: {
      id: "Ketiga program studi yang berjalan saat itu memperoleh peringkat akreditasi B dari BAN-PT, menandai pengakuan formal atas mutu penyelenggaraan pendidikan.",
      en: "All three programs running at the time earned a B accreditation rating from BAN-PT, marking formal recognition of the faculty's educational quality.",
      ar: "حصلت البرامج الثلاثة العاملة آنذاك على تصنيف اعتماد B من الهيئة الوطنية للاعتماد، مما شكّل اعترافاً رسمياً بجودة التعليم.",
    },
  },
  {
    year: "2021",
    title: {
      id: "Genap Lima Program Studi",
      en: "Five Study Programs Complete",
      ar: "اكتمال خمسة برامج دراسية",
    },
    description: {
      id: "Program Studi Agama-Agama dan Tasawuf dan Psikoterapi dibuka, melengkapi lima program studi FUSPI yang berjalan hingga saat ini.",
      en: "The Religious Studies and Sufism and Psychotherapy programs opened, completing the five study programs FUSPI offers today.",
      ar: "افتُتح برنامجا دراسات الأديان والتصوف والعلاج النفسي، لتكتمل بذلك البرامج الدراسية الخمسة التي تقدمها الكلية حتى اليوم.",
    },
  },
  {
    year: "2023",
    title: {
      id: "Transformasi Layanan Digital",
      en: "Digital Services Transformation",
      ar: "التحول إلى الخدمات الرقمية",
    },
    description: {
      id: "FUSPI mengintegrasikan layanan akademik ke Sistem Informasi Akademik (SILA) dan memperluas akses pustaka digital bagi mahasiswa dan dosen.",
      en: "FUSPI integrated academic services into the Academic Information System (SILA) and expanded digital library access for students and lecturers.",
      ar: "دمجت الكلية خدماتها الأكاديمية في نظام المعلومات الأكاديمي (SILA) ووسّعت الوصول إلى المكتبة الرقمية للطلاب والأساتذة.",
    },
  },
  {
    year: "2026",
    title: {
      id: "Menuju Akreditasi Unggul",
      en: "Toward Excellent Accreditation",
      ar: "نحو اعتماد ممتاز",
    },
    description: {
      id: "FUSPI memperluas kerja sama dengan perguruan tinggi keislaman nasional dan internasional, sembari menyiapkan reakreditasi menuju peringkat Unggul.",
      en: "FUSPI expanded partnerships with national and international Islamic higher-education institutions while preparing for reaccreditation toward an Excellent rating.",
      ar: "وسّعت الكلية شراكاتها مع مؤسسات التعليم العالي الإسلامي محلياً ودولياً، مع الاستعداد لإعادة الاعتماد نحو تصنيف ممتاز.",
    },
  },
] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("history")};
}

export default async function HistoryPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("history")} description={t("historyDesc")} />

      <ol className="relative mt-12 ms-3 border-s-2 border-slate-200 ps-8">
        {MILESTONES.map((milestone) => (
          <li key={milestone.year} className="relative pb-12 last:pb-0">
            <span className="absolute -start-[41px] top-0 flex size-7 items-center justify-center rounded-full border-2 border-royal-500 bg-white">
              <span className="size-2 rounded-full bg-royal-500" />
            </span>
            <span className="font-display text-lg font-bold text-royal-700">{milestone.year}</span>
            <h2 className="mt-1 font-display text-base font-semibold text-slate-900">
              {milestone.title[locale] ?? milestone.title.id}
            </h2>
            <p className="prose-measure mt-2 text-sm leading-relaxed text-slate-600">
              {milestone.description[locale] ?? milestone.description.id}
            </p>
          </li>
        ))}
      </ol>
    </Container>
  );
}
