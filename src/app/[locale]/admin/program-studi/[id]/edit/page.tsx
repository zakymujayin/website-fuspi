import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {notFound, redirect} from "next/navigation";

import {ProgramStudioEditorForm} from "@/components/admin/academic/program-studi-editor-form";
import {EMPTY_PROGRAM_STUDIO_TRANSLATION, PROGRAM_STUDIO_LOCALES, type ProgramStudioDraft} from "@/components/admin/academic/program-studi-types";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";

export async function generateMetadata({params}: {params: Promise<{locale: string; id: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("studyPrograms"), robots: {index: false, follow: false}};
}

export default async function EditProgramStudioPage({params}: {params: Promise<{locale: string; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/program-studi/${id}/edit`, {roles: ["ADMIN"]});
  if (!decision.allow) redirect(decision.redirectTo);

  const row = await getPrismaClient().studyProgram.findUnique({
    where: {id},
    select: {id: true, code: true, slug: true, degree: true, accreditation: true, accreditationExpiry: true, email: true, phone: true, logoMediaId: true, curriculumDocumentId: true, brochureDocumentId: true, isActive: true, order: true, contentOwnerId: true, version: true, translations: {select: {locale: true, name: true, description: true, vision: true, mission: true, objectives: true, learningOutcomes: true, graduateProfile: true, careerProspects: true}}},
  });
  if (!row || !institution.studyPrograms.some((program) => program.code === row.code)) notFound();

  const translations = Object.fromEntries(PROGRAM_STUDIO_LOCALES.map((translationLocale) => {
    const translation = row.translations.find((item) => item.locale === translationLocale);
    return [translationLocale, translation ? {
      name: translation.name,
      description: translation.description ?? "",
      vision: translation.vision ?? "",
      mission: translation.mission ?? "",
      objectives: translation.objectives ?? "",
      learningOutcomes: translation.learningOutcomes ?? "",
      graduateProfile: translation.graduateProfile ?? "",
      careerProspects: translation.careerProspects ?? "",
    } : {...EMPTY_PROGRAM_STUDIO_TRANSLATION}];
  })) as ProgramStudioDraft["translations"];

  const draft: ProgramStudioDraft = {
    id: row.id,
    version: row.version,
    code: row.code as ProgramStudioDraft["code"],
    slug: row.slug,
    degree: "S1",
    accreditation: row.accreditation ?? "",
    accreditationExpiry: row.accreditationExpiry?.toISOString().slice(0, 10) ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    logoMediaId: row.logoMediaId,
    curriculumDocumentId: row.curriculumDocumentId,
    brochureDocumentId: row.brochureDocumentId,
    isActive: row.isActive,
    order: row.order,
    contentOwnerId: row.contentOwnerId,
    translations,
  };
  const t = await getTranslations("Nav");

  return (
    <section aria-labelledby="admin-study-program-edit-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{row.code}</p>
          <h1 id="admin-study-program-edit-title" className="section-rule mt-2 font-display text-2xl text-slate-900">{t("studyPrograms")}</h1>
          <p className="mt-2 max-w-prose text-sm text-slate-500">Masukkan dan perbarui data resmi program studi. Perubahan akan tampil di halaman publik setelah disimpan.</p>
        </div>
        <Link href="/admin/program-studi" className="text-sm font-medium text-primary hover:underline">{t("studyPrograms")}</Link>
      </div>
      <ProgramStudioEditorForm initialDraft={draft} />
    </section>
  );
}
