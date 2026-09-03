import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { LecturerEditorForm } from "@/components/admin/lecturer/lecturer-editor-form";
import { LecturerRelationsManager } from "@/components/admin/lecturer/lecturer-relations-manager";
import { EMPTY_LECTURER_TRANSLATION, type LecturerDraft, type LecturerProgramOption } from "@/components/admin/lecturer/lecturer-types";
import { institution } from "@/config/institution";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAcademicEditorDetail } from "@/features/academic/editor-import";
import { loadAdminLecturerRelations } from "@/features/academic/lecturer-relations";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("lecturers"), robots: { index: false, follow: false } };
}

export default async function EditLecturerPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/dosen/${id}/edit`, { roles: ["ADMIN"] });
  if (!decision.allow) redirect(decision.redirectTo);
  if (!session.ok) redirect(`/${appLocale}/admin`);

  const detail = await getAcademicEditorDetail(getPrismaClient(), session.session, { resource: "LECTURER", id });
  if (!detail.ok || detail.data.resource !== "LECTURER") notFound();
  const relations = await loadAdminLecturerRelations(getPrismaClient(), session.session, id);
  if (!relations.ok) notFound();
  const input = detail.data.input;
  const rows = await getPrismaClient().studyProgram.findMany({ where: { code: { in: institution.studyPrograms.map((program) => program.code) } }, orderBy: { order: "asc" }, select: { id: true, code: true, translations: { where: { locale: "id" }, select: { name: true } } } });
  const programs: LecturerProgramOption[] = rows.flatMap((row) => { const item = institution.studyPrograms.find((program) => program.code === row.code); return item ? [{ id: row.id, code: item.code, name: row.translations[0]?.name ?? item.name }] : []; });
  const translations = Object.fromEntries(["id", "en", "ar"].map((item) => { const key = item as "id" | "en" | "ar"; const value = input.translations[key]; return [key, value ? { position: value.position ?? "", expertise: value.expertise ?? "", bio: value.bio ?? "", officeHours: value.officeHours ?? "" } : { ...EMPTY_LECTURER_TRANSLATION }]; })) as LecturerDraft["translations"];
  const draft: LecturerDraft = { id, name: input.name, slug: input.slug, nidn: input.nidn ?? "", nip: input.nip ?? "", orcid: input.orcid ?? "", googleScholarUrl: input.googleScholarUrl?.href ?? "", sintaUrl: input.sintaUrl?.href ?? "", email: input.email ?? "", phone: input.phone ?? "", photoMediaId: input.photoMediaId, studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive, translations };
  return <section aria-labelledby="admin-lecturer-edit-title" className="flex flex-col gap-5"><div><Link href="/admin/dosen" className="text-sm font-medium text-primary hover:underline">← {locale === "id" ? "Kembali ke daftar" : locale === "en" ? "Back to list" : "العودة إلى القائمة"}</Link><h1 id="admin-lecturer-edit-title" className="mt-4 font-display text-3xl tracking-tight text-slate-950">{locale === "id" ? "Sunting dosen" : locale === "en" ? "Edit lecturer" : "تحرير المحاضر"}</h1><p className="mt-2 text-sm text-slate-500">{locale === "id" ? "Perbarui data dosen, penempatan program studi, dan rekam akademiknya." : locale === "en" ? "Update the lecturer data, study program assignment, and academic record." : "حدّث بيانات المحاضر وتعيين البرنامج والسجل الأكاديمي."}</p></div><LecturerEditorForm locale={locale as "id" | "en" | "ar"} mode="edit" initialDraft={draft} programs={programs} /><LecturerRelationsManager locale={locale as AppLocale} lecturerId={id} relations={relations.data} /></section>;
}
