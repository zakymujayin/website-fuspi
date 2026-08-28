import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsConfiguredLinkSchema,
  CmsPageMetadataSchema,
  CmsPublicDocumentViewSchema,
  CmsTranslationResolutionSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import type {createPrismaClient} from "@/lib/db/client";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type PublicContentDatabase = ReturnType<typeof createPrismaClient>;
export type Locale = "id" | "en" | "ar";

export const MEDIA_SELECT = {
  id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
  alt: true, isDecorative: true, width: true, height: true, focalX: true, focalY: true,
} as const;

export type MediaRow = {
  id: string; storageKey: string; storageClass: string; mimeType: string; size: number;
  alt: string | null; isDecorative: boolean; width: number | null; height: number | null;
  focalX: number | null; focalY: number | null;
} | null;

export type DocumentRow = {
  id: string; slug: string; storageKey: string; storageClass: string; mimeType: string;
  size: number; publishedAt: Date | null; version: number;
  translations: Array<{locale: Locale; title: string; category: string | null; status: string}>;
} | null;

function uploadRoot(value: string) {
  return value.replace(/\/+$/u, "") || "/uploads";
}

export function actorOrNull(raw: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(raw);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

export function pageMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return CmsPageMetadataSchema.parse({
    page, pageSize, total, totalPages,
    hasNextPage: page < totalPages, hasPreviousPage: page > 1,
  });
}

export function workflow(row: {
  locale: Locale; status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "STALE";
  sourceVersion: number; translatorId: string | null; reviewerId: string | null; reviewedAt: Date | null;
}) {
  return {
    locale: row.locale, status: row.status, sourceVersion: row.sourceVersion,
    translatorId: row.translatorId, reviewerId: row.reviewerId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

export function governance(row: {
  governanceStatus: string; contentOwnerId: string | null; lastReviewedAt: Date | null;
  reviewDueAt: Date | null; expiresAt: Date | null;
}) {
  return {
    status: row.governanceStatus, contentOwnerId: row.contentOwnerId,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: row.reviewDueAt?.toISOString() ?? null, expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

export function translationState(locale: Locale, publishId: boolean, actorId: string, now: Date, version = 1) {
  const published = locale === "id" && publishId;
  return {
    status: published ? "PUBLISHED" as const : "DRAFT" as const,
    sourceVersion: version, translatorId: actorId,
    reviewerId: published ? actorId : null, reviewedAt: published ? now : null,
  };
}

export function resolve<T extends {locale: Locale; status: string}>(rows: T[], locale: Locale) {
  return rows.find((row) => row.locale === locale && row.status === "PUBLISHED")
    ?? rows.find((row) => row.locale === "id" && row.status === "PUBLISHED") ?? null;
}

export function resolution(requestedLocale: Locale, resolvedLocale: Locale) {
  return CmsTranslationResolutionSchema.parse({
    requestedLocale, resolvedLocale, isFallback: requestedLocale !== resolvedLocale,
  });
}

export function mediaView(media: MediaRow, uploadBase = "/uploads") {
  if (
    !media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp"
    || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success
  ) return null;
  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id, url: `${uploadRoot(uploadBase)}/${media.storageKey}`,
    mimeType: media.mimeType, size: media.size, alt: media.alt,
    isDecorative: media.isDecorative, width: media.width, height: media.height,
    focalX: media.focalX, focalY: media.focalY,
  });
  return parsed.success ? parsed.data : null;
}

function adminPreviewAlt(value: string | null) {
  const text = value?.trim() ?? "";
  return text.length <= 500 && !/[\u0000-\u001f\u007f-\u009f]/u.test(text) ? text : "";
}

function adminPreviewDimension(value: number | null) {
  return Number.isInteger(value) && value !== null && value > 0 && value <= 1_600 ? value : null;
}

export function adminImageMediaPreview(media: MediaRow, uploadBase = "/uploads") {
  if (
    !media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp"
    || media.size <= 0 || media.size > 20_971_520
    || !StorageKeySchema.safeParse(media.storageKey).success
  ) return null;
  const alt = adminPreviewAlt(media.alt);
  return {
    id: media.id,
    url: `${uploadRoot(uploadBase)}/${media.storageKey}`,
    mimeType: "image/webp" as const,
    size: media.size,
    alt,
    isDecorative: alt.length === 0 ? true : media.isDecorative,
    width: adminPreviewDimension(media.width),
    height: adminPreviewDimension(media.height),
    focalX: media.focalX,
    focalY: media.focalY,
  };
}

export function publicPdfMedia(media: MediaRow) {
  return Boolean(media && media.storageClass === "PUBLIC" && media.mimeType === "application/pdf"
    && media.storageKey.endsWith(".pdf") && StorageKeySchema.safeParse(media.storageKey).success
    && media.size > 0 && media.size <= 20_971_520);
}

export function documentView(document: DocumentRow, locale: Locale, uploadBase = "/uploads") {
  if (
    !document || document.storageClass !== "PUBLIC" || document.mimeType !== "application/pdf"
    || !document.publishedAt || !StorageKeySchema.safeParse(document.storageKey).success
  ) return null;
  const translation = resolve(document.translations, locale);
  if (!translation) return null;
  const parsed = CmsPublicDocumentViewSchema.safeParse({
    id: document.id, slug: document.slug,
    translation: {...resolution(locale, translation.locale), title: translation.title, category: translation.category},
    url: `${uploadRoot(uploadBase)}/${document.storageKey}`, mimeType: "application/pdf",
    size: document.size, version: document.version,
  });
  return parsed.success ? parsed.data : null;
}

export function configuredLink(value: string | null) {
  if (value === null) return null;
  const parsed = CmsConfiguredLinkSchema.safeParse({
    kind: value.startsWith("/") ? "INTERNAL" : "EXTERNAL", href: value,
  });
  return parsed.success ? parsed.data : undefined;
}

export function rich(value: string | null) {
  if (value === null) return null;
  try { return sanitizeRichTextHtml(value); } catch { return undefined; }
}

export function sanitizeLocalized<T extends Record<string, Record<string, unknown>>>(
  translations: T,
  richFields: string[],
) {
  const sanitized = Object.fromEntries(Object.entries(translations).map(([locale, translation]) => [locale,
    Object.fromEntries(Object.entries(translation).map(([key, value]) => [
      key,
      richFields.includes(key) && typeof value === "string" ? sanitizeRichTextHtml(value) : value,
    ])),
  ]));
  return sanitized as T;
}

export function safeDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function isExpired(expiresAt: Date | null, now: Date) {
  return expiresAt !== null && expiresAt <= now;
}

export function isPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === code;
}

export function parseAgain<T>(schema: z.ZodType<T>, value: unknown) {
  return schema.parse(value);
}
