import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";

const MILESTONES = [
  {
    year: {
      id: "Sebelum 2026",
      en: "Before 2026",
      ar: "قبل 2026",
    },
    title: {
      id: "Satu Rumah Keilmuan",
      en: "One Academic Home",
      ar: "بيت علمي واحد",
    },
    description: {
      id: "Kajian ushuluddin, pemikiran Islam, adab, dan humaniora sebelumnya berada dalam satu lingkungan akademik di Fakultas Ushuluddin dan Adab. Dari ruang bersama inilah tradisi keilmuan, layanan pendidikan, dan jaringan akademik berkembang.",
      en: "Ushuluddin, Islamic thought, adab, and humanities studies previously shared one academic environment in the Faculty of Ushuluddin and Adab. From that shared setting, scholarly traditions, educational services, and academic networks developed.",
      ar: "كانت دراسات أصول الدين والفكر الإسلامي والأدب والإنسانيات في السابق ضمن بيئة أكاديمية واحدة في كلية أصول الدين والآداب. ومن هذا الفضاء المشترك نمت التقاليد العلمية والخدمات التعليمية والشبكات الأكاديمية.",
    },
  },
  {
    year: {
      id: "1 Juli 2026",
      en: "1 July 2026",
      ar: "1 يوليو 2026",
    },
    title: {
      id: "FUSPI Resmi Berdiri",
      en: "FUSPI Officially Established",
      ar: "تأسيس الكلية رسمياً",
    },
    description: {
      id: "Fakultas Ushuluddin dan Pemikiran Islam berdiri sebagai fakultas yang memusatkan mandat akademiknya pada ilmu-ilmu ushuluddin, kajian pemikiran Islam, dan penguatan tradisi keilmuan yang relevan bagi masyarakat.",
      en: "The Faculty of Ushuluddin and Islamic Thought was established as a faculty focused on ushuluddin sciences, Islamic thought studies, and the strengthening of scholarly traditions that remain relevant to society.",
      ar: "تأسست كلية أصول الدين والفكر الإسلامي كليةً تركز رسالتها الأكاديمية على علوم أصول الدين ودراسات الفكر الإسلامي وتعزيز التقاليد العلمية ذات الصلة بالمجتمع.",
    },
  },
  {
    year: {
      id: "2026",
      en: "2026",
      ar: "2026",
    },
    title: {
      id: "Pemisahan Adab dan Humaniora",
      en: "Adab and Humanities Separation",
      ar: "استقلال الأدب والإنسانيات",
    },
    description: {
      id: "Pembentukan Fakultas Adab dan Humaniora sebagai fakultas baru menandai penataan kelembagaan yang lebih fokus. FUSPI melanjutkan mandat ushuluddin dan pemikiran Islam, sementara bidang adab dan humaniora memperoleh rumah akademik tersendiri.",
      en: "The establishment of the Faculty of Adab and Humanities as a new faculty marked a more focused institutional structure. FUSPI continued the ushuluddin and Islamic thought mandate, while adab and humanities gained their own academic home.",
      ar: "مثّل تأسيس كلية الأدب والإنسانيات كليةً جديدة تنظيماً مؤسسياً أكثر تركيزاً. وواصلت كلية أصول الدين والفكر الإسلامي رسالتها في أصول الدين والفكر الإسلامي، بينما أصبح للأدب والإنسانيات بيت أكاديمي مستقل.",
    },
  },
  {
    year: {
      id: "Periode Awal",
      en: "Early Period",
      ar: "الفترة الأولى",
    },
    title: {
      id: "Kepemimpinan Dekan Pertama",
      en: "First Dean's Leadership",
      ar: "قيادة العميد الأول",
    },
    description: {
      id: "Dr. Masykur, M.Hum. menjadi dekan pertama FUSPI. Pada fase awal ini, fakultas menata tata kelola, layanan akademik, dan arah pengembangan keilmuan agar identitas baru FUSPI hadir dengan jelas dan bertanggung jawab.",
      en: "Dr. Masykur, M.Hum. became FUSPI's first dean. In this early phase, the faculty organized governance, academic services, and scholarly direction so FUSPI's new identity could stand clearly and responsibly.",
      ar: "تولى الدكتور مسكور، الماجستير في العلوم الإنسانية، منصب العميد الأول للكلية. وفي هذه المرحلة الأولى رتبت الكلية الحوكمة والخدمات الأكاديمية واتجاه التطوير العلمي لكي تظهر هوية الكلية الجديدة بوضوح ومسؤولية.",
    },
  },
] as const;

const HISTORY_INTRO = {
  id: "Sejarah FUSPI adalah cerita tentang penataan mandat keilmuan. Fakultas ini lahir bukan sebagai pemutusan tradisi, melainkan sebagai penguatan fokus akademik agar ilmu-ilmu ushuluddin dan pemikiran Islam memiliki ruang pengembangan yang lebih terarah.",
  en: "FUSPI's history is a story of clarifying an academic mandate. The faculty was born not as a break from tradition, but as a stronger focus so ushuluddin sciences and Islamic thought have a more directed space for development.",
  ar: "تاريخ الكلية هو قصة إعادة تنظيم للرسالة العلمية. فقد ولدت الكلية لا بوصفها انقطاعاً عن التقليد، بل تعميقاً للتركيز حتى تجد علوم أصول الدين والفكر الإسلامي فضاءً أوضح للتطور.",
} as const;

const ESTABLISHMENT_NOTE = {
  id: "Berdiri pada 1 Juli 2026",
  en: "Established on 1 July 2026",
  ar: "تأسست في 1 يوليو 2026",
} as const;

const DEAN_LABEL = {
  id: "Dekan Pertama",
  en: "First Dean",
  ar: "العميد الأول",
} as const;

const FACULTY_FOCUS = {
  id: "FUSPI hadir sebagai fakultas yang memusatkan perhatian pada penguatan kajian ushuluddin, pemikiran Islam, dan layanan akademik yang berorientasi pada kemaslahatan publik.",
  en: "FUSPI serves as a faculty focused on strengthening ushuluddin studies, Islamic thought, and academic services oriented toward public benefit.",
  ar: "تنهض الكلية بدورها في تعزيز دراسات أصول الدين والفكر الإسلامي والخدمات الأكاديمية الموجهة إلى المصلحة العامة.",
} as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("history")};
}

export default async function HistoryPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const deanPosition = deanProfile.position[locale] ?? deanProfile.position.id;

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("history")} description={t("historyDesc")} />

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="border-s-4 border-brass-400 bg-royal-50/60 py-8 ps-8 pe-6">
          <p className="max-w-[68ch] font-display text-2xl font-semibold leading-snug text-slate-950 md:text-3xl">
            {HISTORY_INTRO[locale] ?? HISTORY_INTRO.id}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-royal-100 bg-white p-5">
              <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
                {ESTABLISHMENT_NOTE[locale] ?? ESTABLISHMENT_NOTE.id}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {FACULTY_FOCUS[locale] ?? FACULTY_FOCUS.id}
              </p>
            </div>
            <div className="border border-royal-100 bg-white p-5">
              <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
                {DEAN_LABEL[locale] ?? DEAN_LABEL.id}
              </span>
              <p className="mt-3 font-display text-lg font-bold text-slate-900">{deanProfile.name}</p>
              <p className="mt-1 text-sm text-slate-500">{deanPosition}</p>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="relative aspect-[4/5] overflow-hidden border border-slate-200 bg-slate-100">
            <Image
              src={deanProfile.photoUrl ?? "/images/leadership/dekan-masykur.webp"}
              alt={deanProfile.name}
              fill
              sizes="(min-width: 1024px) 360px, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="border-x border-b border-slate-200 bg-white p-5">
            <p className="text-xs font-medium tracking-wide text-royal-600 uppercase">
              {DEAN_LABEL[locale] ?? DEAN_LABEL.id}
            </p>
            <p className="mt-2 font-display text-lg font-bold text-slate-900">{deanProfile.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{deanPosition}</p>
          </div>
        </aside>
      </div>

      <ol className="relative mt-16 ms-3 border-s-2 border-slate-200 ps-8">
        {MILESTONES.map((milestone) => (
          <li key={milestone.title.id} className="relative pb-12 last:pb-0">
            <span className="absolute -start-[41px] top-0 flex size-7 items-center justify-center rounded-full border-2 border-royal-500 bg-white">
              <span className="size-2 rounded-full bg-royal-500" />
            </span>
            <span className="font-display text-lg font-bold text-royal-700">
              {milestone.year[locale] ?? milestone.year.id}
            </span>
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
