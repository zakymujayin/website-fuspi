import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {getPrismaClient} from "@/lib/db/client";
import {getPublicSiteSetting} from "@/features/home-nav/public-query";

const HISTORY_INTRO = {
  id: "Sejarah FUSPI adalah cerita tentang penataan mandat keilmuan. Fakultas ini lahir bukan sebagai pemutusan tradisi, melainkan sebagai penguatan fokus akademik agar ilmu-ilmu ushuluddin dan pemikiran Islam memiliki ruang pengembangan yang lebih terarah.",
  en: "FUSPI's history is a story of clarifying an academic mandate. The faculty was born not as a break from tradition, but as a stronger focus so ushuluddin sciences and Islamic thought have a more directed space for development.",
  ar: "تاريخ الكلية هو قصة إعادة تنظيم للرسالة العلمية. فقد ولدت الكلية لا بوصفها انقطاعاً عن التقليد، بل تعميقاً للتركيز حتى تجد علوم أصول الدين والفكر الإسلامي فضاءً أوضح للتطور.",
} as const;

type NarrativeSection = {
  title: Record<AppLocale, string>;
  body: Record<AppLocale, string>;
};

/**
 * Ordered chronologically and rendered in a single column: the narrative is
 * read top to bottom, so a two-column grid would zigzag the timeline.
 */
const NARRATIVE_SECTIONS: readonly NarrativeSection[] = [
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
];

const FIRST_DEAN_TITLE = {
  id: "Dekan pertama",
  en: "The first dean",
  ar: "العميد الأول",
} as const;

function firstDeanBody(name: string) {
  return {
    id: `${name} menjadi dekan pertama FUSPI. Pada periode awal, fakultas mulai menata tata kelola, layanan akademik, dan arah pengembangan keilmuan sesuai dengan identitasnya yang lebih jelas.`,
    en: `${name} became FUSPI's first dean. In its early period, the faculty began arranging governance, academic services, and scholarly direction around its clarified identity.`,
    ar: `تولى ${name} منصب العميد الأول للكلية. وفي مرحلتها الأولى بدأت الكلية بتنظيم الحوكمة والخدمات الأكاديمية واتجاه التطوير العلمي حول هويتها الواضحة.`,
  } as const;
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("history")};
}

export default async function HistoryPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const siteSetting = await getPublicSiteSetting(
    getPrismaClient(),
    locale,
    process.env.UPLOAD_PUBLIC_URL ?? "/uploads",
  );
  const dean = siteSetting?.dean;
  const deanName = dean?.name ?? deanProfile.name;
  const deanPhotoUrl = dean?.photo?.url ?? deanProfile.photoUrl;
  const deanPosition = dean?.position ?? (deanProfile.position[locale] ?? deanProfile.position.id);
  const deanBody = firstDeanBody(deanName);

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("history")} description={t("historyDesc")} />

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] lg:gap-16">
        <article className="border-t border-slate-200 pt-10">
          <p className="max-w-4xl text-lg leading-8 text-slate-700">
            {HISTORY_INTRO[locale] ?? HISTORY_INTRO.id}
          </p>

          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-12">
            {NARRATIVE_SECTIONS.map((section, index) => (
              <section key={section.title.id} className={index === 0 ? "md:col-span-2" : ""}>
                <p className="text-xs font-semibold tracking-[0.14em] text-royal-600 uppercase">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-display text-xl font-semibold text-slate-950">
                  {section.title[locale] ?? section.title.id}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  {section.body[locale] ?? section.body.id}
                </p>
              </section>
            ))}
          </div>
        </article>

        <aside className="border-t border-slate-200 pt-8 lg:border-s lg:border-t-0 lg:ps-10 lg:pt-10">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-semibold tracking-[0.14em] text-royal-600 uppercase">
              {t("dean")}
            </p>
            <figure className="mt-4">
              <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden border border-slate-200 bg-slate-100">
                {deanPhotoUrl ? (
                  <ImageWithFallback
                    src={deanPhotoUrl}
                    alt={deanName}
                    className="object-cover"
                    sizes="(min-width: 1024px) 25rem, (min-width: 640px) 24rem, 100vw"
                  />
                ) : (
                  <DeanAvatarPlate initials={deanProfile.initials} name={deanName} />
                )}
              </div>
              <figcaption className="mt-4 text-sm leading-relaxed text-slate-500">
                <span className="block font-display text-lg font-semibold text-slate-950">{deanName}</span>
                {deanPosition}
              </figcaption>
            </figure>
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="font-display text-xl font-semibold text-slate-950">
                {FIRST_DEAN_TITLE[locale] ?? FIRST_DEAN_TITLE.id}
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600">
                {deanBody[locale] ?? deanBody.id}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
