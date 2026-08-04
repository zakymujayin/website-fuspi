import {ArrowRight, BookOpen, Globe, Mail, MapPin, Users} from "lucide-react";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import {createPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const STUDY_PROGRAM_SELECT = {
  id: true, code: true, slug: true, degree: true, accreditation: true, accreditationYear: true,
  externalUrl: true, isActive: true,
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {locale: true, name: true, description: true, vision: true, mission: true, graduateProfile: true},
  },
} as const;

type ProdiRow = {
  id: string; code: string; slug: string; degree: string | null;
  accreditation: string | null; accreditationYear: number | null;
  externalUrl: string | null; isActive: boolean;
  translations: ReadonlyArray<{
    locale: string; name: string; description: string | null;
    vision: string | null; mission: string | null; graduateProfile: string | null;
  }>;
};

export async function generateStaticParams() {
  return institution.studyPrograms.map((p) => ({slug: p.slug}));
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}): Promise<Metadata> {
  const {locale, slug} = await params;
  const program = institution.studyPrograms.find((p) => p.slug === slug);
  if (!program) return {};
  const t = await getTranslations({locale, namespace: "Nav"});
  return {
    title: t(`program.${program.code}` as never),
    description: `Program studi ${program.name} — ${institution.name}`,
  };
}

function resolveTranslation<T extends {locale: string}>(items: ReadonlyArray<T>, locale: AppLocale): T | undefined {
  return items.find((t) => t.locale === locale) ?? items.find((t) => t.locale === "id");
}

export default async function ProdiDetailPage({params}: {params: Promise<{locale: AppLocale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("StudyPrograms");
  const tNav = await getTranslations("Nav");

  const program = institution.studyPrograms.find((p) => p.slug === slug);
  if (!program) notFound();

  let dbProdi: ProdiRow | null = null;
  try {
    const prisma = createPrismaClient();
    const rows = await prisma.studyProgram.findMany({
      where: {slug},
      select: STUDY_PROGRAM_SELECT,
    }) as ProdiRow[];
    dbProdi = rows[0] ?? null;
  } catch {
    // database unavailable
  }

  const tl = dbProdi ? resolveTranslation(dbProdi.translations, locale) : null;
  const accreditation = dbProdi?.accreditation ?? null;
  const accreditationYear = dbProdi?.accreditationYear ?? null;

  return (
    <Container className="py-12 md:py-20">
      {/* Breadcrumb */}
      <nav aria-label={t("breadcrumbLabel")} className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="transition-colors hover:text-royal-600">{tNav("home")}</Link>
        <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
        <Link href="/prodi" className="transition-colors hover:text-royal-600">{tNav("studyPrograms")}</Link>
        <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
        <span className="text-slate-800">{tNav(`program.${program.code}`)}</span>
      </nav>

      {/* Header */}
      <div className="mb-12">
        <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">{program.code}</span>
        <SectionHeading
          as="h1"
          id="prodi-title"
          title={tl?.name ?? tNav(`program.${program.code}`)}
          description={tl?.description ?? undefined}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          {accreditation ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brass-100 px-3 py-1 text-xs font-medium text-brass-700">
              {t("accreditation")}: {accreditation}{accreditationYear ? ` (${accreditationYear})` : ""}
            </span>
          ) : null}
          {dbProdi?.degree ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
              {dbProdi.degree}
            </span>
          ) : null}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-12">
          {tl?.description ? (
            <section aria-labelledby="description-heading">
              <h2 id="description-heading" className="section-rule font-display text-xl font-bold text-slate-900">
                {t("aboutProgram")}
              </h2>
              <div className="prose prose-slate mt-6 max-w-none" dangerouslySetInnerHTML={{__html: tl.description}} />
            </section>
          ) : null}

          {tl?.vision ? (
            <section aria-labelledby="vision-heading" className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
                  <BookOpen data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h2 id="vision-heading" className="font-display text-lg font-semibold text-slate-900">
                    {t("vision")}
                  </h2>
                  <p className="mt-3 leading-relaxed text-slate-600">{tl.vision}</p>
                </div>
              </div>
            </section>
          ) : null}

          {tl?.mission ? (
            <section aria-labelledby="mission-heading" className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              <h2 id="mission-heading" className="section-rule font-display text-xl font-bold text-slate-900">
                {t("mission")}
              </h2>
              <div className="prose prose-slate mt-6 max-w-none" dangerouslySetInnerHTML={{__html: tl.mission}} />
            </section>
          ) : null}

          {tl?.graduateProfile ? (
            <section aria-labelledby="graduates-heading" className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
                  <Users data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h2 id="graduates-heading" className="font-display text-lg font-semibold text-slate-900">
                    {t("graduateProfile")}
                  </h2>
                  <div className="prose prose-slate mt-4 max-w-none" dangerouslySetInnerHTML={{__html: tl.graduateProfile}} />
                </div>
              </div>
            </section>
          ) : null}

          {!tl ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">{t("noContent")}</p>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Quick facts */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="section-rule font-display text-sm font-semibold text-slate-900">
              {t("quickFacts")}
            </h3>
            <dl className="mt-4 space-y-3">
              {program.code ? (
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase">{t("programCode")}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-700">{program.code}</dd>
                </div>
              ) : null}
              {dbProdi?.degree ? (
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase">{t("degree")}</dt>
                  <dd className="mt-0.5 text-sm text-slate-700">{dbProdi.degree}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-slate-200 p-6">
            <h3 className="section-rule font-display text-sm font-semibold text-slate-900">
              {t("moreInfo")}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/kontak"
                  className="inline-flex items-center gap-2 text-sm text-royal-600 transition-colors hover:text-royal-700"
                >
                  <Mail data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                  {tNav("contact")}
                </Link>
              </li>
              {dbProdi?.externalUrl ? (
                <li>
                  <a
                    href={dbProdi.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-royal-600 transition-colors hover:text-royal-700"
                  >
                    <Globe data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                    {t("externalSite")}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Other programs */}
          <div className="rounded-xl border border-slate-200 p-6">
            <h3 className="section-rule font-display text-sm font-semibold text-slate-900">
              {tNav("studyPrograms")}
            </h3>
            <ul className="mt-4 space-y-2">
              {institution.studyPrograms.filter((p) => p.slug !== slug).map((p) => (
                <li key={p.code}>
                  <Link
                    href={`/prodi/${p.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-royal-600"
                  >
                    <span className="text-xs font-medium text-slate-400">{p.code}</span>
                    <span className="ms-2">{tNav(`program.${p.code}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
