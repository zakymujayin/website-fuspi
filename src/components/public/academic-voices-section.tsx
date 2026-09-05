import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Reveal} from "@/components/public/reveal";
import {formatJakartaPublishedDate} from "@/components/public/post/format";
import {Container} from "@/components/ui/container";
import type {PublicAcademicDirectoryItemSchema} from "@/contracts/academic";
import type {PublicPostView} from "@/contracts/post";
import type {AppLocale} from "@/i18n/routing";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

type Lecturer = z.infer<typeof PublicAcademicDirectoryItemSchema>;
type ColumnGroup = {role: "DEKAN" | "DOSEN" | "MAHASISWA"; items: readonly PublicPostView[]};
const ROLE_KEY = {DEKAN: "dean", DOSEN: "lecturer", MAHASISWA: "student"} as const;

// Existing, supplied leadership portraits; CMS media remains the first choice.
const leadershipPortraits = [
  {name: "Masrukhin Muhsin", url: "/images/leadership/wd1-masrukhin.webp"},
  {name: "Endang Saeful Anwar", url: "/images/leadership/wd2-endang.webp"},
  {name: "Ade Fakih Kurniawan", url: "/images/leadership/wd3-ade-fakih.webp"},
  {name: "Ade Faqih Kurniawan", url: "/images/leadership/wd3-ade-fakih.webp"},
] as const;
const portraitFor = (lecturer: Lecturer) => lecturer.photo?.url ?? leadershipPortraits.find((portrait) => lecturer.name.includes(portrait.name))?.url;

export async function AcademicVoicesSection({
  groups,
  lecturers,
  locale,
}: {
  groups: readonly ColumnGroup[];
  lecturers: readonly Lecturer[];
  locale: AppLocale;
}) {
  const t = await getTranslations("Home");
  const columns = groups.flatMap((group) => group.items.slice(0, 2).map((item) => ({...item, role: group.role})));
  const [featured, ...rest] = columns;
  const portraitProfiles = lecturers.filter((lecturer) => portraitFor(lecturer));
  const curatedLecturers = (portraitProfiles.length >= 3 ? portraitProfiles : lecturers).slice(0, 4);
  if (!featured && lecturers.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.primary} bg-white`}>
      <Container>
        <div className="mb-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("columnsTitle")}</h2>
          </div>
          <div className="flex flex-col items-start justify-end lg:col-span-4">
            <p className="max-w-md text-sm leading-6 text-slate-600">{t("columnsDescription")}</p>
            <Link href="/kolom" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-royal-700 hover:text-royal-500">
              {t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <Reveal>
          <div className="grid w-full gap-10 lg:grid-cols-12">
            {featured ? (
              <Link href={`/kolom/${featured.slug}`} className={`group ${rest.length ? "lg:col-span-7" : "lg:col-span-12"}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-slate-200">
                  <ImageWithFallback
                    src={featured.cover?.url}
                    alt={featured.cover?.isDecorative ? "" : (featured.cover?.alt ?? featured.translation.value.title)}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    focalPoint={toFocalPoint(featured.cover)}
                  />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-royal-600">{t(`columnRole.${ROLE_KEY[featured.role]}`)}</p>
                <h3 className="mt-2 text-2xl font-bold leading-snug tracking-[-0.015em] text-slate-900 group-hover:text-royal-600 md:text-[28px]">{featured.translation.value.title}</h3>
                {featured.translation.value.excerpt ? <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">{featured.translation.value.excerpt}</p> : null}
                <p className="mt-2 text-xs text-slate-600">{featured.authorName} · {formatJakartaPublishedDate(featured.publishedAt, locale)}</p>
              </Link>
            ) : null}
            {rest.length > 0 ? (
              <div className="lg:col-span-5">
                <div className="border-t border-slate-900">
                  {rest.slice(0, 3).map((column) => (
                    <Link key={column.id} href={`/kolom/${column.slug}`} className="group block border-b border-slate-300 py-5">
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-royal-600">{t(`columnRole.${ROLE_KEY[column.role]}`)}</span>
                      <span className="mt-2 block text-lg font-bold leading-snug text-slate-900 group-hover:text-royal-600 md:text-xl">{column.translation.value.title}</span>
                      <span className="mt-2 block text-xs text-slate-600">{column.authorName}</span>
                      <time className="mt-2 block text-sm text-slate-700" dateTime={column.publishedAt.toISOString()}>{formatJakartaPublishedDate(column.publishedAt, locale)}</time>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Reveal>

        {lecturers.length > 0 ? (
          <div className="mt-16">
            <div className="flex items-end justify-between gap-4 border-b border-slate-900 pb-3">
              <h3 className="text-xl font-bold tracking-[-0.01em] text-slate-900 md:text-2xl">{t("lecturersTitle")}</h3>
              <Link href="/dosen" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-royal-700 hover:text-royal-500">{t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} /></Link>
            </div>
            <div className={`mt-6 flex snap-x snap-proximity gap-6 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible ${curatedLecturers.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
              {curatedLecturers.map((lecturer, index) => (
                <Reveal key={lecturer.id} index={index} className="w-[min(76vw,19rem)] shrink-0 snap-start sm:w-auto">
                  <Link href={`/dosen/${lecturer.slug}`} className="group block w-full border-b border-slate-300 pb-5">
                    <span className="relative mx-auto block aspect-[4/3] w-full overflow-hidden rounded-sm bg-slate-100">
                      {portraitFor(lecturer) ? <ImageWithFallback src={portraitFor(lecturer)} alt={lecturer.photo?.isDecorative ? "" : (lecturer.photo?.alt ?? lecturer.name)} className="object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" /> : <span aria-hidden className="grid size-full place-items-center text-4xl font-semibold text-royal-800">{lecturer.name.split(" ").filter((part) => !part.includes(".")).slice(0, 2).map((part) => part[0]).join("")}</span>}
                    </span>
                    <span className="mt-4 block">
                      <span className="block text-xl font-semibold leading-snug text-slate-900 group-hover:text-royal-800">{lecturer.name}</span>
                      {lecturer.secondaryText ? <span className="mt-2 block text-sm leading-6 text-slate-700">{lecturer.secondaryText}</span> : null}
                      {lecturer.studyProgram ? <span className="mt-1 block text-sm leading-6 text-royal-800">{lecturer.studyProgram.name}</span> : null}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
