import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { LecturerList } from "@/components/admin/lecturer/lecturer-list";
import type { LecturerListItem, LecturerProgramOption } from "@/components/admin/lecturer/lecturer-types";
import { institution } from "@/config/institution";
import type { AppLocale } from "@/i18n/routing";
import { getPrismaClient } from "@/lib/db/client";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { StorageKeySchema } from "@/contracts/storage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });
  return { title: t("lecturers"), robots: { index: false, follow: false } };
}

export default async function AdminLecturersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; prodi?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/dosen`, { roles: ["ADMIN"] });
  if (!decision.allow) redirect(decision.redirectTo);

  const validPrograms = institution.studyPrograms;
  const rawSearch = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
  const rawProgramId = typeof query.prodi === "string" ? query.prodi.trim() : "";
  const prisma = getPrismaClient();
  const programs = await prisma.studyProgram.findMany({
    where: { code: { in: validPrograms.map((program) => program.code) } },
    orderBy: { order: "asc" },
    select: { id: true, code: true, translations: { where: { locale: "id" }, select: { name: true } } },
  });
  const allowedProgramIds = new Set(programs.map((program) => program.id));
  const programId = allowedProgramIds.has(rawProgramId) ? rawProgramId : "";
  const rows = await prisma.lecturer.findMany({
    where: {
      ...(programId ? { studyProgramId: programId } : {}),
      ...(rawSearch ? { OR: [
        { name: { contains: rawSearch, mode: "insensitive" } },
        { slug: { contains: rawSearch, mode: "insensitive" } },
        { nidn: { contains: rawSearch, mode: "insensitive" } },
        { nip: { contains: rawSearch, mode: "insensitive" } },
        { translations: { some: { OR: [{ expertise: { contains: rawSearch, mode: "insensitive" } }, { position: { contains: rawSearch, mode: "insensitive" } }] } } },
      ] } : {}),
    },
    orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, slug: true, email: true, order: true, isActive: true, studyProgramId: true,
      translations: { where: { locale: "id" }, select: { position: true, expertise: true } },
      studyProgram: { select: { code: true, translations: { where: { locale: "id" }, select: { name: true } } } },
      photoMedia: { select: { storageKey: true, storageClass: true, mimeType: true, alt: true } },
      _count: { select: { educations: true, publications: true } },
    },
  });
  const uploadBase = (process.env.UPLOAD_PUBLIC_URL ?? "/uploads").replace(/\/+$/u, "") || "/uploads";
  const knownCodes = new Set(validPrograms.map((program) => program.code));
  const items: LecturerListItem[] = rows.map((row) => {
    const photo = row.photoMedia && row.photoMedia.storageClass === "PUBLIC" && row.photoMedia.mimeType === "image/webp" && row.photoMedia.alt !== null && StorageKeySchema.safeParse(row.photoMedia.storageKey).success
      ? { url: `${uploadBase}/${row.photoMedia.storageKey}`, alt: row.photoMedia.alt }
      : null;
    const code = row.studyProgram?.code;
    const programCode = validPrograms.some((program) => program.code === code) ? code as LecturerListItem["studyProgramCode"] : null;
    return { id: row.id, name: row.name, slug: row.slug, studyProgramId: row.studyProgramId, studyProgramCode: programCode, studyProgramName: row.studyProgram?.translations[0]?.name ?? null, position: row.translations[0]?.position ?? null, expertise: row.translations[0]?.expertise ?? null, email: row.email, order: row.order, isActive: row.isActive, photoUrl: photo?.url ?? null, photoAlt: photo?.alt ?? null, educationCount: row._count.educations, publicationCount: row._count.publications };
  });
  const programOptions: LecturerProgramOption[] = programs.flatMap((program) => {
    if (!knownCodes.has(program.code as (typeof validPrograms)[number]["code"])) return [];
    const contract = validPrograms.find((item) => item.code === program.code);
    return contract ? [{ id: program.id, code: contract.code, name: program.translations[0]?.name ?? contract.name }] : [];
  });
  const allCount = await prisma.lecturer.count();
  const activeCount = await prisma.lecturer.count({ where: { isActive: true } });
  const assignedCount = await prisma.lecturer.count({ where: { studyProgramId: { not: null } } });

  return <LecturerList locale={locale as AppLocale} items={items} programs={programOptions} search={rawSearch} programId={programId} counts={{ total: allCount, active: activeCount, assigned: assignedCount }} />;
}
