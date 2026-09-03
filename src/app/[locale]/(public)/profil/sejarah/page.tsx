import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";

const HISTORY_INTRO = {
  id: "Sejarah FUSPI adalah cerita tentang penataan mandat keilmuan. Fakultas ini lahir bukan sebagai pemutusan tradisi, melainkan sebagai penguatan fokus akademik agar ilmu-ilmu ushuluddin dan pemikiran Islam memiliki ruang pengembangan yang lebih terarah.",
  en: "FUSPI's history is a story of clarifying an academic mandate. The faculty was born not as a break from tradition, but as a stronger focus so ushuluddin sciences and Islamic thought have a more directed space for development.",
  ar: "تاريخ الكلية هو قصة إعادة تنظيم للرسالة العلمية. فقد ولدت الكلية لا بوصفها انقطاعاً عن التقليد، بل تعميقاً للتركيز حتى تجد علوم أصول الدين والفكر الإسلامي فضاءً أوضح للتطور.",
} as const;

const SECTION_LABELS = {
  history: {
    id: "Sejarah",
    en: "History",
    ar: "التاريخ",
  },
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

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("history")} description={t("historyDesc")} />

      <article className="mt-10">
        <section
          className="border-y border-slate-200 py-10"
          aria-labelledby="history-narrative-title"
        >
          <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <h2 id="history-narrative-title" className="font-display text-2xl font-semibold text-slate-950">
                {SECTION_LABELS.history[locale] ?? SECTION_LABELS.history.id}
              </h2>
              <span aria-hidden className="mt-3 block h-0.5 w-16 bg-brass-500" />
            </div>

            <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
              <p className="text-base leading-8 text-slate-700">
                {HISTORY_INTRO[locale] ?? HISTORY_INTRO.id}
              </p>
              {NARRATIVE_SECTIONS.map((section) => (
                <div key={section.title.id}>
                  <h3 className="font-display text-base font-semibold text-slate-950">
                    {section.title[locale] ?? section.title.id}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {section.body[locale] ?? section.body.id}
                  </p>
                </div>
              ))}
              <div>
                <h3 className="font-display text-base font-semibold text-slate-950">
                  {locale === "en" ? "The first dean" : locale === "ar" ? "العميد الأول" : "Dekan pertama"}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {locale === "en"
                    ? `${deanProfile.name} became FUSPI's first dean. In its early period, the faculty began arranging governance, academic services, and scholarly direction around its clarified identity.`
                    : locale === "ar"
                      ? `تولى ${deanProfile.name} منصب العميد الأول للكلية. وفي مرحلتها الأولى بدأت الكلية بتنظيم الحوكمة والخدمات الأكاديمية واتجاه التطوير العلمي حول هويتها الواضحة.`
                      : `${deanProfile.name} menjadi dekan pertama FUSPI. Pada periode awal, fakultas mulai menata tata kelola, layanan akademik, dan arah pengembangan keilmuan sesuai dengan identitasnya yang lebih jelas.`}
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>
    </Container>
  );
}
