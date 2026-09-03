import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LecturerEditorForm } from "@/components/admin/lecturer/lecturer-editor-form";
import type { LecturerProgramOption } from "@/components/admin/lecturer/lecturer-types";
import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("lecturers"), robots: { index: false, follow: false } };
}

export default async function NewLecturerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/dosen/baru`, { roles: ["ADMIN"] });
  if (!decision.allow) redirect(decision.redirectTo);
  const rows = await getPrismaClient().studyProgram.findMany({ where: { code: { in: institution.studyPrograms.map((program) => program.code) } }, orderBy: { order: "asc" }, select: { id: true, code: true, translations: { where: { locale: "id" }, select: { name: true } } } });
  const programs: LecturerProgramOption[] = rows.flatMap((row) => { const item = institution.studyPrograms.find((program) => program.code === row.code); return item ? [{ id: row.id, code: item.code, name: row.translations[0]?.name ?? item.name }] : []; });
  return <section aria-labelledby="admin-lecturer-create-title" className="flex flex-col gap-5"><div><Link href="/admin/dosen" className="text-sm font-medium text-primary hover:underline">← {locale === "id" ? "Kembali ke daftar" : locale === "en" ? "Back to list" : "العودة إلى القائمة"}</Link><h1 id="admin-lecturer-create-title" className="mt-4 font-display text-3xl tracking-tight text-slate-950">{locale === "id" ? "Tambah dosen" : locale === "en" ? "Add lecturer" : "إضافة محاضر"}</h1><p className="mt-2 text-sm text-slate-500">{locale === "id" ? "Lengkapi data utama dan pilih program studi dosen." : locale === "en" ? "Complete the identity details and choose the lecturer’s study program." : "أكمل بيانات الهوية واختر البرنامج الدراسي للمحاضر."}</p></div><LecturerEditorForm locale={locale as "id" | "en" | "ar"} mode="create" programs={programs} /></section>;
}

