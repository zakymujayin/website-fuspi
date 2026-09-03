import type {Metadata} from "next";
import {ArrowUpRight, FileCheck2} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {Prisma} from "@/generated/prisma/client";
import {StorageKeySchema} from "@/contracts/storage";
import type {AppLocale} from "@/i18n/routing";

const PROGRAM_SELECT = {
  id: true,
  code: true,
  slug: true,
  accreditation: true,
  accreditationAgency: true,
  accreditationDecreeNumber: true,
  accreditationExpiry: true,
  accreditationCertificateMedia: {
    select: {storageKey: true, storageClass: true, mimeType: true, originalName: true},
  },
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {locale: true, name: true},
  },
} as const;

function resolveTranslation<T extends {locale: string}>(rows: readonly T[], locale: AppLocale) {
  return rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === "id");
}

function formatDate(value: Date | null, locale: AppLocale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function certificateUrl(
  media: {storageKey: string; storageClass: string; mimeType: string; originalName: string} | null,
  uploadBase: string,
) {
  if (
    !media
    || media.storageClass !== "PUBLIC"
    || media.mimeType !== "application/pdf"
    || !StorageKeySchema.safeParse(media.storageKey).success
  ) return null;
  return {
    href: `${uploadBase.replace(/\/+$/u, "") || "/uploads"}/${media.storageKey}`,
    name: media.originalName,
  };
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("accreditation"), description: t("accreditationDesc")};
}

export default async function AccreditationPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");
  const tPages = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  let programs: Array<Prisma.StudyProgramGetPayload<{select: typeof PROGRAM_SELECT}>> = [];
  try {
    const rows = await getPrismaClient().studyProgram.findMany({
      where: {
        isActive: true,
        code: {in: institution.studyPrograms.map((program) => program.code)},
        translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
      },
      orderBy: [{order: "asc"}, {code: "asc"}],
      select: PROGRAM_SELECT,
    });
    programs = rows;
  } catch {
    // The public page keeps its composed empty state when the database is unavailable.
  }

  const uploadBase = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";

  return (
    <AcademicTopicShell resourceKey="accreditation">
      <section className="mt-12" aria-labelledby="accreditation-programs">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{tNav("studyPrograms")}</p>
            <h2 id="accreditation-programs" className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {tNav("studyPrograms")}
            </h2>
          </div>
          <span className="font-display text-sm font-semibold tabular-nums text-slate-400">{String(programs.length).padStart(2, "0")}</span>
        </div>

        {programs.length > 0 ? (
          <ol className="mt-8 grid gap-6">
            {programs.map((program, index) => {
              const translation = resolveTranslation(program.translations, locale);
              const contract = institution.studyPrograms.find((item) => item.code === program.code);
              const certificate = certificateUrl(program.accreditationCertificateMedia, uploadBase);
              const facts = [
                {label: t("accreditationGrade"), value: program.accreditation},
                {label: t("accreditationAgency"), value: program.accreditationAgency},
                {label: t("accreditationDecree"), value: program.accreditationDecreeNumber},
                {label: t("accreditationValidUntil"), value: formatDate(program.accreditationExpiry, locale)},
              ];

              return (
                <li key={program.id}>
                  <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.7)]">
                    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-navy-700 bg-navy-800 px-6 py-6 text-white md:px-8">
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="pt-1 font-display text-sm font-semibold tabular-nums tracking-[0.14em] text-brass-300">{String(index + 1).padStart(2, "0")}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{program.code}</p>
                          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
                            {translation?.name ?? contract?.name ?? program.code}
                          </h3>
                        </div>
                      </div>
                      <Link
                        href={`/prodi/${program.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors hover:text-brass-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-300"
                      >
                        {tNav("studyPrograms")}
                        <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.5} />
                      </Link>
                    </header>

                    <div className="grid gap-8 px-6 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
                      <div>
                        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                          {facts.map((fact) => (
                            <div key={fact.label}>
                              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{fact.label}</dt>
                              <dd className={`mt-2 break-words text-sm leading-6 ${fact.value ? "font-medium text-slate-800" : "italic text-slate-400"}`}>
                                {fact.value ?? tPages("noContent")}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      <div className="border-s border-slate-200 ps-0 lg:ps-8">
                        {certificate ? (
                          <a
                            href={certificate.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-full min-h-32 flex-col justify-between rounded-xl border border-royal-100 bg-royal-50/60 p-5 transition-colors hover:border-royal-300 hover:bg-royal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royal-500"
                          >
                            <FileCheck2 aria-hidden className="size-7 text-royal-600" strokeWidth={1.5} />
                            <span className="mt-8">
                              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-royal-700">{t("accreditationCertificate")}</span>
                              <span className="mt-2 block truncate text-sm font-medium text-slate-800">{certificate.name}</span>
                            </span>
                          </a>
                        ) : (
                          <div className="flex min-h-32 flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                            <FileCheck2 aria-hidden className="size-7 text-slate-400" strokeWidth={1.5} />
                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("accreditationCertificate")}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{t("accreditationUnavailable")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-sm leading-7 text-slate-500">{t("accreditationUnavailable")}</p>
          </div>
        )}
      </section>
    </AcademicTopicShell>
  );
}
