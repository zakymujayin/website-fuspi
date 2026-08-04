import {z} from "zod";

import {AcademicResourceSchema, LecturerInputSchema} from "@/contracts/academic";
import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  AcademicEditorDetailSchema,
  AcademicEditorLoadResultSchema,
  AcademicPeopleImportRequestSchema,
  AcademicPeopleImportResponseSchema,
  type AcademicEditorLoadResult,
  type AcademicPeopleImportRequest,
  type AcademicPeopleImportResponse,
} from "@/contracts/academic-editor";
import {CmsIdentifierSchema, CmsPublicAssetReferenceSchema, collectDuplicateAwareSearchParams} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type AcademicEditorImportDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";
type ImportRow = AcademicPeopleImportRequest["rows"][number];

const DETAIL_QUERY_SCHEMA = z.object({
  resource: AcademicResourceSchema,
  id: CmsIdentifierSchema,
}).strict();

const MEDIA_SELECT = {
  id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
  alt: true, isDecorative: true, width: true, height: true,
} as const;

function actorOrNull(raw: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(raw);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function workflow(row: {
  locale: Locale; status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "STALE";
  sourceVersion: number; translatorId: string | null; reviewerId: string | null; reviewedAt: Date | null;
}) {
  return {
    locale: row.locale, status: row.status, sourceVersion: row.sourceVersion,
    translatorId: row.translatorId, reviewerId: row.reviewerId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

function governance(row: {
  governanceStatus: string; contentOwnerId: string | null; lastReviewedAt: Date | null;
  reviewDueAt: Date | null; expiresAt: Date | null;
}) {
  return {
    status: row.governanceStatus, contentOwnerId: row.contentOwnerId,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

function baseUrl(value: string) {
  return value.replace(/\/+$/u, "") || "/uploads";
}

type MediaRow = {
  id: string; storageKey: string; storageClass: string; mimeType: string; size: number;
  alt: string | null; isDecorative: boolean; width: number | null; height: number | null;
} | null;

function mediaView(media: MediaRow, uploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp" || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success) return null;
  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id, url: `${baseUrl(uploadBase)}/${media.storageKey}`, mimeType: media.mimeType,
    size: media.size, alt: media.alt, isDecorative: media.isDecorative,
    width: media.width, height: media.height,
  });
  return parsed.success ? parsed.data : null;
}

type DocumentRow = {
  id: string; slug: string; storageKey: string; storageClass: string; mimeType: string;
  size: number; publishedAt: Date | null; version: number;
  translations: Array<{locale: Locale; title: string; category: string | null}>;
} | null;

function documentAsset(document: DocumentRow, uploadBase: string) {
  if (!document || document.storageClass !== "PUBLIC" || document.mimeType !== "application/pdf" || !document.publishedAt || !StorageKeySchema.safeParse(document.storageKey).success) return null;
  const translation = document.translations.find(({locale}) => locale === "id");
  if (!translation) return null;
  const parsed = CmsPublicAssetReferenceSchema.safeParse({kind: "DOCUMENT", document: {
    id: document.id, slug: document.slug,
    translation: {requestedLocale: "id", resolvedLocale: "id", isFallback: false, title: translation.title, category: translation.category},
    url: `${baseUrl(uploadBase)}/${document.storageKey}`, mimeType: "application/pdf", size: document.size, version: document.version,
  }});
  return parsed.success ? parsed.data : null;
}

function localized<T extends {locale: Locale}>(rows: T[], map: (row: T) => Record<string, unknown>) {
  const result: Record<string, Record<string, unknown>> = {};
  for (const row of rows) result[row.locale] = map(row);
  return result;
}

export function normalizeAcademicEditorSearchParams(params: URLSearchParams) {
  try {
    return {ok: true as const, data: DETAIL_QUERY_SCHEMA.parse(collectDuplicateAwareSearchParams(params))};
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function getAcademicEditorDetail(
  prisma: AcademicEditorImportDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  uploadBase = "/uploads",
  now = new Date(),
): Promise<AcademicEditorLoadResult> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};
  const parsed = DETAIL_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {resource, id} = parsed.data;
  try {
    let detail: unknown;
    if (resource === "STUDY_PROGRAM") {
      const row = await prisma.studyProgram.findUnique({where: {id}, include: {
        translations: true, logoMedia: {select: MEDIA_SELECT},
        curriculumDocument: {include: {translations: {where: {locale: "id", status: "PUBLISHED"}}}},
        brochureDocument: {include: {translations: {where: {locale: "id", status: "PUBLISHED"}}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const assets: unknown[] = [];
      const logo = mediaView(row.logoMedia, uploadBase);
      const curriculum = documentAsset(row.curriculumDocument, uploadBase);
      const brochure = documentAsset(row.brochureDocument, uploadBase);
      if (logo) assets.push({kind: "MEDIA", media: logo});
      if (curriculum) assets.push(curriculum);
      if (brochure) assets.push(brochure);
      detail = {
        id: row.id, resource, version: row.version, governance: governance(row), assets,
        translationWorkflow: row.translations.map(workflow),
        input: {
          code: row.code, slug: row.slug, degree: row.degree, accreditation: row.accreditation,
          accreditationExpiry: row.accreditationExpiry?.toISOString() ?? null, externalUrl: null,
          email: row.email, phone: row.phone, logoMediaId: row.logoMediaId,
          curriculumDocumentId: row.curriculumDocumentId, brochureDocumentId: row.brochureDocumentId,
          isActive: row.isActive, order: row.order, contentOwnerId: row.contentOwnerId,
          translations: localized(row.translations, (translation) => ({
            name: translation.name, description: translation.description, vision: translation.vision,
            mission: translation.mission, objectives: translation.objectives,
            graduateProfile: translation.graduateProfile, careerProspects: translation.careerProspects,
            learningOutcomes: translation.learningOutcomes,
          })),
        },
      };
    } else if (resource === "LECTURER") {
      const row = await prisma.lecturer.findUnique({where: {id}, include: {translations: true, photoMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const photo = mediaView(row.photoMedia, uploadBase);
      detail = {
        id: row.id, resource, version: null, governance: null,
        translationWorkflow: row.translations.map(workflow), assets: photo ? [{kind: "MEDIA", media: photo}] : [],
        input: {
          name: row.name, slug: row.slug, nidn: row.nidn, nip: row.nip, orcid: row.orcid,
          googleScholarUrl: row.googleScholarUrl ? {kind: "EXTERNAL", href: row.googleScholarUrl} : null,
          sintaUrl: row.sintaUrl ? {kind: "EXTERNAL", href: row.sintaUrl} : null,
          email: row.email, phone: row.phone, photoMediaId: row.photoMediaId,
          studyProgramId: row.studyProgramId, order: row.order, isActive: row.isActive,
          translations: localized(row.translations, (translation) => ({
            position: translation.position, expertise: translation.expertise,
            bio: translation.bio, officeHours: translation.officeHours,
          })),
        },
      };
    } else if (resource === "STAFF") {
      const row = await prisma.staff.findUnique({where: {id}, include: {translations: true, photoMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const photo = mediaView(row.photoMedia, uploadBase);
      detail = {
        id: row.id, resource, version: null, governance: null,
        translationWorkflow: row.translations.map(workflow), assets: photo ? [{kind: "MEDIA", media: photo}] : [],
        input: {
          name: row.name, slug: row.slug, nip: row.nip, email: row.email, phone: row.phone,
          photoMediaId: row.photoMediaId, order: row.order, isActive: row.isActive,
          translations: localized(row.translations, (translation) => ({position: translation.position, unit: translation.unit})),
        },
      };
    } else if (resource === "RESEARCH") {
      const row = await prisma.research.findUnique({where: {id}, include: {translations: true, lecturers: {select: {lecturerId: true}}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, version: null, governance: null, assets: [],
        translationWorkflow: row.translations.map(workflow),
        input: {
          slug: row.slug, year: row.year,
          documentUrl: row.documentUrl ? {kind: "EXTERNAL", href: row.documentUrl} : null,
          lecturerIds: row.lecturers.map(({lecturerId}) => lecturerId),
          translations: localized(row.translations, (translation) => ({title: translation.title, abstract: translation.abstract})),
        },
      };
    } else if (resource === "COMMUNITY_SERVICE") {
      const row = await prisma.communityService.findUnique({where: {id}, include: {translations: true, lecturers: {select: {lecturerId: true}}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, version: null, governance: null, assets: [],
        translationWorkflow: row.translations.map(workflow),
        input: {
          slug: row.slug, year: row.year, location: row.location,
          documentUrl: row.documentUrl ? {kind: "EXTERNAL", href: row.documentUrl} : null,
          lecturerIds: row.lecturers.map(({lecturerId}) => lecturerId),
          translations: localized(row.translations, (translation) => ({title: translation.title, description: translation.description})),
        },
      };
    } else {
      const row = await prisma.unit.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      detail = {
        id: row.id, resource, version: row.version, governance: governance(row), assets: [],
        translationWorkflow: row.translations.map(workflow),
        input: {
          slug: row.slug, type: row.type, email: row.email, phone: row.phone,
          externalUrl: row.externalUrl ? {kind: "EXTERNAL", href: row.externalUrl} : null,
          isActive: row.isActive, contentOwnerId: row.contentOwnerId,
          translations: localized(row.translations, (translation) => ({name: translation.name, description: translation.description})),
        },
      };
    }
    return AcademicEditorLoadResultSchema.parse({ok: true, data: AcademicEditorDetailSchema.parse(detail)});
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

function sanitizeRequest(request: AcademicPeopleImportRequest) {
  const rows = request.rows.map((row) => {
    if (row.resource === "STAFF") return row;
    const translations = Object.fromEntries(Object.entries(row.payload.translations).map(([locale, value]) => [locale, {
      ...value, bio: value.bio === null ? null : sanitizeRichTextHtml(value.bio),
    }]));
    return {...row, payload: LecturerInputSchema.parse({...row.payload, translations})};
  });
  return AcademicPeopleImportRequestSchema.parse({...request, rows});
}

function safeCell(value: string) {
  return /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;
}

type Validation = {row: ImportRow; code: null | "SLUG_CONFLICT" | "IDENTITY_CONFLICT" | "RELATION_INVALID" | "MEDIA_INVALID"};

async function validateRows(tx: Prisma.TransactionClient | AcademicEditorImportDatabase, rows: ImportRow[]): Promise<Validation[]> {
  const resource = rows[0]!.resource;
  const slugs = rows.map(({payload}) => payload.slug);
  const nips = rows.map(({payload}) => payload.nip).filter((value): value is string => value !== null);
  const photoIds = rows.map(({payload}) => payload.photoMediaId).filter((value): value is string => value !== null);
  const media = photoIds.length ? await tx.media.findMany({where: {id: {in: photoIds}}, select: MEDIA_SELECT}) : [];
  const validMediaIds = new Set(media.filter((item) => mediaView(item, "/uploads") !== null).map(({id}) => id));
  if (resource === "LECTURER") {
    const lecturerRows = rows as Array<Extract<ImportRow, {resource: "LECTURER"}>>;
    const relationIds = lecturerRows.map((row) => row.payload.studyProgramId).filter((value): value is string => value !== null);
    const programs = relationIds.length ? await tx.studyProgram.findMany({where: {id: {in: relationIds}}, select: {id: true}}) : [];
    const validPrograms = new Set(programs.map(({id}) => id));
    const nidns = lecturerRows.map(({payload}) => payload.nidn).filter((value): value is string => value !== null);
    const orcids = lecturerRows.map(({payload}) => payload.orcid).filter((value): value is string => value !== null);
    const conflicts = await tx.lecturer.findMany({where: {OR: [
      {slug: {in: slugs}}, ...(nips.length ? [{nip: {in: nips}}] : []),
      ...(nidns.length ? [{nidn: {in: nidns}}] : []), ...(orcids.length ? [{orcid: {in: orcids}}] : []),
    ]}, select: {slug: true, nip: true, nidn: true, orcid: true}});
    return lecturerRows.map((row) => {
      if (row.payload.photoMediaId && !validMediaIds.has(row.payload.photoMediaId)) return {row, code: "MEDIA_INVALID"};
      if (row.payload.studyProgramId && !validPrograms.has(row.payload.studyProgramId)) return {row, code: "RELATION_INVALID"};
      const conflict = conflicts.find((item) => item.slug === row.payload.slug || (row.payload.nip && item.nip === row.payload.nip) || (row.payload.nidn && item.nidn === row.payload.nidn) || (row.payload.orcid && item.orcid === row.payload.orcid));
      return {row, code: conflict ? (conflict.slug === row.payload.slug ? "SLUG_CONFLICT" : "IDENTITY_CONFLICT") : null};
    });
  }
  const staffRows = rows as Array<Extract<ImportRow, {resource: "STAFF"}>>;
  const conflicts = await tx.staff.findMany({where: {OR: [{slug: {in: slugs}}, ...(nips.length ? [{nip: {in: nips}}] : [])]}, select: {slug: true, nip: true}});
  return staffRows.map((row) => {
    if (row.payload.photoMediaId && !validMediaIds.has(row.payload.photoMediaId)) return {row, code: "MEDIA_INVALID"};
    const conflict = conflicts.find((item) => item.slug === row.payload.slug || (row.payload.nip && item.nip === row.payload.nip));
    return {row, code: conflict ? (conflict.slug === row.payload.slug ? "SLUG_CONFLICT" : "IDENTITY_CONFLICT") : null};
  });
}

function previewResult(request: AcademicPeopleImportRequest, validation: Validation[]): AcademicPeopleImportResponse {
  const rows = validation.map(({row, code}) => ({
    rowNumber: row.rowNumber, status: code ? "INVALID" as const : "VALID" as const,
    code, id: null, safeLabel: safeCell(row.payload.name),
  }));
  const invalid = rows.filter(({status}) => status === "INVALID").length;
  return AcademicPeopleImportResponseSchema.parse({
    ok: true, intent: request.intent, resource: request.rows[0]!.resource, atomic: true, committed: false,
    rows, summary: {total: rows.length, valid: rows.length - invalid, invalid, created: 0},
  });
}

function translationState(locale: Locale, actorId: string, now: Date) {
  const published = locale === "id";
  return {status: published ? "PUBLISHED" as const : "DRAFT" as const, sourceVersion: 1, translatorId: actorId, reviewerId: published ? actorId : null, reviewedAt: published ? now : null};
}

async function createImportRow(tx: Prisma.TransactionClient, row: ImportRow, actorId: string, now: Date) {
  if (row.resource === "LECTURER") {
    const input = row.payload;
    const created = await tx.lecturer.create({data: {
      name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
      googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
      email: input.email, phone: input.phone, photoMediaId: input.photoMediaId,
      studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
      translations: {create: Object.entries(input.translations).map(([locale, value]) => ({locale: locale as Locale, ...value, ...translationState(locale as Locale, actorId, now)}))},
    }, select: {id: true}});
    await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Lecturer", resourceId: created.id, metadata: {operation: "IMPORT"}}});
    return created.id;
  }
  const input = row.payload;
  const created = await tx.staff.create({data: {
    name: input.name, slug: input.slug, nip: input.nip, email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, order: input.order, isActive: input.isActive,
    translations: {create: Object.entries(input.translations).map(([locale, value]) => ({locale: locale as Locale, ...value, ...translationState(locale as Locale, actorId, now)}))},
  }, select: {id: true}});
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Staff", resourceId: created.id, metadata: {operation: "IMPORT"}}});
  return created.id;
}

export async function executeAcademicPeopleImport(
  prisma: AcademicEditorImportDatabase,
  rawActor: unknown,
  rawRequest: unknown,
  now = new Date(),
): Promise<AcademicPeopleImportResponse> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AcademicPeopleImportRequestSchema.safeParse(rawRequest);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  let request: AcademicPeopleImportRequest;
  try { request = sanitizeRequest(parsed.data); } catch { return {ok: false, code: "VALIDATION_FAILED"}; }
  try {
    const initial = await validateRows(prisma, request.rows);
    if (request.intent === "PREVIEW" || initial.some(({code}) => code !== null)) return previewResult(request, initial);
    const ids = await prisma.$transaction(async (tx) => {
      const repeated = await validateRows(tx, request.rows);
      if (repeated.some(({code}) => code !== null)) return {ok: false as const, validation: repeated};
      const created: string[] = [];
      for (const row of request.rows) created.push(await createImportRow(tx, row, actor.userId, now));
      return {ok: true as const, ids: created};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
    if (!ids.ok) return previewResult(request, ids.validation);
    const rows = request.rows.map((row, index) => ({rowNumber: row.rowNumber, status: "CREATED" as const, code: null, id: ids.ids[index]!, safeLabel: safeCell(row.payload.name)}));
    return AcademicPeopleImportResponseSchema.parse({
      ok: true, intent: "COMMIT", resource: request.rows[0]!.resource, atomic: true, committed: true,
      rows, summary: {total: rows.length, valid: 0, invalid: 0, created: rows.length},
    });
  } catch (error) {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      try { return previewResult(request, await validateRows(prisma, request.rows)); } catch { return {ok: false, code: "UNAVAILABLE"}; }
    }
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function academicEditorImportHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
