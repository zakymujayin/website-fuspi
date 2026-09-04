import {z} from "zod";

import {
  AcademicAdminViewSchema,
  AcademicCommandSchema,
  AcademicListQuerySchema,
  AcademicListResultSchema,
  AcademicMutationResultSchema,
  LecturerInputSchema,
  PublicAcademicDirectoryItemSchema,
  StaffInputSchema,
  StudyProgramInputSchema,
  type AcademicCommand,
  type AcademicMutationResult,
} from "@/contracts/academic";
import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsPageMetadataSchema,
  CmsPublicAssetReferenceSchema,
  collectDuplicateAwareSearchParams,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import {institution} from "@/config/institution";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createContentRevision} from "@/lib/db/revision";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type AcademicPeopleDatabase = ReturnType<typeof createPrismaClient>;

type SupportedResource = "STUDY_PROGRAM" | "LECTURER" | "STAFF";
type StudyProgramInput = z.infer<typeof StudyProgramInputSchema>;
type LecturerInput = z.infer<typeof LecturerInputSchema>;
type StaffInput = z.infer<typeof StaffInputSchema>;
type Locale = "id" | "en" | "ar";

const SUPPORTED_RESOURCES = new Set<SupportedResource>(["STUDY_PROGRAM", "LECTURER", "STAFF"]);
const PUBLIC_STUDY_PROGRAM_CODES: string[] = institution.studyPrograms.map((program) => program.code);
const PUBLIC_STUDY_PROGRAM_CODE_SET = new Set<string>(PUBLIC_STUDY_PROGRAM_CODES);
const RAW_LIST_QUERY_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["STUDY_PROGRAM", "LECTURER", "STAFF"]),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
  studyProgramId: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/u).optional(),
}).strict();

const MEDIA_SELECT = {
  id: true,
  storageKey: true,
  storageClass: true,
  mimeType: true,
  size: true,
  alt: true,
  isDecorative: true,
  width: true,
  height: true,
  focalX: true,
  focalY: true,
} as const;

const DOCUMENT_INCLUDE = {
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {locale: true, title: true, category: true},
  },
} as const;

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function pageMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return CmsPageMetadataSchema.parse({
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
}

function uploadBase(value: string) {
  return value.replace(/\/+$/u, "") || "/uploads";
}

type MediaRow = {
  id: string;
  storageKey: string;
  storageClass: string;
  mimeType: string;
  size: number;
  alt: string | null;
  isDecorative: boolean;
  width: number | null;
  height: number | null;
  focalX: number | null;
  focalY: number | null;
} | null;

function publicMedia(media: MediaRow, rawUploadBase: string) {
  if (
    !media
    || media.storageClass !== "PUBLIC"
    || media.mimeType !== "image/webp"
    || media.alt === null
    || !StorageKeySchema.safeParse(media.storageKey).success
  ) return null;

  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id,
    url: `${uploadBase(rawUploadBase)}/${media.storageKey}`,
    mimeType: media.mimeType,
    size: media.size,
    alt: media.alt,
    isDecorative: media.isDecorative,
    width: media.width,
    height: media.height,
    focalX: media.focalX,
    focalY: media.focalY,
  });
  return parsed.success ? parsed.data : null;
}

function publicPdfMedia(media: MediaRow, rawUploadBase: string) {
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
    id: media.id,
    url: `${uploadBase(rawUploadBase)}/${media.storageKey}`,
    mimeType: media.mimeType,
    size: media.size,
    alt: "",
    isDecorative: false,
    width: null,
    height: null,
    focalX: null,
    focalY: null,
  });
  return parsed.success ? parsed.data : null;
}

type DocumentRow = {
  id: string;
  slug: string;
  storageKey: string;
  storageClass: string;
  mimeType: string;
  size: number;
  publishedAt: Date | null;
  version: number;
  translations: Array<{locale: Locale; title: string; category: string | null}>;
} | null;

function publicDocument(document: DocumentRow, rawUploadBase: string, requestedLocale: Locale = "id") {
  if (
    !document
    || document.storageClass !== "PUBLIC"
    || document.mimeType !== "application/pdf"
    || document.publishedAt === null
    || !StorageKeySchema.safeParse(document.storageKey).success
  ) return null;
  const exact = document.translations.find(({locale}) => locale === requestedLocale);
  const fallback = document.translations.find(({locale}) => locale === "id");
  const translation = exact ?? fallback;
  if (!translation) return null;
  const parsed = CmsPublicAssetReferenceSchema.safeParse({
    kind: "DOCUMENT",
    document: {
      id: document.id,
      slug: document.slug,
      translation: {
        requestedLocale,
        resolvedLocale: translation.locale,
        isFallback: translation.locale !== requestedLocale,
        title: translation.title,
        category: translation.category,
      },
      url: `${uploadBase(rawUploadBase)}/${document.storageKey}`,
      mimeType: "application/pdf",
      size: document.size,
      version: document.version,
    },
  });
  if (!parsed.success) return null;
  return parsed.data;
}

function workflow(translation: {
  locale: Locale;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "STALE";
  sourceVersion: number;
  translatorId: string | null;
  reviewerId: string | null;
  reviewedAt: Date | null;
}) {
  return {
    locale: translation.locale,
    status: translation.status,
    sourceVersion: translation.sourceVersion,
    translatorId: translation.translatorId,
    reviewerId: translation.reviewerId,
    reviewedAt: translation.reviewedAt?.toISOString() ?? null,
  };
}

function governance(row: {
  governanceStatus: string;
  contentOwnerId: string | null;
  lastReviewedAt: Date | null;
  reviewDueAt: Date | null;
  expiresAt: Date | null;
}) {
  return {
    status: row.governanceStatus,
    contentOwnerId: row.contentOwnerId,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === code;
}

function uniqueFailure(error: unknown): AcademicMutationResult {
  if (!isPrismaCode(error, "P2002")) return {ok: false, code: "UNAVAILABLE"};
  const target = error instanceof PrismaNamespace.PrismaClientKnownRequestError
    ? String(error.meta?.target ?? "")
    : "";
  return {ok: false, code: target.toLowerCase().includes("slug") ? "SLUG_CONFLICT" : "IDENTITY_CONFLICT"};
}

export function normalizeAcademicPeopleSearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_LIST_QUERY_SCHEMA.parse(collectDuplicateAwareSearchParams(params));
    return {
      ok: true as const,
      data: AcademicListQuerySchema.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        search: raw.search ?? "",
        direction: raw.direction ?? "ASC",
        resource: raw.resource,
        active: raw.active ?? "ALL",
        studyProgramId: raw.studyProgramId ?? null,
        year: null,
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listAcademicPeople(
  prisma: AcademicPeopleDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  rawUploadBase = "/uploads",
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = AcademicListQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as SupportedResource)) {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
  const query = parsed.data;
  const active = query.active === "ALL" ? {} : {isActive: query.active === "ACTIVE"};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};

  try {
    if (query.resource === "STUDY_PROGRAM") {
      const where: Prisma.StudyProgramWhereInput = {
        ...active,
        ...(query.search === "" ? {} : {OR: [
          {code: {contains: query.search, mode: "insensitive"}},
          {slug: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {name: {contains: query.search, mode: "insensitive"}}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.studyProgram.findMany({
          where,
          orderBy: [{order: direction}, {id: "asc"}],
          ...pagination,
          include: {
            translations: true,
            logoMedia: {select: MEDIA_SELECT},
            curriculumDocument: {include: DOCUMENT_INCLUDE},
            brochureDocument: {include: DOCUMENT_INCLUDE},
            accreditationCertificateMedia: {select: MEDIA_SELECT},
          },
        }),
        prisma.studyProgram.count({where}),
      ]);
      const items = rows.map((row) => {
        const assets: unknown[] = [];
        const logo = publicMedia(row.logoMedia, rawUploadBase);
        if (logo) assets.push({kind: "MEDIA", media: logo});
        const curriculum = publicDocument(row.curriculumDocument, rawUploadBase);
        const brochure = publicDocument(row.brochureDocument, rawUploadBase);
        const certificate = publicPdfMedia(row.accreditationCertificateMedia, rawUploadBase);
        if (curriculum) assets.push(curriculum);
        if (brochure) assets.push(brochure);
        if (certificate) assets.push({kind: "MEDIA", media: certificate});
        return AcademicAdminViewSchema.parse({
          id: row.id,
          resource: "STUDY_PROGRAM",
          slug: row.slug,
          version: row.version,
          isActive: row.isActive,
          translations: row.translations.map(workflow),
          governance: governance(row),
          assets,
        });
      });
      return {ok: true as const, data: AcademicListResultSchema.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
    }

    if (query.resource === "LECTURER") {
      const where: Prisma.LecturerWhereInput = {
        ...active,
        ...(query.studyProgramId ? {studyProgramId: query.studyProgramId} : {}),
        ...(query.search === "" ? {} : {OR: [
          {name: {contains: query.search, mode: "insensitive"}},
          {slug: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {OR: [
            {position: {contains: query.search, mode: "insensitive"}},
            {expertise: {contains: query.search, mode: "insensitive"}},
          ]}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.lecturer.findMany({
          where, orderBy: [{order: direction}, {name: "asc"}, {id: "asc"}], ...pagination,
          include: {translations: true, photoMedia: {select: MEDIA_SELECT}},
        }),
        prisma.lecturer.count({where}),
      ]);
      const items = rows.map((row) => {
        const photo = publicMedia(row.photoMedia, rawUploadBase);
        return AcademicAdminViewSchema.parse({
          id: row.id, resource: "LECTURER", slug: row.slug, version: null,
          isActive: row.isActive, translations: row.translations.map(workflow), governance: null,
          assets: photo ? [{kind: "MEDIA", media: photo}] : [],
        });
      });
      return {ok: true as const, data: AcademicListResultSchema.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
    }

    const where: Prisma.StaffWhereInput = {
      ...active,
      ...(query.studyProgramId ? {id: "__no_staff_study_program_relation__"} : {}),
      ...(query.search === "" ? {} : {OR: [
        {name: {contains: query.search, mode: "insensitive"}},
        {slug: {contains: query.search, mode: "insensitive"}},
        {translations: {some: {OR: [
          {position: {contains: query.search, mode: "insensitive"}},
          {unit: {contains: query.search, mode: "insensitive"}},
        ]}}},
      ]}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.staff.findMany({
        where, orderBy: [{order: direction}, {name: "asc"}, {id: "asc"}], ...pagination,
        include: {translations: true, photoMedia: {select: MEDIA_SELECT}},
      }),
      prisma.staff.count({where}),
    ]);
    const items = rows.map((row) => {
      const photo = publicMedia(row.photoMedia, rawUploadBase);
      return AcademicAdminViewSchema.parse({
        id: row.id, resource: "STAFF", slug: row.slug, version: null,
        isActive: row.isActive, translations: row.translations.map(workflow), governance: null,
        assets: photo ? [{kind: "MEDIA", media: photo}] : [],
      });
    });
    return {ok: true as const, data: AcademicListResultSchema.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

function sanitizeStudyProgram(input: StudyProgramInput) {
  const translations = Object.fromEntries(Object.entries(input.translations).map(([locale, value]) => [locale, {
    ...value,
    description: value.description === null ? null : sanitizeRichTextHtml(value.description),
    vision: value.vision === null ? null : sanitizeRichTextHtml(value.vision),
    mission: value.mission === null ? null : sanitizeRichTextHtml(value.mission),
    objectives: value.objectives === null ? null : sanitizeRichTextHtml(value.objectives),
    graduateProfile: value.graduateProfile === null ? null : sanitizeRichTextHtml(value.graduateProfile),
    careerProspects: value.careerProspects === null ? null : sanitizeRichTextHtml(value.careerProspects),
    learningOutcomes: value.learningOutcomes === null ? null : sanitizeRichTextHtml(value.learningOutcomes),
  }]));
  return StudyProgramInputSchema.parse({...input, translations});
}

function sanitizeLecturer(input: LecturerInput) {
  const translations = Object.fromEntries(Object.entries(input.translations).map(([locale, value]) => [locale, {
    ...value,
    bio: value.bio === null ? null : sanitizeRichTextHtml(value.bio),
  }]));
  return LecturerInputSchema.parse({...input, translations});
}

async function validatePhoto(tx: Prisma.TransactionClient, mediaId: string | null) {
  if (mediaId === null) return true;
  const media = await tx.media.findUnique({where: {id: mediaId}, select: MEDIA_SELECT});
  return publicMedia(media, "/uploads") !== null;
}

async function validateCertificate(tx: Prisma.TransactionClient, mediaId: string | null | undefined) {
  if (mediaId == null) return true;
  const media = await tx.media.findUnique({where: {id: mediaId}, select: MEDIA_SELECT});
  return publicPdfMedia(media, "/uploads") !== null;
}

async function validateDocument(tx: Prisma.TransactionClient, documentId: string | null) {
  if (documentId === null) return true;
  const document = await tx.document.findUnique({where: {id: documentId}, include: DOCUMENT_INCLUDE});
  return publicDocument(document, "/uploads") !== null;
}

function translationState(locale: Locale, active: boolean, actorId: string, now: Date) {
  const published = locale === "id" && active;
  return {
    status: published ? "PUBLISHED" as const : "DRAFT" as const,
    translatorId: actorId,
    reviewerId: published ? actorId : null,
    reviewedAt: published ? now : null,
  };
}

async function replaceStudyProgramTranslations(
  tx: Prisma.TransactionClient,
  id: string,
  input: StudyProgramInput,
  actorId: string,
  version: number,
  now: Date,
) {
  const entries = Object.entries(input.translations) as Array<[Locale, StudyProgramInput["translations"]["id"]]>;
  await tx.studyProgramTranslation.deleteMany({where: {studyProgramId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) {
    const state = translationState(locale, input.isActive, actorId, now);
    await tx.studyProgramTranslation.upsert({
      where: {studyProgramId_locale: {studyProgramId: id, locale}},
      create: {studyProgramId: id, locale, ...value, ...state, sourceVersion: version},
      update: {...value, ...state, sourceVersion: version},
    });
  }
}

async function replaceLecturerTranslations(
  tx: Prisma.TransactionClient,
  id: string,
  input: LecturerInput,
  actorId: string,
  now: Date,
) {
  const entries = Object.entries(input.translations) as Array<[Locale, LecturerInput["translations"]["id"]]>;
  await tx.lecturerTranslation.deleteMany({where: {lecturerId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) {
    const state = translationState(locale, input.isActive, actorId, now);
    await tx.lecturerTranslation.upsert({
      where: {lecturerId_locale: {lecturerId: id, locale}},
      create: {lecturerId: id, locale, ...value, ...state, sourceVersion: 1},
      update: {...value, ...state, sourceVersion: {increment: 1}},
    });
  }
}

async function replaceStaffTranslations(
  tx: Prisma.TransactionClient,
  id: string,
  input: StaffInput,
  actorId: string,
  now: Date,
) {
  const entries = Object.entries(input.translations) as Array<[Locale, StaffInput["translations"]["id"]]>;
  await tx.staffTranslation.deleteMany({where: {staffId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) {
    const state = translationState(locale, input.isActive, actorId, now);
    await tx.staffTranslation.upsert({
      where: {staffId_locale: {staffId: id, locale}},
      create: {staffId: id, locale, ...value, ...state, sourceVersion: 1},
      update: {...value, ...state, sourceVersion: {increment: 1}},
    });
  }
}

async function studyProgramRevisions(
  tx: Prisma.TransactionClient,
  id: string,
  input: StudyProgramInput,
  actorId: string,
  version: number,
  action: "CREATE" | "UPDATE",
  now: Date,
) {
  await createContentRevision(tx, {
    resourceType: "StudyProgram", resourceId: id, version, actorId, changeSummary: action,
    snapshot: {
      code: input.code, slug: input.slug, degree: input.degree, accreditation: input.accreditation,
      accreditationAgency: input.accreditationAgency, accreditationDecreeNumber: input.accreditationDecreeNumber,
      accreditationExpiry: input.accreditationExpiry,
      accreditationCertificateMediaId: input.accreditationCertificateMediaId,
      externalUrl: input.externalUrl, email: input.email,
      phone: input.phone, logoMediaId: input.logoMediaId, curriculumDocumentId: input.curriculumDocumentId,
      brochureDocumentId: input.brochureDocumentId, isActive: input.isActive, order: input.order,
      contentOwnerId: input.contentOwnerId, version,
    },
  });
  for (const [locale, value] of Object.entries(input.translations) as Array<[Locale, StudyProgramInput["translations"]["id"]]>) {
    await createContentRevision(tx, {
      resourceType: "StudyProgram", resourceId: id, locale, version, actorId, changeSummary: action,
      snapshot: {locale, ...value, ...translationState(locale, input.isActive, actorId, now), sourceVersion: version},
    });
  }
}

async function createStudyProgram(
  tx: Prisma.TransactionClient,
  input: StudyProgramInput,
  actorId: string,
  now: Date,
) {
  if (!await validatePhoto(tx, input.logoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateCertificate(tx, input.accreditationCertificateMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateDocument(tx, input.curriculumDocumentId) || !await validateDocument(tx, input.brochureDocumentId)) {
    return {ok: false, code: "DOCUMENT_INVALID"} as const;
  }
  const row = await tx.studyProgram.create({
    data: {
      code: input.code, slug: input.slug, degree: input.degree, accreditation: input.accreditation,
      accreditationAgency: input.accreditationAgency, accreditationDecreeNumber: input.accreditationDecreeNumber,
      accreditationExpiry: input.accreditationExpiry ? new Date(input.accreditationExpiry) : null,
      accreditationCertificateMediaId: input.accreditationCertificateMediaId,
      externalUrl: null, email: input.email, phone: input.phone, logoMediaId: input.logoMediaId,
      curriculumDocumentId: input.curriculumDocumentId, brochureDocumentId: input.brochureDocumentId,
      isActive: input.isActive, order: input.order, contentOwnerId: input.contentOwnerId,
    },
    select: {id: true, version: true},
  });
  await replaceStudyProgramTranslations(tx, row.id, input, actorId, row.version, now);
  await studyProgramRevisions(tx, row.id, input, actorId, row.version, "CREATE", now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "StudyProgram", resourceId: row.id}});
  return AcademicMutationResultSchema.parse({ok: true, id: row.id, resource: "STUDY_PROGRAM", version: row.version});
}

async function updateStudyProgram(
  tx: Prisma.TransactionClient,
  id: string,
  expectedVersion: number | null,
  input: StudyProgramInput,
  actorId: string,
  now: Date,
) {
  if (expectedVersion === null) return {ok: false, code: "VALIDATION_FAILED"} as const;
  const current = await tx.studyProgram.findUnique({where: {id}, select: {id: true, code: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  if (current.code !== input.code) return {ok: false, code: "IDENTITY_CONFLICT"} as const;
  if (!await validatePhoto(tx, input.logoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateCertificate(tx, input.accreditationCertificateMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateDocument(tx, input.curriculumDocumentId) || !await validateDocument(tx, input.brochureDocumentId)) {
    return {ok: false, code: "DOCUMENT_INVALID"} as const;
  }
  const claim = await tx.studyProgram.updateMany({where: {id, version: expectedVersion}, data: {version: {increment: 1}}});
  if (claim.count !== 1) return {ok: false, code: "VERSION_CONFLICT"} as const;
  const version = expectedVersion + 1;
  await tx.studyProgram.update({where: {id}, data: {
    slug: input.slug, degree: input.degree, accreditation: input.accreditation,
    accreditationAgency: input.accreditationAgency, accreditationDecreeNumber: input.accreditationDecreeNumber,
    accreditationExpiry: input.accreditationExpiry ? new Date(input.accreditationExpiry) : null,
    accreditationCertificateMediaId: input.accreditationCertificateMediaId,
    externalUrl: null, email: input.email, phone: input.phone, logoMediaId: input.logoMediaId,
    curriculumDocumentId: input.curriculumDocumentId, brochureDocumentId: input.brochureDocumentId,
    isActive: input.isActive, order: input.order, contentOwnerId: input.contentOwnerId,
  }});
  await replaceStudyProgramTranslations(tx, id, input, actorId, version, now);
  await studyProgramRevisions(tx, id, input, actorId, version, "UPDATE", now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "StudyProgram", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "STUDY_PROGRAM", version});
}

async function createLecturer(tx: Prisma.TransactionClient, input: LecturerInput, actorId: string, now: Date) {
  if (!await validatePhoto(tx, input.photoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateCertificate(tx, input.cvMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (input.studyProgramId && !await tx.studyProgram.findUnique({where: {id: input.studyProgramId}, select: {id: true}})) {
    return {ok: false, code: "RELATION_INVALID"} as const;
  }
  const row = await tx.lecturer.create({data: {
    name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
    googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
    scopusUrl: input.scopusUrl?.href ?? null, linkedinUrl: input.linkedinUrl?.href ?? null,
    instagramUrl: input.instagramUrl?.href ?? null, twitterUrl: input.twitterUrl?.href ?? null,
    email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
    studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
  }, select: {id: true}});
  await replaceLecturerTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Lecturer", resourceId: row.id}});
  return AcademicMutationResultSchema.parse({ok: true, id: row.id, resource: "LECTURER", version: null});
}

async function updateLecturer(tx: Prisma.TransactionClient, id: string, expectedVersion: number | null, input: LecturerInput, actorId: string, now: Date) {
  if (expectedVersion !== null) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await tx.lecturer.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
  if (!await validatePhoto(tx, input.photoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateCertificate(tx, input.cvMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (input.studyProgramId && !await tx.studyProgram.findUnique({where: {id: input.studyProgramId}, select: {id: true}})) {
    return {ok: false, code: "RELATION_INVALID"} as const;
  }
  await tx.lecturer.update({where: {id}, data: {
    name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
    googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
    scopusUrl: input.scopusUrl?.href ?? null, linkedinUrl: input.linkedinUrl?.href ?? null,
    instagramUrl: input.instagramUrl?.href ?? null, twitterUrl: input.twitterUrl?.href ?? null,
    email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
    studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
  }});
  await replaceLecturerTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Lecturer", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "LECTURER", version: null});
}

async function createStaff(tx: Prisma.TransactionClient, input: StaffInput, actorId: string, now: Date) {
  if (!await validatePhoto(tx, input.photoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const row = await tx.staff.create({data: {
    name: input.name, slug: input.slug, nip: input.nip, email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, order: input.order, isActive: input.isActive,
  }, select: {id: true}});
  await replaceStaffTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Staff", resourceId: row.id}});
  return AcademicMutationResultSchema.parse({ok: true, id: row.id, resource: "STAFF", version: null});
}

async function updateStaff(tx: Prisma.TransactionClient, id: string, expectedVersion: number | null, input: StaffInput, actorId: string, now: Date) {
  if (expectedVersion !== null) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await tx.staff.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
  if (!await validatePhoto(tx, input.photoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  await tx.staff.update({where: {id}, data: {
    name: input.name, slug: input.slug, nip: input.nip, email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, order: input.order, isActive: input.isActive,
  }});
  await replaceStaffTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Staff", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "STAFF", version: null});
}

async function deleteAcademicPerson(tx: Prisma.TransactionClient, resource: SupportedResource, id: string, actorId: string) {
  if (resource === "STUDY_PROGRAM") {
    const current = await tx.studyProgram.findUnique({where: {id}, select: {id: true}});
    return current
      ? {ok: false, code: "IDENTITY_CONFLICT"} as const
      : {ok: false, code: "NOT_FOUND"} as const;
  }
  if (resource === "LECTURER") {
    const row = await tx.lecturer.findUnique({
      where: {id},
      select: {id: true, _count: {select: {research: true, communityServices: true, posts: true}}},
    });
    if (!row) return {ok: false, code: "NOT_FOUND"} as const;
    if (row._count.research + row._count.communityServices + row._count.posts > 0) return {ok: false, code: "IN_USE"} as const;
    await tx.lecturer.delete({where: {id}});
    await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Lecturer", resourceId: id, metadata: {operation: "DELETE"}}});
    return AcademicMutationResultSchema.parse({ok: true, id, resource, version: null});
  }
  const row = await tx.staff.findUnique({where: {id}, select: {id: true}});
  if (!row) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.staff.delete({where: {id}});
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Staff", resourceId: id, metadata: {operation: "DELETE"}}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource, version: null});
}

export async function executeAcademicPeopleCommand(
  prisma: AcademicPeopleDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<AcademicMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AcademicCommandSchema.safeParse(rawCommand);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as SupportedResource)) {
    return {ok: false, code: "VALIDATION_FAILED"};
  }
  const command = parsed.data as AcademicCommand & {resource: SupportedResource};

  try {
    let sanitized: StudyProgramInput | LecturerInput | StaffInput | null = null;
    if (command.action !== "DELETE") {
      if (command.resource === "STUDY_PROGRAM") sanitized = sanitizeStudyProgram(command.payload as StudyProgramInput);
      else if (command.resource === "LECTURER") sanitized = sanitizeLecturer(command.payload as LecturerInput);
      else sanitized = command.payload as StaffInput;
    }
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") return deleteAcademicPerson(tx, command.resource, command.id, actor.userId);
      if (command.resource === "STUDY_PROGRAM") {
        return command.action === "CREATE"
          ? createStudyProgram(tx, sanitized as StudyProgramInput, actor.userId, now)
          : updateStudyProgram(tx, command.mutation.id, command.mutation.expectedVersion, sanitized as StudyProgramInput, actor.userId, now);
      }
      if (command.resource === "LECTURER") {
        return command.action === "CREATE"
          ? createLecturer(tx, sanitized as LecturerInput, actor.userId, now)
          : updateLecturer(tx, command.mutation.id, command.mutation.expectedVersion, sanitized as LecturerInput, actor.userId, now);
      }
      return command.action === "CREATE"
        ? createStaff(tx, sanitized as StaffInput, actor.userId, now)
        : updateStaff(tx, command.mutation.id, command.mutation.expectedVersion, sanitized as StaffInput, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

function resolvedTranslation<T extends {locale: Locale; status: string}>(translations: T[], locale: Locale) {
  return translations.find((translation) => translation.locale === locale && translation.status === "PUBLISHED")
    ?? translations.find((translation) => translation.locale === "id" && translation.status === "PUBLISHED")
    ?? null;
}

function resolvedStudyProgram(row: {
  id: string;
  translations: Array<{locale: Locale; status: string; name: string}>;
}, locale: Locale) {
  const translation = resolvedTranslation(row.translations, locale);
  if (!translation) return null;
  return {
    requestedLocale: locale,
    resolvedLocale: translation.locale,
    isFallback: translation.locale !== locale,
    name: translation.name,
  };
}

export async function listPublicAcademicPeople(
  prisma: AcademicPeopleDatabase,
  rawQuery: unknown,
  locale: Locale,
  rawUploadBase = "/uploads",
) {
  const parsed = AcademicListQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as SupportedResource)) {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
  const query = parsed.data;
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  try {
    if (query.resource === "STUDY_PROGRAM") {
      const where: Prisma.StudyProgramWhereInput = {
        isActive: true,
        code: {in: PUBLIC_STUDY_PROGRAM_CODES},
        translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
        ...(query.search === "" ? {} : {OR: [
          {code: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {status: "PUBLISHED", name: {contains: query.search, mode: "insensitive"}}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.studyProgram.findMany({
          where, orderBy: [{order: direction}, {id: "asc"}], ...pagination,
          include: {
            translations: {where: {status: "PUBLISHED"}},
            logoMedia: {select: MEDIA_SELECT},
          },
        }),
        prisma.studyProgram.count({where}),
      ]);
      const items = rows.flatMap((row) => {
        const translation = resolvedTranslation(row.translations, locale);
        if (!translation) return [];
        const item = PublicAcademicDirectoryItemSchema.safeParse({
          id: row.id, resource: "STUDY_PROGRAM", slug: row.slug, name: translation.name,
          secondaryText: `${row.degree} · ${row.code}`, institutionalEmail: row.email,
          photo: publicMedia(row.logoMedia, rawUploadBase), studyProgram: null,
        });
        return item.success ? [item.data] : [];
      });
      return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
    }

    if (query.resource === "LECTURER") {
      const where: Prisma.LecturerWhereInput = {
        isActive: true,
        translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
        ...(query.studyProgramId ? {studyProgramId: query.studyProgramId} : {}),
        ...(query.search === "" ? {} : {OR: [
          {name: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {status: "PUBLISHED", OR: [
            {position: {contains: query.search, mode: "insensitive"}},
            {expertise: {contains: query.search, mode: "insensitive"}},
          ]}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.lecturer.findMany({
          where, orderBy: [{order: direction}, {name: "asc"}, {id: "asc"}], ...pagination,
          include: {
            translations: {where: {status: "PUBLISHED"}}, photoMedia: {select: MEDIA_SELECT},
            studyProgram: {include: {translations: {where: {status: "PUBLISHED"}}}},
          },
        }),
        prisma.lecturer.count({where}),
      ]);
      const items = rows.flatMap((row) => {
        const translation = resolvedTranslation(row.translations, locale);
        if (!translation) return [];
        const item = PublicAcademicDirectoryItemSchema.safeParse({
          id: row.id, resource: "LECTURER", slug: row.slug, name: row.name,
          secondaryText: translation.position ?? translation.expertise,
          institutionalEmail: row.email, photo: publicMedia(row.photoMedia, rawUploadBase),
          studyProgram: row.studyProgram?.isActive && PUBLIC_STUDY_PROGRAM_CODE_SET.has(row.studyProgram.code)
            ? resolvedStudyProgram(row.studyProgram, locale)
            : null,
        });
        return item.success ? [item.data] : [];
      });
      return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
    }

    if (query.studyProgramId) return {ok: true as const, data: {items: [], page: pageMetadata(query.page, query.pageSize, 0)}};
    const where: Prisma.StaffWhereInput = {
      isActive: true,
      translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
      ...(query.search === "" ? {} : {OR: [
        {name: {contains: query.search, mode: "insensitive"}},
        {translations: {some: {status: "PUBLISHED", OR: [
          {position: {contains: query.search, mode: "insensitive"}},
          {unit: {contains: query.search, mode: "insensitive"}},
        ]}}},
      ]}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.staff.findMany({
        where, orderBy: [{order: direction}, {name: "asc"}, {id: "asc"}], ...pagination,
        include: {translations: {where: {status: "PUBLISHED"}}, photoMedia: {select: MEDIA_SELECT}},
      }),
      prisma.staff.count({where}),
    ]);
    const items = rows.flatMap((row) => {
      const translation = resolvedTranslation(row.translations, locale);
      if (!translation) return [];
      const item = PublicAcademicDirectoryItemSchema.safeParse({
        id: row.id, resource: "STAFF", slug: row.slug, name: row.name,
        secondaryText: translation.position ?? translation.unit,
        institutionalEmail: row.email, photo: publicMedia(row.photoMedia, rawUploadBase), studyProgram: null,
      });
      return item.success ? [item.data] : [];
    });
    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function academicPeopleHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT", "IDENTITY_CONFLICT", "IN_USE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
