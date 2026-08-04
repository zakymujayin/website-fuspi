import {z} from "zod";

import {
  AchievementInputSchema,
  AlbumInputSchema,
  DocumentInputSchema,
  EventInputSchema,
  FaqInputSchema,
  PartnershipInputSchema,
  PublicContentAdminCommandSchema,
  PublicContentMutationResultSchema,
  ScholarshipInputSchema,
  ServiceInputSchema,
  StudentActivityInputSchema,
  TestimonialInputSchema,
  type PublicContentAdminCommand,
  type PublicContentMutationResult,
  type PublicContentResource,
} from "@/contracts/public-content";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import {createContentRevision} from "@/lib/db/revision";

import {
  MEDIA_SELECT,
  actorOrNull,
  documentView,
  isPrismaCode,
  mediaView,
  publicPdfMedia,
  sanitizeLocalized,
  translationState,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

type ServiceInput = z.infer<typeof ServiceInputSchema>;
type PartnershipInput = z.infer<typeof PartnershipInputSchema>;
type ScholarshipInput = z.infer<typeof ScholarshipInputSchema>;
type AchievementInput = z.infer<typeof AchievementInputSchema>;
type StudentActivityInput = z.infer<typeof StudentActivityInputSchema>;
type DocumentInput = z.infer<typeof DocumentInputSchema>;
type AlbumInput = z.infer<typeof AlbumInputSchema>;
type EventInput = z.infer<typeof EventInputSchema>;
type FaqInput = z.infer<typeof FaqInputSchema>;
type TestimonialInput = z.infer<typeof TestimonialInputSchema>;
type Mutation = {id: string; expectedVersion: number | null};

const VERSIONED = new Set<PublicContentResource>(["SERVICE", "DOCUMENT", "EVENT", "FAQ"]);
const RICH_FIELDS: Record<PublicContentResource, string[]> = {
  SERVICE: ["description"], PARTNERSHIP: ["description"], SCHOLARSHIP: ["description"],
  ACHIEVEMENT: ["description"], STUDENT_ACTIVITY: ["description"], DOCUMENT: [],
  ALBUM: ["description"], EVENT: ["description"], FAQ: ["answer"], TESTIMONIAL: ["quote"],
};

function isSlugConflict(error: unknown) {
  if (!isPrismaCode(error, "P2002") || typeof error !== "object" || error === null || !("meta" in error)) return false;
  const target = (error as {meta?: {target?: unknown}}).meta?.target;
  return (Array.isArray(target) ? target : [target]).some((value) => typeof value === "string" && value.toLowerCase().includes("slug"));
}

function sanitizePayload(resource: PublicContentResource, payload: unknown) {
  const schema = {
    SERVICE: ServiceInputSchema, PARTNERSHIP: PartnershipInputSchema, SCHOLARSHIP: ScholarshipInputSchema,
    ACHIEVEMENT: AchievementInputSchema, STUDENT_ACTIVITY: StudentActivityInputSchema, DOCUMENT: DocumentInputSchema,
    ALBUM: AlbumInputSchema, EVENT: EventInputSchema, FAQ: FaqInputSchema, TESTIMONIAL: TestimonialInputSchema,
  }[resource];
  const input = schema.parse(payload) as {translations: Record<string, Record<string, unknown>>};
  return schema.parse({...input, translations: sanitizeLocalized(input.translations, RICH_FIELDS[resource])});
}

function translationRows<R, T extends {translations: Record<string, Record<string, unknown>>}>(
  input: T,
  publish: boolean,
  actorId: string,
  now: Date,
  version = 1,
) {
  return Object.entries(input.translations).map(([locale, value]) => ({
    locale: locale as Locale, ...value, ...translationState(locale as Locale, publish, actorId, now, version),
  })) as unknown as R[];
}

async function validImages(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length === 0) return true;
  const unique = [...new Set(ids)];
  const rows = await tx.media.findMany({where: {id: {in: unique}}, select: MEDIA_SELECT});
  return rows.length === unique.length && rows.every((row) => mediaView(row) !== null);
}

async function validDocument(tx: Prisma.TransactionClient, id: string | null) {
  if (id === null) return true;
  const row = await tx.document.findUnique({where: {id}, include: {translations: true}});
  return documentView(row, "id") !== null;
}

function versionIntent(resource: PublicContentResource, mutation: Mutation | null) {
  if (!mutation) return true;
  return VERSIONED.has(resource) ? mutation.expectedVersion !== null : mutation.expectedVersion === null;
}

async function claimVersion(
  tx: Prisma.TransactionClient,
  resource: "SERVICE" | "DOCUMENT" | "EVENT" | "FAQ",
  mutation: Mutation,
) {
  if (mutation.expectedVersion === null) return null;
  const where = {id: mutation.id, version: mutation.expectedVersion};
  const data = {version: {increment: 1 as const}};
  const result = resource === "SERVICE" ? await tx.service.updateMany({where, data})
    : resource === "DOCUMENT" ? await tx.document.updateMany({where, data})
    : resource === "EVENT" ? await tx.event.updateMany({where, data})
    : await tx.faq.updateMany({where, data});
  return result.count === 1 ? mutation.expectedVersion + 1 : null;
}

async function revision(
  tx: Prisma.TransactionClient,
  resourceType: "Service" | "Document" | "Event" | "Faq",
  id: string,
  version: number,
  actorId: string,
  input: Record<string, unknown>,
  action: string,
) {
  const root = {...input};
  delete root.translations;
  await createContentRevision(tx, {resourceType, resourceId: id, version, actorId, changeSummary: action, snapshot: root});
}

async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: "CREATE" | "UPDATE",
  resourceType: string,
  resourceId: string,
  operation?: string,
  version?: number,
) {
  await tx.activityLog.create({data: {
    actorId, action, resourceType, resourceId,
    ...(operation ? {metadata: {operation, ...(version ? {version} : {})}} : {}),
  }});
}

async function mutateService(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: ServiceInput, mutation: Mutation | null, actorId: string, now: Date) {
  let id: string; let version: number;
  if (action === "CREATE") {
    const row = await tx.service.create({data: {
      slug: input.slug, category: input.category, url: input.link?.href ?? null, icon: input.icon,
      isActive: input.isActive, order: input.order, contentOwnerId: input.contentOwnerId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      translations: {create: translationRows<Prisma.ServiceTranslationCreateWithoutServiceInput, ServiceInput>(input, input.isActive, actorId, now)},
    }}); id = row.id; version = row.version;
  } else {
    if (!mutation || !versionIntent("SERVICE", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (!await tx.service.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    const claimed = await claimVersion(tx, "SERVICE", mutation); if (!claimed) return {ok: false, code: "VERSION_CONFLICT"} as const;
    id = mutation.id; version = claimed;
    await tx.service.update({where: {id}, data: {
      slug: input.slug, category: input.category, url: input.link?.href ?? null, icon: input.icon,
      isActive: input.isActive, order: input.order, contentOwnerId: input.contentOwnerId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      translations: {deleteMany: {}, create: translationRows<Prisma.ServiceTranslationCreateWithoutServiceInput, ServiceInput>(input, input.isActive, actorId, now, version)},
    }});
  }
  await revision(tx, "Service", id, version, actorId, input, action);
  await audit(tx, actorId, action, "Service", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "SERVICE", version});
}

async function mutatePartnership(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: PartnershipInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("PARTNERSHIP", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await validImages(tx, input.logoMediaId ? [input.logoMediaId] : [])) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validDocument(tx, input.documentId)) return {ok: false, code: "DOCUMENT_INVALID"} as const;
  const data = {
    slug: input.slug, partnerName: input.partnerName, level: input.level, country: input.country,
    startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null,
    documentId: input.documentId, documentUrl: input.legacyDocumentUrl, websiteUrl: input.websiteUrl,
    logoMediaId: input.logoMediaId, isActive: input.isActive, order: input.order,
  };
  let id: string;
  if (action === "CREATE") id = (await tx.partnership.create({data: {...data, translations: {create: translationRows<Prisma.PartnershipTranslationCreateWithoutPartnershipInput, PartnershipInput>(input, input.isActive, actorId, now)}}})).id;
  else {
    if (!mutation || !await tx.partnership.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.partnership.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.PartnershipTranslationCreateWithoutPartnershipInput, PartnershipInput>(input, input.isActive, actorId, now)}}});
  }
  await audit(tx, actorId, action, "Partnership", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "PARTNERSHIP", version: null});
}

async function mutateScholarship(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: ScholarshipInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("SCHOLARSHIP", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await validDocument(tx, input.documentId)) return {ok: false, code: "DOCUMENT_INVALID"} as const;
  const data = {slug: input.slug, startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null, registrationUrl: input.registrationUrl, documentId: input.documentId, isActive: input.isActive};
  let id: string;
  if (action === "CREATE") id = (await tx.scholarship.create({data: {...data, translations: {create: translationRows<Prisma.ScholarshipTranslationCreateWithoutScholarshipInput, ScholarshipInput>(input, input.isActive, actorId, now)}}})).id;
  else {
    if (!mutation || !await tx.scholarship.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.scholarship.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.ScholarshipTranslationCreateWithoutScholarshipInput, ScholarshipInput>(input, input.isActive, actorId, now)}}});
  }
  await audit(tx, actorId, action, "Scholarship", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "SCHOLARSHIP", version: null});
}

async function mutateAchievement(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: AchievementInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("ACHIEVEMENT", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await validImages(tx, input.imageMediaId ? [input.imageMediaId] : [])) return {ok: false, code: "MEDIA_INVALID"} as const;
  const data = {slug: input.slug, studentName: input.studentName, level: input.level, achievedAt: input.achievedAt ? new Date(input.achievedAt) : null, imageMediaId: input.imageMediaId};
  let id: string;
  if (action === "CREATE") id = (await tx.achievement.create({data: {...data, translations: {create: translationRows<Prisma.AchievementTranslationCreateWithoutAchievementInput, AchievementInput>(input, true, actorId, now)}}})).id;
  else {
    if (!mutation || !await tx.achievement.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.achievement.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.AchievementTranslationCreateWithoutAchievementInput, AchievementInput>(input, true, actorId, now)}}});
  }
  await audit(tx, actorId, action, "Achievement", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "ACHIEVEMENT", version: null});
}

async function mutateStudentActivity(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: StudentActivityInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("STUDENT_ACTIVITY", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await validImages(tx, input.images.map(({mediaId}) => mediaId))) return {ok: false, code: "MEDIA_INVALID"} as const;
  const data = {slug: input.slug, date: input.date ? new Date(input.date) : null}; let id: string;
  if (action === "CREATE") id = (await tx.studentActivity.create({data: {...data, translations: {create: translationRows<Prisma.StudentActivityTranslationCreateWithoutStudentActivityInput, StudentActivityInput>(input, true, actorId, now)}, images: {create: input.images}}})).id;
  else {
    if (!mutation || !await tx.studentActivity.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.studentActivity.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.StudentActivityTranslationCreateWithoutStudentActivityInput, StudentActivityInput>(input, true, actorId, now)}, images: {deleteMany: {}, create: input.images}}});
  }
  await audit(tx, actorId, action, "StudentActivity", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "STUDENT_ACTIVITY", version: null});
}

async function mutateDocument(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: DocumentInput, mutation: Mutation | null, actorId: string, now: Date) {
  const media = await tx.media.findUnique({where: {id: input.publicPdfMediaId}, select: MEDIA_SELECT});
  if (!publicPdfMedia(media)) return {ok: false, code: "MEDIA_INVALID"} as const;
  let id: string; let version: number;
  const base = {slug: input.slug, storageKey: media!.storageKey, storageClass: "PUBLIC" as const, mimeType: "application/pdf", size: media!.size, publishedAt: input.isPublished ? now : null, contentOwnerId: input.contentOwnerId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null};
  if (action === "CREATE") {
    const row = await tx.document.create({data: {...base, translations: {create: translationRows<Prisma.DocumentTranslationCreateWithoutDocumentInput, DocumentInput>(input, input.isPublished, actorId, now)}}}); id = row.id; version = row.version;
  } else {
    if (!mutation || !versionIntent("DOCUMENT", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (!await tx.document.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    const claimed = await claimVersion(tx, "DOCUMENT", mutation); if (!claimed) return {ok: false, code: "VERSION_CONFLICT"} as const;
    id = mutation.id; version = claimed;
    await tx.document.update({where: {id}, data: {...base, translations: {deleteMany: {}, create: translationRows<Prisma.DocumentTranslationCreateWithoutDocumentInput, DocumentInput>(input, input.isPublished, actorId, now, version)}}});
  }
  await revision(tx, "Document", id, version, actorId, {...input, publicPdfMediaId: input.publicPdfMediaId}, action);
  await audit(tx, actorId, action, "Document", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "DOCUMENT", version});
}

async function mutateAlbum(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: AlbumInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("ALBUM", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  const imageIds = [...input.photos.map(({mediaId}) => mediaId), ...(input.coverMediaId ? [input.coverMediaId] : [])];
  if (!await validImages(tx, imageIds)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const data = {slug: input.slug, coverMediaId: input.coverMediaId, eventDate: input.eventDate ? new Date(input.eventDate) : null, isPublished: input.isPublished}; let id: string;
  if (action === "CREATE") id = (await tx.album.create({data: {...data, translations: {create: translationRows<Prisma.AlbumTranslationCreateWithoutAlbumInput, AlbumInput>(input, input.isPublished, actorId, now)}, photos: {create: input.photos}}})).id;
  else {
    if (!mutation || !await tx.album.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.album.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.AlbumTranslationCreateWithoutAlbumInput, AlbumInput>(input, input.isPublished, actorId, now)}, photos: {deleteMany: {}, create: input.photos}}});
  }
  await audit(tx, actorId, action, "Album", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "ALBUM", version: null});
}

async function mutateEvent(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: EventInput, mutation: Mutation | null, actorId: string, now: Date) {
  let id: string; let version: number;
  const data = {slug: input.slug, startAt: new Date(input.startAt), endAt: input.endAt ? new Date(input.endAt) : null, registrationUrl: input.registrationUrl, isPublished: input.isPublished, contentOwnerId: input.contentOwnerId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null};
  if (action === "CREATE") { const row = await tx.event.create({data: {...data, translations: {create: translationRows<Prisma.EventTranslationCreateWithoutEventInput, EventInput>(input, input.isPublished, actorId, now)}}}); id = row.id; version = row.version; }
  else {
    if (!mutation || !versionIntent("EVENT", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (!await tx.event.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    const claimed = await claimVersion(tx, "EVENT", mutation); if (!claimed) return {ok: false, code: "VERSION_CONFLICT"} as const;
    id = mutation.id; version = claimed; await tx.event.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.EventTranslationCreateWithoutEventInput, EventInput>(input, input.isPublished, actorId, now, version)}}});
  }
  await revision(tx, "Event", id, version, actorId, input, action); await audit(tx, actorId, action, "Event", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "EVENT", version});
}

async function mutateFaq(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: FaqInput, mutation: Mutation | null, actorId: string, now: Date) {
  let id: string; let version: number;
  const data = {order: input.order, isVisible: input.isVisible, contentOwnerId: input.contentOwnerId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null};
  if (action === "CREATE") { const row = await tx.faq.create({data: {...data, translations: {create: translationRows<Prisma.FaqTranslationCreateWithoutFaqInput, FaqInput>(input, input.isVisible, actorId, now)}}}); id = row.id; version = row.version; }
  else {
    if (!mutation || !versionIntent("FAQ", mutation)) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (!await tx.faq.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    const claimed = await claimVersion(tx, "FAQ", mutation); if (!claimed) return {ok: false, code: "VERSION_CONFLICT"} as const;
    id = mutation.id; version = claimed; await tx.faq.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.FaqTranslationCreateWithoutFaqInput, FaqInput>(input, input.isVisible, actorId, now, version)}}});
  }
  await revision(tx, "Faq", id, version, actorId, input, action); await audit(tx, actorId, action, "Faq", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "FAQ", version});
}

async function mutateTestimonial(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: TestimonialInput, mutation: Mutation | null, actorId: string, now: Date) {
  if (!versionIntent("TESTIMONIAL", mutation) || (input.publicationConsentAt && new Date(input.publicationConsentAt) > now)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await validImages(tx, input.photoMediaId ? [input.photoMediaId] : [])) return {ok: false, code: "MEDIA_INVALID"} as const;
  const data = {name: input.name, graduationYear: input.graduationYear, photoMediaId: input.photoMediaId, order: input.order, isVisible: input.isVisible, publicationConsentAt: input.publicationConsentAt ? new Date(input.publicationConsentAt) : null}; let id: string;
  if (action === "CREATE") id = (await tx.testimonial.create({data: {...data, translations: {create: translationRows<Prisma.TestimonialTranslationCreateWithoutTestimonialInput, TestimonialInput>(input, input.isVisible, actorId, now)}}})).id;
  else {
    if (!mutation || !await tx.testimonial.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id; await tx.testimonial.update({where: {id}, data: {...data, translations: {deleteMany: {}, create: translationRows<Prisma.TestimonialTranslationCreateWithoutTestimonialInput, TestimonialInput>(input, input.isVisible, actorId, now)}}});
  }
  await audit(tx, actorId, action, "Testimonial", id);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource: "TESTIMONIAL", version: null});
}

async function remove(tx: Prisma.TransactionClient, resource: PublicContentResource, id: string, expectedVersion: number | null, actorId: string) {
  if (VERSIONED.has(resource) !== (expectedVersion !== null)) return {ok: false, code: "VALIDATION_FAILED"} as const;
  const exists = resource === "SERVICE" ? await tx.service.findUnique({where: {id}, select: {id: true}})
    : resource === "PARTNERSHIP" ? await tx.partnership.findUnique({where: {id}, select: {id: true}})
    : resource === "SCHOLARSHIP" ? await tx.scholarship.findUnique({where: {id}, select: {id: true}})
    : resource === "ACHIEVEMENT" ? await tx.achievement.findUnique({where: {id}, select: {id: true}})
    : resource === "STUDENT_ACTIVITY" ? await tx.studentActivity.findUnique({where: {id}, select: {id: true}})
    : resource === "DOCUMENT" ? await tx.document.findUnique({where: {id}, select: {id: true}})
    : resource === "ALBUM" ? await tx.album.findUnique({where: {id}, select: {id: true}})
    : resource === "EVENT" ? await tx.event.findUnique({where: {id}, select: {id: true}})
    : resource === "FAQ" ? await tx.faq.findUnique({where: {id}, select: {id: true}})
    : await tx.testimonial.findUnique({where: {id}, select: {id: true}});
  if (!exists) return {ok: false, code: "NOT_FOUND"} as const;
  let version: number | null = null;
  if (VERSIONED.has(resource)) {
    const claimed = await claimVersion(tx, resource as "SERVICE" | "DOCUMENT" | "EVENT" | "FAQ", {id, expectedVersion});
    if (!claimed) return {ok: false, code: "VERSION_CONFLICT"} as const;
    version = claimed;
  }
  if (resource === "SERVICE") await tx.service.delete({where: {id}});
  else if (resource === "PARTNERSHIP") await tx.partnership.delete({where: {id}});
  else if (resource === "SCHOLARSHIP") await tx.scholarship.delete({where: {id}});
  else if (resource === "ACHIEVEMENT") await tx.achievement.delete({where: {id}});
  else if (resource === "STUDENT_ACTIVITY") await tx.studentActivity.delete({where: {id}});
  else if (resource === "DOCUMENT") await tx.document.delete({where: {id}});
  else if (resource === "ALBUM") await tx.album.delete({where: {id}});
  else if (resource === "EVENT") await tx.event.delete({where: {id}});
  else if (resource === "FAQ") await tx.faq.delete({where: {id}});
  else await tx.testimonial.delete({where: {id}});
  const resourceType = resource.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join("");
  await audit(tx, actorId, "UPDATE", resourceType, id, "DELETE", version ?? undefined);
  return PublicContentMutationResultSchema.parse({ok: true, id, resource, version});
}

async function reorder(tx: Prisma.TransactionClient, command: Extract<PublicContentAdminCommand, {action: "REORDER"}>, actorId: string) {
  const ids = command.payload.items.map(({id}) => id);
  const count = command.resource === "SERVICE" ? await tx.service.count({where: {id: {in: ids}}})
    : command.resource === "PARTNERSHIP" ? await tx.partnership.count({where: {id: {in: ids}}})
    : command.resource === "FAQ" ? await tx.faq.count({where: {id: {in: ids}}})
    : await tx.testimonial.count({where: {id: {in: ids}}});
  if (count !== ids.length) return {ok: false, code: "NOT_FOUND"} as const;
  for (const {id, position} of command.payload.items) {
    if (command.resource === "SERVICE") await tx.service.update({where: {id}, data: {order: position}});
    else if (command.resource === "PARTNERSHIP") await tx.partnership.update({where: {id}, data: {order: position}});
    else if (command.resource === "FAQ") await tx.faq.update({where: {id}, data: {order: position}});
    else await tx.testimonial.update({where: {id}, data: {order: position}});
  }
  const resourceType = command.resource[0] + command.resource.slice(1).toLowerCase();
  for (const {id} of command.payload.items) await audit(tx, actorId, "UPDATE", resourceType, id, "REORDER");
  return PublicContentMutationResultSchema.parse({ok: true, id: command.payload.items[0]!.id, resource: command.resource, version: null});
}

export async function executePublicContentCommand(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<PublicContentMutationResult> {
  const actor = actorOrNull(rawActor, now); if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = PublicContentAdminCommandSchema.safeParse(rawCommand); if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command = parsed.data;
  try {
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") return remove(tx, command.resource, command.id, command.expectedVersion, actor.userId);
      if (command.action === "REORDER") return reorder(tx, command, actor.userId);
      const input = sanitizePayload(command.resource, command.payload);
      const mutation = command.action === "UPDATE" ? command.mutation : null;
      if (command.resource === "SERVICE") return mutateService(tx, command.action, input as ServiceInput, mutation, actor.userId, now);
      if (command.resource === "PARTNERSHIP") return mutatePartnership(tx, command.action, input as PartnershipInput, mutation, actor.userId, now);
      if (command.resource === "SCHOLARSHIP") return mutateScholarship(tx, command.action, input as ScholarshipInput, mutation, actor.userId, now);
      if (command.resource === "ACHIEVEMENT") return mutateAchievement(tx, command.action, input as AchievementInput, mutation, actor.userId, now);
      if (command.resource === "STUDENT_ACTIVITY") return mutateStudentActivity(tx, command.action, input as StudentActivityInput, mutation, actor.userId, now);
      if (command.resource === "DOCUMENT") return mutateDocument(tx, command.action, input as DocumentInput, mutation, actor.userId, now);
      if (command.resource === "ALBUM") return mutateAlbum(tx, command.action, input as AlbumInput, mutation, actor.userId, now);
      if (command.resource === "EVENT") return mutateEvent(tx, command.action, input as EventInput, mutation, actor.userId, now);
      if (command.resource === "FAQ") return mutateFaq(tx, command.action, input as FaqInput, mutation, actor.userId, now);
      return mutateTestimonial(tx, command.action, input as TestimonialInput, mutation, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isSlugConflict(error)) return {ok: false, code: "SLUG_CONFLICT"};
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}
