import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import type { AppLocale } from "@/i18n/routing";

const VISION = {
  id: "Menjadi fakultas ushuluddin dan pemikiran Islam yang kredibel, kontekstual, dan berdaya saing global pada tahun 2045.",
  en: "To become a faculty of ushuluddin and Islamic thought that is credible, contextual, and globally competitive by 2045.",
  ar: "أن تصبح كلية أصول الدين والفكر الإسلامي موثوقة وسياقية وتنافسية عالمياً بحلول عام 2045.",
} as const;

const MISSIONS = [
  {
    id: "Menyelenggarakan pendidikan dan pengajaran ushuluddin dan pemikiran Islam yang berkualitas, responsif terhadap perkembangan ilmu, dan berorientasi pada pembentukan karakter.",
    en: "Deliver quality education and teaching in ushuluddin and Islamic thought that responds to scientific developments and focuses on character formation.",
    ar: "تقديم تعليم وتدريس عالي الجودة في أصول الدين والفكر الإسلامي يستجيب للتطور العلمي ويركز على بناء الشخصية.",
  },
  {
    id: "Mengembangkan penelitian keislaman yang kritis, integratif, dan bermanfaat bagi umat dan peradaban.",
    en: "Develop critical, integrative Islamic research that benefits the community and civilization.",
    ar: "تطوير بحث إسلامي نقدي وتكاملي ينفع الأمة والحضارة.",
  },
  {
    id: "Melaksanakan pengabdian kepada masyarakat berbasis ilmu ushuluddin untuk memperkuat kehidupan beragama dan berbangsa.",
    en: "Carry out community service rooted in ushuluddin knowledge to strengthen religious and national life.",
    ar: "تنفيذ خدمة المجتمع المستندة إلى علم أصول الدين لتعزيز الحياة الدينية والوطنية.",
  },
  {
    id: "Membangun kerja sama akademik dan kelembagaan di tingkat nasional maupun internasional.",
    en: "Build academic and institutional partnerships at national and international levels.",
    ar: "بناء شراكات أكاديمية ومؤسسية على المستويين الوطني والدولي.",
  },
] as const;

export async function VisionMissionSection({locale}: {locale: AppLocale}) {
  const t = await getTranslations("Home");
  const vision = VISION[locale] ?? VISION.id;

  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-royal-100 bg-royal-50 p-8 md:p-10">
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
              {t("visionLabel")}
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight text-royal-900 md:text-3xl">
              {vision}
            </h2>
          </div>

          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
              {t("missionLabel")}
            </span>
            <ul className="mt-6 space-y-5">
              {MISSIONS.map((mission, index) => {
                const text = mission[locale] ?? mission.id;
                return (
                  <li key={index} className="flex items-start gap-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-royal-100 text-xs font-bold text-royal-600">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                      {text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
