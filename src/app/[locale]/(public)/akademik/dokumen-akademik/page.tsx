import type {Metadata} from "next";
import {Download} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicTopicShell} from "@/components/public/academic-topic-shell";
import {dummyAcademicDocuments, type DocumentCategory} from "@/lib/data/dummy-academic";
import type {AppLocale} from "@/i18n/routing";

const CATEGORY_LABEL_KEY: Record<DocumentCategory, string> = {
  regulation: "categoryRegulation",
  form: "categoryForm",
  report: "categoryReport",
  guide: "categoryGuide",
};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const tNav = await getTranslations({locale, namespace: "Nav"});
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: tNav("academicDocs"), description: t("academicDocsDesc")};
}

export default async function AcademicDocumentsPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Academic");

  const years = [...new Set(dummyAcademicDocuments.map((doc) => doc.year))].sort((a, b) => b - a);

  return (
    <AcademicTopicShell
      resourceKey="academicDocs"
      meta={[`${dummyAcademicDocuments.length} ${t("documentName")}`]}
    >
      <div className="grid gap-10">
        {years.map((year) => (
          <section key={year} aria-labelledby={`year-${year}`}>
            <h2
              id={`year-${year}`}
              className="border-b border-slate-200 pb-3 font-display text-lg font-semibold text-slate-950"
            >
              {year}
            </h2>

            {/* Each row is the document itself with its own download action —
                no hop through a filtered archive to reach the file. */}
            <ul className="border-b border-slate-200">
              {dummyAcademicDocuments
                .filter((doc) => doc.year === year)
                .map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 py-4 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-950">{doc.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t(CATEGORY_LABEL_KEY[doc.category] as never)} &middot; {doc.fileType} &middot;{" "}
                        {doc.fileSize}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      download
                      aria-label={t("documentDownloadFor", {title: doc.title})}
                      className="inline-flex h-10 shrink-0 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:border-royal-300 hover:text-royal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
                    >
                      <Download aria-hidden className="size-4" strokeWidth={1.5} />
                      {t("documentDownload")}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </AcademicTopicShell>
  );
}
