import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {CmsIdentifierSchema} from "@/contracts/cms";
import {LocaleSchema} from "@/contracts/platform";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type ConsentDatabase = ReturnType<typeof createPrismaClient>;


const REQUEST_INVALID = {ok: false as const, code: "REQUEST_INVALID" as const};
const UNAVAILABLE = {ok: false as const, code: "UNAVAILABLE" as const};
const SESSION_INVALID = {ok: false as const, code: "SESSION_INVALID" as const};

const RECORD_CONSENT_SCHEMA = z.object({
  privacyNoticeId: CmsIdentifierSchema,
  subjectHash: z.string().min(8).max(128),
  purpose: z.string().trim().min(1).max(255),
  granted: z.boolean(),
  sessionId: z.string().min(1).max(191).optional(),
}).strict();

const CHECK_CONSENT_SCHEMA = z.object({
  subjectHash: z.string().min(8).max(128),
  purpose: z.string().trim().min(1).max(255),
}).strict();

const PAGE_FEEDBACK_SCHEMA = z.object({
  pagePath: z.string().trim().min(1).max(500),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
  locale: LocaleSchema.default("id"),
}).strict();

const FEEDBACK_LIST_QUERY_SCHEMA = z.object({
  pageType: z.string().trim().min(1).max(100).optional(),
  pageId: z.string().trim().min(1).max(500).optional(),
  locale: LocaleSchema.optional(),
  fromDate: z.iso.datetime({offset: true}).optional(),
  toDate: z.iso.datetime({offset: true}).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
}).strict();

const ADMIN_FEEDBACK_SCHEMA = z.object({
  id: CmsIdentifierSchema,
  pagePath: z.string().min(1).max(500),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).nullable(),
  locale: LocaleSchema,
  createdAt: z.iso.datetime({offset: true}),
});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const FEEDBACK_LIST_RESULT_SCHEMA = z.object({
  items: z.array(ADMIN_FEEDBACK_SCHEMA).max(50),
  page: z.object({
    page: z.number().int().min(1).max(10_000),
    pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ConsentRecordInput = z.infer<typeof RECORD_CONSENT_SCHEMA>;
export type CheckConsentInput = z.infer<typeof CHECK_CONSENT_SCHEMA>;
export type PageFeedbackInput = z.infer<typeof PAGE_FEEDBACK_SCHEMA>;
export type ConsentResult = {ok: true} | {ok: false; code: string};
export type ConsentedStatus = {granted: boolean; createdAt: string};
export type CheckConsentResult =
  | {ok: true; status: ConsentedStatus | null}
  | {ok: false; code: "REQUEST_INVALID" | "UNAVAILABLE"};
export type FeedbackSubmitResult =
  | {ok: true; id: string}
  | {ok: false; code: "REQUEST_INVALID" | "UNAVAILABLE"};
export type AdminFeedbackListResult =
  | {ok: true; data: z.infer<typeof FEEDBACK_LIST_RESULT_SCHEMA>}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};
export type AdminFeedbackStatsResult =
  | {ok: true; stats: {averageRating: number | null; totalCount: number; perPage: Array<{pagePath: string; averageRating: number | null; count: number}>}}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function pagesMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export async function recordConsent(
  prisma: ConsentDatabase,
  rawInput: unknown,
): Promise<ConsentResult> {
  const parsed = RECORD_CONSENT_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {privacyNoticeId, subjectHash, purpose, granted, sessionId} = parsed.data;

  try {
    const notice = await prisma.privacyNotice.findUnique({
      where: {id: privacyNoticeId},
      select: {id: true, isCurrent: true},
    });
    if (!notice || !notice.isCurrent) return REQUEST_INVALID;

    await prisma.consentRecord.create({
      data: {privacyNoticeId, subjectHash, purpose, granted, sessionId},
    });

    return {ok: true};
  } catch {
    return UNAVAILABLE;
  }
}

export async function checkConsent(
  prisma: ConsentDatabase,
  rawInput: unknown,
): Promise<CheckConsentResult> {
  const parsed = CHECK_CONSENT_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  try {
    const record = await prisma.consentRecord.findFirst({
      where: {subjectHash: parsed.data.subjectHash, purpose: parsed.data.purpose},
      orderBy: {createdAt: "desc"},
      select: {granted: true, createdAt: true},
    });

    return {
      ok: true,
      status: record ? {granted: record.granted, createdAt: record.createdAt.toISOString()} : null,
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function submitPageFeedback(
  prisma: ConsentDatabase,
  rawInput: unknown,
): Promise<FeedbackSubmitResult> {
  const parsed = PAGE_FEEDBACK_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  try {
    const feedback = await prisma.pageFeedback.create({
      data: {
        pageType: "ROUTE",
        pageId: parsed.data.pagePath,
        locale: parsed.data.locale,
        helpful: parsed.data.rating >= 4,
        comment: parsed.data.comment ?? null,
      },
      select: {id: true},
    });

    return {ok: true, id: feedback.id};
  } catch {
    return UNAVAILABLE;
  }
}

export async function listFeedback(
  prisma: ConsentDatabase,
  rawActor: unknown,
  rawInput: unknown,
  now = new Date(),
): Promise<AdminFeedbackListResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const parsed = FEEDBACK_LIST_QUERY_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {pageType, pageId: pageIdInput, locale, fromDate, toDate, page, pageSize} = parsed.data;

  try {
    const where: Prisma.PageFeedbackWhereInput = {
      ...(pageType ? {pageType} : {}),
      ...(pageIdInput ? {pageId: pageIdInput} : {}),
      ...(locale ? {locale} : {}),
      ...(fromDate || toDate ? {createdAt: {
        ...(fromDate ? {gte: new Date(fromDate)} : {}),
        ...(toDate ? {lte: new Date(toDate)} : {}),
      }} : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.pageFeedback.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          pageId: true,
          helpful: true,
          comment: true,
          locale: true,
          createdAt: true,
        },
      }),
      prisma.pageFeedback.count({where}),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      pagePath: row.pageId,
      rating: row.helpful ? 5 : 1,
      comment: row.comment,
      locale: row.locale,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      ok: true,
      data: {items, page: pagesMetadata(page, pageSize, total)},
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function aggregateFeedbackStats(
  prisma: ConsentDatabase,
  rawActor: unknown,
  rawInput: unknown,
  now = new Date(),
): Promise<AdminFeedbackStatsResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const STATS_QUERY_SCHEMA = z.object({
    fromDate: z.iso.datetime({offset: true}).optional(),
    toDate: z.iso.datetime({offset: true}).optional(),
  }).strict();

  const parsed = STATS_QUERY_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {fromDate, toDate} = parsed.data;

  try {
    const where: Prisma.PageFeedbackWhereInput = {
      ...(fromDate || toDate ? {createdAt: {
        ...(fromDate ? {gte: new Date(fromDate)} : {}),
        ...(toDate ? {lte: new Date(toDate)} : {}),
      }} : {}),
    };

    const helpfulCount = prisma.pageFeedback.count({
      where: {
        ...(fromDate || toDate ? {createdAt: {
          ...(fromDate ? {gte: new Date(fromDate)} : {}),
          ...(toDate ? {lte: new Date(toDate)} : {}),
        }} : {}),
        helpful: true,
      },
    });
    const perPageRows = prisma.pageFeedback.groupBy({
      by: ["pageId"],
      where,
      _count: {id: true},
      orderBy: {_count: {id: "desc"}},
      take: 50,
    });
    const perPageHelpful = prisma.pageFeedback.groupBy({
      by: ["pageId"],
      where: {
        ...(fromDate || toDate ? {createdAt: {
          ...(fromDate ? {gte: new Date(fromDate)} : {}),
          ...(toDate ? {lte: new Date(toDate)} : {}),
        }} : {}),
        helpful: true,
      },
      _count: {id: true},
    });

    const [overall, helpfulOverall, perPageRowsResult, perPageHelpfulResult] = await prisma.$transaction([
      prisma.pageFeedback.aggregate({where, _count: true}),
      helpfulCount,
      perPageRows,
      perPageHelpful,
    ]);

    const totalCount = overall._count ?? 0;
    const helpfulPerPageMap = new Map(perPageHelpfulResult.map((r) => [r.pageId, (r._count as {id?: number})?.id ?? 0]));

    const averageRating = totalCount > 0 ? helpfulOverall / totalCount : null;

    const perPage = perPageRowsResult.map((row) => {
      const count = (row._count as {id?: number})?.id ?? 0;
      const helpfulCount = helpfulPerPageMap.get(row.pageId) ?? 0;
      return {
        pagePath: row.pageId,
        averageRating: count > 0 ? helpfulCount / count : null,
        count,
      };
    });

    return {
      ok: true,
      stats: {
        averageRating,
        totalCount,
        perPage,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

export function consentHttpStatus(result: {ok: boolean; code?: string}): number {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "REQUEST_INVALID") return 400;
  if (result.code === "NOT_FOUND") return 404;
  return 503;
}
