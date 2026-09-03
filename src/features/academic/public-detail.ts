import {
  AcademicPublicDetailQuerySchema,
  AcademicPublicDetailResultSchema,
  PublicAcademicPersonReferenceSchema,
  PublicStudyProgramReferenceSchema,
  type AcademicPublicDetailResult,
} from "@/contracts/academic-public";
import {CmsPublicDocumentViewSchema} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import type {createPrismaClient} from "@/lib/db/client";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type AcademicPublicDetailDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";

const MEDIA_SELECT = {
  id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
  alt: true, isDecorative: true, width: true, height: true, focalX: true, focalY: true,
} as const;

function baseUrl(value: string) {
  return value.replace(/\/+$/u, "") || "/uploads";
}

type MediaRow = {
  id: string; storageKey: string; storageClass: string; mimeType: string; size: number;
  alt: string | null; isDecorative: boolean; width: number | null; height: number | null;
  focalX: number | null; focalY: number | null;
} | null;

function mediaView(media: MediaRow, uploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp" || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success) return null;
  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id, url: `${baseUrl(uploadBase)}/${media.storageKey}`, mimeType: media.mimeType,
    size: media.size, alt: media.alt, isDecorative: media.isDecorative,
    width: media.width, height: media.height, focalX: media.focalX, focalY: media.focalY,
  });
  return parsed.success ? parsed.data : null;
}

function pdfMediaView(media: MediaRow, uploadBase: string) {
  if (
    !media
    || media.storageClass !== "PUBLIC"
    || media.mimeType !== "application/pdf"
    || (media.alt !== null && media.alt !== "")
    || media.isDecorative
    || media.width !== null
    || media.height !== null
    || media.focalX !== null
    || media.focalY !== null
    || !StorageKeySchema.safeParse(media.storageKey).success
  ) return null;
  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id, url: `${baseUrl(uploadBase)}/${media.storageKey}`, mimeType: media.mimeType,
    size: media.size, alt: "", isDecorative: false, width: null, height: null, focalX: null, focalY: null,
  });
  return parsed.success ? parsed.data : null;
}

function resolve<T extends {locale: Locale}>(rows: T[], locale: Locale) {
  return rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === "id") ?? null;
}

function resolution(requestedLocale: Locale, resolvedLocale: Locale) {
  return {requestedLocale, resolvedLocale, isFallback: requestedLocale !== resolvedLocale};
}

function rich(value: string | null) {
  if (value === null) return null;
  try { return sanitizeRichTextHtml(value); } catch { return undefined; }
}

type DocumentRow = {
  id: string; slug: string; storageKey: string; storageClass: string; mimeType: string;
  size: number; publishedAt: Date | null; version: number;
  translations: Array<{locale: Locale; title: string; category: string | null}>;
} | null;

function documentView(document: DocumentRow, locale: Locale, uploadBase: string) {
  if (!document || document.storageClass !== "PUBLIC" || document.mimeType !== "application/pdf" || !document.publishedAt || !StorageKeySchema.safeParse(document.storageKey).success) return null;
  const translation = resolve(document.translations, locale);
  if (!translation) return null;
  const parsed = CmsPublicDocumentViewSchema.safeParse({
    id: document.id, slug: document.slug,
    translation: {...resolution(locale, translation.locale), title: translation.title, category: translation.category},
    url: `${baseUrl(uploadBase)}/${document.storageKey}`, mimeType: "application/pdf",
    size: document.size, version: document.version,
  });
  return parsed.success ? parsed.data : null;
}

function publicProgramReference(row: {
  id: string; slug: string; code: string;
  translations: Array<{locale: Locale; name: string}>;
} | null, locale: Locale) {
  if (!row) return null;
  const translation = resolve(row.translations, locale);
  if (!translation) return null;
  const parsed = PublicStudyProgramReferenceSchema.safeParse({
    id: row.id, slug: row.slug, code: row.code,
    translation: {...resolution(locale, translation.locale), name: translation.name},
  });
  return parsed.success ? parsed.data : null;
}

function publicPersonReference(row: {
  id: string; slug: string; name: string; photoMedia: MediaRow;
}, uploadBase: string) {
  const parsed = PublicAcademicPersonReferenceSchema.safeParse({
    id: row.id, slug: row.slug, name: row.name, photo: mediaView(row.photoMedia, uploadBase),
  });
  return parsed.success ? parsed.data : null;
}

export async function getPublicAcademicDetail(
  prisma: AcademicPublicDetailDatabase,
  rawQuery: unknown,
  uploadBase = "/uploads",
): Promise<AcademicPublicDetailResult> {
  const parsed = AcademicPublicDetailQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {resource, slug, locale} = parsed.data;
  const localeFilter = {status: "PUBLISHED" as const, locale: {in: locale === "id" ? ["id" as const] : [locale, "id" as const]}};
  try {
    let detail: unknown;
    if (resource === "STUDY_PROGRAM") {
      const row = await prisma.studyProgram.findFirst({where: {slug, isActive: true, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, logoMedia: {select: MEDIA_SELECT},
        curriculumDocument: {include: {translations: {where: localeFilter}}},
        brochureDocument: {include: {translations: {where: localeFilter}}},
        accreditationCertificateMedia: {select: MEDIA_SELECT},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, code: row.code, degree: row.degree,
        accreditation: row.accreditation,
        accreditationAgency: row.accreditationAgency,
        accreditationDecreeNumber: row.accreditationDecreeNumber,
        accreditationExpiry: row.accreditationExpiry?.toISOString() ?? null,
        accreditationCertificate: pdfMediaView(row.accreditationCertificateMedia, uploadBase),
        institutionalEmail: row.email, logo: mediaView(row.logoMedia, uploadBase),
        curriculumDocument: documentView(row.curriculumDocument, locale, uploadBase),
        brochureDocument: documentView(row.brochureDocument, locale, uploadBase),
        translation: {
          ...resolution(locale, translation.locale), name: translation.name,
          description: rich(translation.description), vision: rich(translation.vision),
          mission: rich(translation.mission), objectives: rich(translation.objectives),
          graduateProfile: rich(translation.graduateProfile), careerProspects: rich(translation.careerProspects),
          learningOutcomes: rich(translation.learningOutcomes),
        },
      };
    } else if (resource === "LECTURER") {
      const row = await prisma.lecturer.findFirst({where: {slug, isActive: true, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, photoMedia: {select: MEDIA_SELECT},
        studyProgram: {include: {translations: {where: localeFilter}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, name: row.name, institutionalEmail: row.email,
        photo: mediaView(row.photoMedia, uploadBase),
        studyProgram: row.studyProgram?.isActive ? publicProgramReference(row.studyProgram, locale) : null,
        googleScholarUrl: row.googleScholarUrl, sintaUrl: row.sintaUrl,
        translation: {...resolution(locale, translation.locale), position: translation.position,
          expertise: translation.expertise, bio: rich(translation.bio), officeHours: translation.officeHours},
      };
    } else if (resource === "STAFF") {
      const row = await prisma.staff.findFirst({where: {slug, isActive: true, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, photoMedia: {select: MEDIA_SELECT},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, name: row.name, institutionalEmail: row.email,
        photo: mediaView(row.photoMedia, uploadBase),
        translation: {...resolution(locale, translation.locale), position: translation.position, unit: translation.unit},
      };
    } else if (resource === "RESEARCH") {
      const row = await prisma.research.findFirst({where: {slug, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter},
        lecturers: {where: {lecturer: {isActive: true, translations: {some: localeFilter}}}, include: {lecturer: {include: {photoMedia: {select: MEDIA_SELECT}}}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, year: row.year, documentUrl: row.documentUrl,
        lecturers: row.lecturers.flatMap(({lecturer}) => {
          const person = publicPersonReference(lecturer, uploadBase); return person ? [person] : [];
        }),
        translation: {...resolution(locale, translation.locale), title: translation.title, abstract: rich(translation.abstract)},
      };
    } else if (resource === "COMMUNITY_SERVICE") {
      const row = await prisma.communityService.findFirst({where: {slug, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter},
        lecturers: {where: {lecturer: {isActive: true, translations: {some: localeFilter}}}, include: {lecturer: {include: {photoMedia: {select: MEDIA_SELECT}}}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, year: row.year, location: row.location,
        documentUrl: row.documentUrl,
        lecturers: row.lecturers.flatMap(({lecturer}) => {
          const person = publicPersonReference(lecturer, uploadBase); return person ? [person] : [];
        }),
        translation: {...resolution(locale, translation.locale), title: translation.title, description: rich(translation.description)},
      };
    } else {
      const row = await prisma.unit.findFirst({where: {slug, isActive: true, translations: {some: localeFilter}}, include: {translations: {where: localeFilter}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, slug: row.slug, type: row.type,
        institutionalEmail: row.email, externalUrl: row.externalUrl,
        translation: {...resolution(locale, translation.locale), name: translation.name, description: rich(translation.description)},
      };
    }
    const result = AcademicPublicDetailResultSchema.safeParse({ok: true, data: detail});
    return result.success ? result.data : {ok: false, code: "NOT_FOUND"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
