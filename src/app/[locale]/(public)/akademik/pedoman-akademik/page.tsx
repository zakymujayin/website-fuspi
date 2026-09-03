import type {Metadata} from "next";
import {Download} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {dummyGuidelines} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("academicGuidelines"), description: t("academicGuidelinesDesc")};
}

export default async function AcademicGuidelinesPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");

  return (
    <AcademicTopicShell
      resourceKey="academicGuidelines"
      meta={[`${dummyGuidelines.length} ${t("documentName")}`]}
    >
      <div className="grid gap-8">
        {dummyGuidelines.map((guideline) => (
          <section
            key={guideline.id}
            className="border border-slate-200 bg-white"
            aria-labelledby={guideline.id}
          >
            <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="p-6 md:p-8">
                <h2 id={guideline.id} className="font-display text-xl font-semibold text-slate-950">
                  {guideline.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {guideline.summary}
                </p>

                <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("guidelineChapters")}
                </h3>
                <ol className="mt-3 grid gap-2">
                  {guideline.chapters.map((chapter, index) => (
                    <li key={chapter} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                      <span className="font-mono text-xs text-royal-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {chapter}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col justify-center gap-4 border-t border-slate-200 bg-slate-50 p-6 lg:border-t-0 lg:border-s">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  {guideline.fileType} &middot; {guideline.fileSize}
                </p>
                <a
                  href={guideline.fileUrl}
                  download
                  aria-label={t("documentDownloadFor", {title: guideline.title})}
                  className="inline-flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:border-royal-300 hover:text-royal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
                >
                  <Download aria-hidden className="size-4" strokeWidth={1.5} />
                  {t("documentDownload")}
                </a>
              </div>
            </div>
          </section>
        ))}
      </div>
    </AcademicTopicShell>
  );
}
