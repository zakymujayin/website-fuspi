import type {Metadata} from "next";
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

const NARRATIVE_SECTIONS = [
  {
    title: {
      id: "Dari rumah keilmuan bersama",
      en: "From one shared academic home",
      ar: "من بيت علمي مشترك",
    },
    body: {
      id: "Sebelum berdiri sebagai fakultas tersendiri, kajian ushuluddin, pemikiran Islam, adab, dan humaniora berada dalam satu lingkungan akademik. Dari ruang bersama itu tumbuh tradisi pengajaran, penelitian, dan pelayanan pendidikan yang menjadi dasar penataan kelembagaan berikutnya.",
      en: "Before standing as its own faculty, ushuluddin, Islamic thought, adab, and humanities studies shared one academic environment. From that shared space grew teaching, research, and educational-service traditions that became the basis for the next institutional arrangement.",
      ar: "قبل أن تصبح الكلية قائمة بذاتها، اجتمعت دراسات أصول الدين والفكر الإسلامي والأدب والإنسانيات في بيئة أكاديمية واحدة. ومن ذلك الفضاء المشترك نمت تقاليد التعليم والبحث والخدمة التعليمية التي أصبحت أساساً للتنظيم المؤسسي التالي.",
    },
  },
  {
    title: {
      id: "Penataan mandat pada 1 Juli 2026",
      en: "Clarifying the mandate on 1 July 2026",
      ar: "تنظيم الرسالة في 1 يوليو 2026",
    },
    body: {
      id: "Pada 1 Juli 2026, Fakultas Ushuluddin dan Pemikiran Islam berdiri sebagai ruang akademik yang memusatkan perhatian pada ilmu-ilmu ushuluddin dan kajian pemikiran Islam. Pembentukan ini menegaskan fokus kelembagaan, bukan memutus kesinambungan tradisi keilmuan yang telah berkembang sebelumnya.",
      en: "On 1 July 2026, the Faculty of Ushuluddin and Islamic Thought was established as an academic space focused on ushuluddin sciences and Islamic thought. This formation clarified the institutional focus without breaking the continuity of scholarly traditions that had already developed.",
      ar: "في 1 يوليو 2026 تأسست كلية أصول الدين والفكر الإسلامي فضاءً أكاديمياً يركز على علوم أصول الدين ودراسات الفكر الإسلامي. وقد أكد هذا التأسيس التركيز المؤسسي دون قطع استمرارية التقاليد العلمية التي نمت من قبل.",
    },
  },
  {
    title: {
      id: "FUSPI dan Adab-Humaniora setelah pemisahan",
      en: "FUSPI and Adab-Humanities after separation",
      ar: "الكلية والأدب والإنسانيات بعد الاستقلال",
    },
    body: {
      id: "Pemisahan Fakultas Adab dan Humaniora sebagai fakultas baru memberi kejelasan rumah akademik bagi dua rumpun keilmuan. FUSPI melanjutkan mandat ushuluddin dan pemikiran Islam, sementara bidang adab dan humaniora memperoleh ruang pengembangan tersendiri.",
      en: "The separation of the Faculty of Adab and Humanities as a new faculty gave clearer academic homes to the two knowledge clusters. FUSPI continued the ushuluddin and Islamic thought mandate, while adab and humanities gained their own space for development.",
      ar: "منح استقلال كلية الأدب والإنسانيات كليةً جديدة وضوحاً أكبر للبيتين العلميين. وواصلت كلية أصول الدين والفكر الإسلامي رسالتها في أصول الدين والفكر الإسلامي، بينما حصلت مجالات الأدب والإنسانيات على فضائها الخاص للتطور.",
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
  const deanPosition = deanProfile.position[locale] ?? deanProfile.position.id;

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("history")} description={t("historyDesc")} />

      <article className="mt-12 max-w-5xl">
        <div className="border-y border-slate-200 py-8 md:py-10">
          <p className="max-w-[64ch] text-xl font-semibold leading-relaxed text-slate-950 md:text-2xl md:leading-relaxed">
            {HISTORY_INTRO[locale] ?? HISTORY_INTRO.id}
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {NARRATIVE_SECTIONS.map((section) => (
            <section
              key={section.title.id}
              className="grid gap-5 py-8 md:grid-cols-[16rem_minmax(0,1fr)] md:py-10"
            >
              <h2 className="font-display text-xl font-semibold leading-snug text-slate-950">
                {section.title[locale] ?? section.title.id}
              </h2>
              <p className="prose-measure text-base leading-8 text-slate-700">
                {section.body[locale] ?? section.body.id}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-4 border-s-2 border-brass-400 bg-white ps-5" aria-labelledby="first-dean-title">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-royal-600">
            {ESTABLISHMENT_NOTE[locale] ?? ESTABLISHMENT_NOTE.id}
          </p>
          <h2 id="first-dean-title" className="mt-2 font-display text-xl font-semibold text-slate-950">
            {DEAN_LABEL[locale] ?? DEAN_LABEL.id}: {deanProfile.name}
          </h2>
          <p className="prose-measure mt-2 text-sm leading-7 text-slate-600">
            {deanPosition}
          </p>
        </section>
      </article>

      <ol className="relative mt-14 max-w-4xl border-t border-slate-200">
        {MILESTONES.map((milestone) => (
          <li key={milestone.title.id} className="grid gap-4 border-b border-slate-200 py-6 md:grid-cols-[12rem_minmax(0,1fr)]">
            <span className="font-display text-lg font-semibold text-royal-700">
              {milestone.year[locale] ?? milestone.year.id}
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950">
                {milestone.title[locale] ?? milestone.title.id}
              </h2>
              <p className="prose-measure mt-2 text-sm leading-7 text-slate-600">
                {milestone.description[locale] ?? milestone.description.id}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Container>
  );
}
