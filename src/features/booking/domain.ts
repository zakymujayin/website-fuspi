import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {ActiveDatabaseSessionSchema} from "@/contracts/auth";
import {
  CmsPageMetadataSchema,
  collectDuplicateAwareSearchParams,
} from "@/contracts/cms";

import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {
  createTrackingTokenDigest,
  generateTrackingToken,
  verifyTrackingTokenDigest,
} from "@/lib/security/tracking-token";


export type BookingDatabase = ReturnType<typeof createPrismaClient>;

type Locale = "id" | "en" | "ar";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const BOOKING_NUMBER_PATTERN = /^FUSPI-B-\d{4}-\d{4,}$/u;
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const BookingActorSchema = ActiveDatabaseSessionSchema.extend({
  role: z.enum(["ADMIN", "PETUGAS"]),
  mustChangePassword: z.literal(false),
}).strict();

const RAW_ROOM_LIST_QUERY_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
}).strict();

const ROOM_LIST_QUERY_SCHEMA = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  direction: z.enum(["ASC", "DESC"]).default("DESC"),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
}).strict();

const ROOM_TRANSLATION_INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1).max(191).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)),
  location: z.string().trim().min(1).max(500).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)).nullable(),
  facilities: z.string().trim().min(1).max(5000).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)).nullable(),
}).strict();

const ROOM_OPERATING_HOUR_INPUT_SCHEMA = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAtMinute: z.number().int().min(0).max(1439),
  closesAtMinute: z.number().int().min(0).max(1439),
}).strict().superRefine(({opensAtMinute, closesAtMinute}, ctx) => {
  if (opensAtMinute >= closesAtMinute) {
    ctx.addIssue({code: "custom", path: ["closesAtMinute"], message: "Close time must be after open time."});
  }
});

const ROOM_BLACKOUT_INPUT_SCHEMA = z.object({
  id: z.string().trim().min(1).max(191).optional(),
  startTime: z.string().datetime({offset: true}),
  endTime: z.string().datetime({offset: true}),
  reason: z.string().trim().min(1).max(500).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)),
}).strict().superRefine(({startTime, endTime}, ctx) => {
  if (new Date(startTime) >= new Date(endTime)) {
    ctx.addIssue({code: "custom", path: ["endTime"], message: "Blackout end must be after start."});
  }
});

const ROOM_INPUT_SCHEMA = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  capacity: z.number().int().min(1).max(5000),
  bufferMinutes: z.number().int().min(0).max(480),
  isActive: z.boolean(),
  translations: z.object({
    id: ROOM_TRANSLATION_INPUT_SCHEMA,
    en: ROOM_TRANSLATION_INPUT_SCHEMA.optional(),
    ar: ROOM_TRANSLATION_INPUT_SCHEMA.optional(),
  }).strict(),
  operatingHours: z.array(ROOM_OPERATING_HOUR_INPUT_SCHEMA).min(0).max(7),
  blackouts: z.array(ROOM_BLACKOUT_INPUT_SCHEMA).min(0).max(100).optional(),
  contentOwnerId: z.string().trim().min(1).max(191).nullable().optional(),
}).strict();

const ROOM_COMMAND_SCHEMA = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: ROOM_INPUT_SCHEMA}).strict(),
  z.object({
    action: z.literal("UPDATE"),
    roomId: z.string().trim().min(1).max(191),
    expectedVersion: z.number().int().positive(),
    payload: ROOM_INPUT_SCHEMA,
  }).strict(),
  z.object({action: z.literal("DELETE"), roomId: z.string().trim().min(1).max(191)}).strict(),
]);

const BOOKING_SUBMIT_INPUT_SCHEMA = z.object({
  roomId: z.string().trim().min(1).max(191),
  requesterName: z.string().trim().min(1).max(191).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)),
  requesterEmail: z.string().trim().toLowerCase().email().max(320),
  requesterPhone: z.string().trim().min(1).max(30).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)).nullable().optional(),
  organization: z.string().trim().min(1).max(255).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)).nullable().optional(),
  purpose: z.string().trim().min(1).max(5000).refine((v) => !UNSAFE_TEXT_PATTERN.test(v)),
  participantCount: z.number().int().min(1).max(10000),
  startTime: z.string().datetime({offset: true}),
  endTime: z.string().datetime({offset: true}),
}).strict().superRefine(({startTime, endTime}, ctx) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (start >= end) {
    ctx.addIssue({code: "custom", path: ["endTime"], message: "End time must be after start time."});
  }
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    ctx.addIssue({code: "custom", path: ["endTime"], message: "Booking duration cannot exceed 24 hours."});
  }
});

const BOOKING_ADMIN_COMMAND_SCHEMA = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
    bookingId: z.string().trim().min(1).max(191),
    expectedVersion: z.number().int().positive(),
    applicationStorageKey: z.string().min(1).max(500).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("REJECT"),
    bookingId: z.string().trim().min(1).max(191),
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  }).strict(),
  z.object({
    action: z.literal("CANCEL"),
    bookingId: z.string().trim().min(1).max(191),
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  }).strict(),
]);

const PUBLIC_BOOKING_TRACK_QUERY_SCHEMA = z.object({
  bookingNumber: z.string().regex(BOOKING_NUMBER_PATTERN),
  token: z.string().regex(TRACKING_TOKEN_PATTERN),
}).strict();

const PUBLIC_BOOKING_CANCEL_SCHEMA = PUBLIC_BOOKING_TRACK_QUERY_SCHEMA.extend({
  reason: z.string().trim().min(1).max(500).nullable().optional(),
}).strict();

const ROOM_LIST_RESULT_SCHEMA = z.object({
  items: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    location: z.string().nullable(),
    capacity: z.number().int(),
    bufferMinutes: z.number().int(),
    isActive: z.boolean(),
    version: z.number().int(),
    operatingHours: z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      opensAtMinute: z.number().int(),
      closesAtMinute: z.number().int(),
    })),
    translations: z.array(z.object({
      locale: z.enum(["id", "en", "ar"]),
      status: z.string(),
      sourceVersion: z.number().int(),
      translatorId: z.string().nullable(),
      reviewerId: z.string().nullable(),
      reviewedAt: z.string().nullable(),
    })),
    governance: z.object({
      status: z.string(),
      contentOwnerId: z.string().nullable(),
      lastReviewedAt: z.string().nullable(),
      reviewDueAt: z.string().nullable(),
      expiresAt: z.string().nullable(),
    }),
  })),
  page: CmsPageMetadataSchema,
}).strict();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ROOM_MUTATION_RESULT_SCHEMA = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), id: z.string(), version: z.number().int().nullable()}).strict(),
  z.object({ok: z.literal(false), code: z.enum([
    "SESSION_INVALID", "VALIDATION_FAILED", "NOT_FOUND", "SLUG_CONFLICT",
    "VERSION_CONFLICT", "IN_USE", "UNAVAILABLE",
  ])}).strict(),
]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BOOKING_PUBLIC_SUBMIT_RESULT_SCHEMA = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    bookingNumber: z.string().regex(BOOKING_NUMBER_PATTERN),
    trackingToken: z.string().length(43),
    status: z.enum(["MENUNGGU"]),
  }).strict(),
  z.object({ok: z.literal(false), code: z.enum([
    "REQUEST_INVALID", "ROOM_NOT_FOUND", "ROOM_INACTIVE", "TIME_INVALID",
    "TIME_OVERLAP", "CAPACITY_EXCEEDED", "OPERATING_HOURS", "BLACKOUT", "UNAVAILABLE",
  ])}).strict(),
]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BOOKING_ADMIN_RESULT_SCHEMA = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), bookingId: z.string(), version: z.number().int()}).strict(),
  z.object({ok: z.literal(false), code: z.enum([
    "SESSION_INVALID", "VALIDATION_FAILED", "NOT_FOUND", "VERSION_CONFLICT",
    "INVALID_STATE", "UNAVAILABLE",
  ])}).strict(),
]);

const BOOKING_ADMIN_LIST_QUERY_SCHEMA = z.object({
  status: z.enum(["ALL", "MENUNGGU", "DISETUJUI", "DITOLAK", "DIBATALKAN", "SELESAI"]).default("ALL"),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
}).strict();

const BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), bookingNumber: z.string().regex(BOOKING_NUMBER_PATTERN)}).strict(),
  z.object({ok: z.literal(false), code: z.enum([
    "REQUEST_INVALID", "NOT_FOUND", "INVALID_STATE", "UNAVAILABLE",
  ])}).strict(),
]);

const PUBLIC_ROOM_LIST_RESULT_SCHEMA = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    items: z.array(z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      location: z.string().nullable(),
      facilities: z.string().nullable(),
      capacity: z.number().int(),
      todayOperatingHours: z.object({
        opensAtMinute: z.number().int().nullable(),
        closesAtMinute: z.number().int().nullable(),
      }).nullable(),
    })).max(50),
  }).strict(),
  z.object({ok: z.literal(false), code: z.literal("UNAVAILABLE")}).strict(),
]);

function roomAdminOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function bookingActorOrNull(rawActor: unknown, now: Date) {
  const actor = BookingActorSchema.safeParse(rawActor);
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

function workflow(translation: {
  locale: Locale;
  status: string;
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

function isPrismaCode(error: unknown, code: string) {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === code;
}

function uniqueFailure(error: unknown) {
  if (!isPrismaCode(error, "P2002")) return {ok: false as const, code: "UNAVAILABLE" as const};
  const target = error instanceof PrismaNamespace.PrismaClientKnownRequestError
    ? String(error.meta?.target ?? "")
    : "";
  return {ok: false as const, code: target.toLowerCase().includes("slug") ? "SLUG_CONFLICT" as const : "UNAVAILABLE" as const};
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

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaDayAndMinute(utcDate: Date): {dayOfWeek: number; minuteOfDay: number} {
  const jakartaMs = utcDate.getTime() + JAKARTA_OFFSET_MS;
  const jakartaDate = new Date(jakartaMs);
  const dayOfWeek = jakartaDate.getUTCDay();
  const minuteOfDay = jakartaDate.getUTCHours() * 60 + jakartaDate.getUTCMinutes();
  return {dayOfWeek, minuteOfDay};
}

function toJakartaISO(utcDate: Date): string {
  const jakartaMs = utcDate.getTime() + JAKARTA_OFFSET_MS;
  const d = new Date(jakartaMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+07:00`;
}

async function checkRoomOperatingHours(
  tx: Prisma.TransactionClient,
  roomId: string,
  startTime: Date,
  endTime: Date,
): Promise<{ok: true} | {ok: false; code: "OPERATING_HOURS" | "UNAVAILABLE"}> {
  try {
    const {dayOfWeek: startDay} = jakartaDayAndMinute(startTime);
    const {dayOfWeek: endDay} = jakartaDayAndMinute(endTime);
    const relevantDays = startDay === endDay ? [startDay] : [startDay, endDay];

    const hours = await tx.roomOperatingHour.findMany({
      where: {roomId, dayOfWeek: {in: relevantDays}},
      select: {dayOfWeek: true, opensAtMinute: true, closesAtMinute: true},
    });

    for (const day of relevantDays) {
      const dayHours = hours.filter((h) => h.dayOfWeek === day);
      if (dayHours.length === 0) return {ok: false, code: "OPERATING_HOURS"};

      if (day === startDay) {
        const {minuteOfDay} = jakartaDayAndMinute(startTime);
        const hasValidHour = dayHours.some(
          (h) => minuteOfDay >= h.opensAtMinute && minuteOfDay < h.closesAtMinute,
        );
        if (!hasValidHour) return {ok: false, code: "OPERATING_HOURS"};
      }

      if (day === endDay) {
        const {minuteOfDay} = jakartaDayAndMinute(endTime);
        const hasValidHour = dayHours.some(
          (h) => minuteOfDay > h.opensAtMinute && minuteOfDay <= h.closesAtMinute,
        );
        if (!hasValidHour) return {ok: false, code: "OPERATING_HOURS"};
      }
    }

    return {ok: true};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

async function hasConflictingBlackout(
  tx: Prisma.TransactionClient,
  roomId: string,
  startTime: Date,
  endTime: Date,
): Promise<boolean> {
  const blackout = await tx.roomBlackout.findFirst({
    where: {
      roomId,
      startTime: {lt: endTime},
      endTime: {gt: startTime},
    },
    select: {id: true},
  });
  return blackout !== null;
}

async function hasConflictingBooking(
  tx: Prisma.TransactionClient,
  roomId: string,
  startTime: Date,
  endTime: Date,
  bufferMs: number,
  excludeBookingId?: string,
): Promise<boolean> {
  const adjustedStart = new Date(startTime.getTime() - bufferMs);
  const adjustedEnd = new Date(endTime.getTime() + bufferMs);

  const conflicting = await tx.booking.findFirst({
    where: {
      roomId,
      status: {in: ["MENUNGGU", "DISETUJUI"]},
      ...(excludeBookingId ? {id: {not: excludeBookingId}} : {}),
      startTime: {lt: adjustedEnd},
      endTime: {gt: adjustedStart},
    },
    select: {id: true},
  });
  return conflicting !== null;
}

async function generateBookingNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const jakartaNow = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const year = jakartaNow.getUTCFullYear();

  const seq = await tx.annualSequence.upsert({
    where: {kind_year: {kind: "BOOKING", year}},
    create: {kind: "BOOKING", year, value: 1},
    update: {value: {increment: 1}},
    select: {value: true},
  });

  return `FUSPI-B-${year}-${String(seq.value).padStart(4, "0")}`;
}

function getTrackingTokenSecret(): string {
  const secret = process.env.TOKEN_HMAC_SECRET;
  if (!secret) throw new Error("TOKEN_HMAC_SECRET is not configured.");
  return secret;
}

function resolvedTranslation<T extends {locale: Locale; status: string}>(translations: T[], locale: Locale) {
  return translations.find((t) => t.locale === locale && t.status === "PUBLISHED")
    ?? translations.find((t) => t.locale === "id" && t.status === "PUBLISHED")
    ?? null;
}

export function normalizeRoomSearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_ROOM_LIST_QUERY_SCHEMA.parse(collectDuplicateAwareSearchParams(params));
    return {
      ok: true as const,
      data: ROOM_LIST_QUERY_SCHEMA.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        search: raw.search ?? "",
        direction: raw.direction ?? "DESC",
        active: raw.active ?? "ALL",
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listRooms(
  prisma: BookingDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
) {
  if (!roomAdminOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = ROOM_LIST_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;

  const active = query.active === "ALL" ? {} : {isActive: query.active === "ACTIVE"};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};

  try {
    const where: Prisma.RoomWhereInput = {
      ...active,
      ...(query.search === "" ? {} : {
        OR: [
          {slug: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {name: {contains: query.search, mode: "insensitive"}}}},
        ],
      }),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.room.findMany({
        where,
        orderBy: [{slug: direction}, {id: "asc"}],
        ...pagination,
        include: {
          translations: true,
          operatingHours: {select: {dayOfWeek: true, opensAtMinute: true, closesAtMinute: true}},
        },
      }),
      prisma.room.count({where}),
    ]);

    const items = rows.map((row) => ROOM_LIST_RESULT_SCHEMA.shape.items.element.parse({
      id: row.id,
      slug: row.slug,
      name: row.translations.find((t) => t.locale === "id")?.name ?? row.translations[0]?.name ?? "",
      location: row.translations.find((t) => t.locale === "id")?.location ?? null,
      capacity: row.capacity,
      bufferMinutes: row.bufferMinutes,
      isActive: row.isActive,
      version: row.version,
      operatingHours: row.operatingHours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        opensAtMinute: h.opensAtMinute,
        closesAtMinute: h.closesAtMinute,
      })),
      translations: row.translations.map(workflow),
      governance: governance(row),
    }));

    return {ok: true as const, data: ROOM_LIST_RESULT_SCHEMA.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function getRoomDetail(
  prisma: BookingDatabase,
  rawActor: unknown,
  roomId: string,
  now = new Date(),
) {
  if (!roomAdminOrNull(rawActor, now)) return {ok: false as const, code: "NOT_FOUND" as const};
  try {
    const row = await prisma.room.findUnique({
      where: {id: roomId},
      include: {
        translations: true,
        operatingHours: {select: {dayOfWeek: true, opensAtMinute: true, closesAtMinute: true}},
        blackouts: {
          where: {endTime: {gt: now}},
          orderBy: {startTime: "asc"},
          select: {id: true, startTime: true, endTime: true, reason: true},
        },
      },
    });
    if (!row) return {ok: false as const, code: "NOT_FOUND" as const};

    return {
      ok: true as const,
      data: {
        id: row.id,
        slug: row.slug,
        capacity: row.capacity,
        bufferMinutes: row.bufferMinutes,
        isActive: row.isActive,
        version: row.version,
        translations: row.translations.map(workflow),
        operatingHours: row.operatingHours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          opensAtMinute: h.opensAtMinute,
          closesAtMinute: h.closesAtMinute,
        })),
        blackouts: row.blackouts.map((b) => ({
          id: b.id,
          startTime: toJakartaISO(b.startTime),
          endTime: toJakartaISO(b.endTime),
          reason: b.reason,
        })),
        governance: governance(row),
      },
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

async function replaceRoomTranslations(
  tx: Prisma.TransactionClient,
  roomId: string,
  translations: z.infer<typeof ROOM_INPUT_SCHEMA>["translations"],
  isActive: boolean,
  actorId: string,
  version: number,
  now: Date,
) {
  const entries: Array<[Locale, z.infer<typeof ROOM_TRANSLATION_INPUT_SCHEMA>]> = [];
  entries.push(["id", translations.id]);
  if (translations.en) entries.push(["en", translations.en]);
  if (translations.ar) entries.push(["ar", translations.ar]);

  await tx.roomTranslation.deleteMany({
    where: {roomId, locale: {notIn: entries.map(([locale]) => locale)}},
  });

  for (const [locale, value] of entries) {
    const state = translationState(locale, isActive, actorId, now);
    await tx.roomTranslation.upsert({
      where: {roomId_locale: {roomId, locale}},
      create: {
        roomId, locale,
        name: value.name,
        location: value.location,
        facilities: value.facilities,
        ...state,
        sourceVersion: version,
      },
      update: {
        name: value.name,
        location: value.location,
        facilities: value.facilities,
        ...state,
        sourceVersion: version,
      },
    });
  }
}

async function replaceOperatingHours(
  tx: Prisma.TransactionClient,
  roomId: string,
  hours: z.infer<typeof ROOM_OPERATING_HOUR_INPUT_SCHEMA>[],
) {
  await tx.roomOperatingHour.deleteMany({where: {roomId}});
  if (hours.length > 0) {
    await tx.roomOperatingHour.createMany({
      data: hours.map((h) => ({
        roomId,
        dayOfWeek: h.dayOfWeek,
        opensAtMinute: h.opensAtMinute,
        closesAtMinute: h.closesAtMinute,
      })),
    });
  }
}

async function replaceBlackouts(
  tx: Prisma.TransactionClient,
  roomId: string,
  blackouts: z.infer<typeof ROOM_BLACKOUT_INPUT_SCHEMA>[],
) {
  await tx.roomBlackout.deleteMany({where: {roomId}});
  if (blackouts.length > 0) {
    await tx.roomBlackout.createMany({
      data: blackouts.map((b) => ({
        roomId,
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
        reason: b.reason,
      })),
    });
  }
}

async function createRoom(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof ROOM_INPUT_SCHEMA>,
  actorId: string,
  now: Date,
) {
  const row = await tx.room.create({
    data: {
      slug: input.slug,
      capacity: input.capacity,
      bufferMinutes: input.bufferMinutes,
      isActive: input.isActive,
      contentOwnerId: input.contentOwnerId ?? null,
    },
    select: {id: true, version: true},
  });

  await replaceRoomTranslations(tx, row.id, input.translations, input.isActive, actorId, row.version, now);
  await replaceOperatingHours(tx, row.id, input.operatingHours);
  if (input.blackouts) await replaceBlackouts(tx, row.id, input.blackouts);

  await tx.activityLog.create({
    data: {actorId, action: "CREATE", resourceType: "Room", resourceId: row.id},
  });

  return {ok: true as const, id: row.id, version: row.version};
}

async function updateRoom(
  tx: Prisma.TransactionClient,
  roomId: string,
  expectedVersion: number,
  input: z.infer<typeof ROOM_INPUT_SCHEMA>,
  actorId: string,
  now: Date,
) {
  const current = await tx.room.findUnique({where: {id: roomId}, select: {id: true, slug: true}});
  if (!current) return {ok: false as const, code: "NOT_FOUND" as const};

  const claim = await tx.room.updateMany({
    where: {id: roomId, version: expectedVersion},
    data: {version: {increment: 1}},
  });
  if (claim.count !== 1) return {ok: false as const, code: "VERSION_CONFLICT" as const};

  const version = expectedVersion + 1;
  await tx.room.update({
    where: {id: roomId},
    data: {
      slug: input.slug,
      capacity: input.capacity,
      bufferMinutes: input.bufferMinutes,
      isActive: input.isActive,
      contentOwnerId: input.contentOwnerId ?? null,
    },
  });

  await replaceRoomTranslations(tx, roomId, input.translations, input.isActive, actorId, version, now);
  await replaceOperatingHours(tx, roomId, input.operatingHours);
  if (input.blackouts) await replaceBlackouts(tx, roomId, input.blackouts);

  await tx.activityLog.create({
    data: {actorId, action: "UPDATE", resourceType: "Room", resourceId: roomId},
  });

  return {ok: true as const, id: roomId, version};
}

async function deleteRoom(
  tx: Prisma.TransactionClient,
  roomId: string,
  actorId: string,
) {
  const current = await tx.room.findUnique({
    where: {id: roomId},
    select: {id: true, _count: {select: {bookings: true}}},
  });
  if (!current) return {ok: false as const, code: "NOT_FOUND" as const};
  if (current._count.bookings > 0) return {ok: false as const, code: "IN_USE" as const};

  await tx.room.delete({where: {id: roomId}});
  await tx.activityLog.create({
    data: {actorId, action: "UPDATE", resourceType: "Room", resourceId: roomId, metadata: {operation: "DELETE"}},
  });

  return {ok: true as const, id: roomId, version: null};
}

export async function executeRoomCommand(
  prisma: BookingDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
) {
  const actor = roomAdminOrNull(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};

  const parsed = ROOM_COMMAND_SCHEMA.safeParse(rawCommand);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  const command = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") return deleteRoom(tx, command.roomId, actor.userId);
      if (command.action === "CREATE") return createRoom(tx, command.payload, actor.userId, now);
      return updateRoom(tx, command.roomId, command.expectedVersion, command.payload, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (error instanceof z.ZodError) return {ok: false as const, code: "VALIDATION_FAILED" as const};
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function listPublicRooms(
  prisma: BookingDatabase,
  locale: Locale,
  now = new Date(),
) {
  try {
    const {dayOfWeek: todayDay} = jakartaDayAndMinute(now);

    const rows = await prisma.room.findMany({
      where: {
        isActive: true,
        translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
      },
      orderBy: [{slug: "asc"}, {id: "asc"}],
      include: {
        translations: {where: {status: "PUBLISHED"}},
        operatingHours: {where: {dayOfWeek: todayDay}, select: {dayOfWeek: true, opensAtMinute: true, closesAtMinute: true}},
      },
    });

    const items = rows.flatMap((row) => {
      const translation = resolvedTranslation(row.translations, locale);
      if (!translation) return [];

      const todayHours = row.operatingHours.find((h) => h.dayOfWeek === todayDay);

      const item = PUBLIC_ROOM_LIST_RESULT_SCHEMA.options[0].shape.items.element.safeParse({
        id: row.id,
        slug: row.slug,
        name: translation.name,
        location: translation.location,
        facilities: (translation as { facilities: string | null }).facilities ?? null,
        capacity: row.capacity,
        todayOperatingHours: todayHours
          ? {opensAtMinute: todayHours.opensAtMinute, closesAtMinute: todayHours.closesAtMinute}
          : null,
      });
      return item.success ? [item.data] : [];
    });

    return {ok: true as const, items};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function checkRoomAvailability(
  prisma: BookingDatabase,
  roomId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
) {
  try {
    const room = await prisma.room.findUnique({
      where: {id: roomId},
      select: {id: true, isActive: true, capacity: true, bufferMinutes: true},
    });
    if (!room) return {ok: false as const, code: "ROOM_NOT_FOUND" as const};
    if (!room.isActive) return {ok: false as const, code: "ROOM_INACTIVE" as const};

    if (startTime >= endTime || endTime.getTime() - startTime.getTime() > 24 * 60 * 60 * 1000) {
      return {ok: false as const, code: "TIME_INVALID" as const};
    }

    await prisma.$transaction(async (tx) => {
      const hoursCheck = await checkRoomOperatingHours(tx, roomId, startTime, endTime);
      if (!hoursCheck.ok) throw hoursCheck;

      const blackoutConflict = await hasConflictingBlackout(tx, roomId, startTime, endTime);
      if (blackoutConflict) throw {ok: false, code: "BLACKOUT" as const};

      const bufferMs = room.bufferMinutes * 60 * 1000;
      const bookingConflict = await hasConflictingBooking(tx, roomId, startTime, endTime, bufferMs, excludeBookingId);
      if (bookingConflict) throw {ok: false, code: "TIME_OVERLAP" as const};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});

    return {ok: true as const};
  } catch (error) {
    if (error && typeof error === "object" && "ok" in error && (error as { ok: unknown }).ok === false) {
      return error as {ok: false; code: string};
    }
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function listBookings(
  prisma: BookingDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
) {
  if (!bookingActorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = BOOKING_ADMIN_LIST_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const where: Prisma.BookingWhereInput = query.status === "ALL" ? {} : {status: query.status};

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy: [{createdAt: "desc"}, {id: "desc"}],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          room: {include: {translations: {where: {status: "PUBLISHED"}}}},
        },
      }),
      prisma.booking.count({where}),
    ]);
    return {
      ok: true as const,
      data: {
        items: rows.map((booking) => {
          const roomTranslation = resolvedTranslation(
            booking.room.translations as Array<{locale: Locale; status: string; name: string; location: string | null}>,
            "id",
          );
          return {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            roomName: roomTranslation?.name ?? booking.room.slug,
            requesterName: booking.requesterName,
            requesterEmail: booking.requesterEmail,
            organization: booking.organization,
            purpose: booking.purpose,
            participantCount: booking.participantCount,
            status: booking.status,
            version: booking.version,
            startTime: toJakartaISO(booking.startTime),
            endTime: toJakartaISO(booking.endTime),
            createdAt: toJakartaISO(booking.createdAt),
            cancelReason: booking.cancelReason,
          };
        }),
        page: pageMetadata(query.page, query.pageSize, total),
      },
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function submitBooking(
  prisma: BookingDatabase,
  rawInput: unknown,
  now = new Date(),
) {
  const parsed = BOOKING_SUBMIT_INPUT_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const input = parsed.data;

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  let trackingToken: string;

  try {
    const secret = getTrackingTokenSecret();

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: {id: input.roomId},
        select: {id: true, isActive: true, capacity: true, bufferMinutes: true},
      });
      if (!room) throw {ok: false as const, code: "ROOM_NOT_FOUND" as const};
      if (!room.isActive) throw {ok: false as const, code: "ROOM_INACTIVE" as const};

      if (input.participantCount > room.capacity) {
        throw {ok: false as const, code: "CAPACITY_EXCEEDED" as const};
      }

      const hoursCheck = await checkRoomOperatingHours(tx, room.id, startTime, endTime);
      if (!hoursCheck.ok) throw hoursCheck;

      const blackoutConflict = await hasConflictingBlackout(tx, room.id, startTime, endTime);
      if (blackoutConflict) throw {ok: false as const, code: "BLACKOUT" as const};

      const bufferMs = room.bufferMinutes * 60 * 1000;
      const bookingConflict = await hasConflictingBooking(tx, room.id, startTime, endTime, bufferMs);
      if (bookingConflict) throw {ok: false as const, code: "TIME_OVERLAP" as const};

      const bookingNumber = await generateBookingNumber(tx, now);
      trackingToken = generateTrackingToken();
      const tokenHash = createTrackingTokenDigest(trackingToken, secret, "BOOKING");

      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          trackingTokenHash: tokenHash,
          roomId: room.id,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          requesterPhone: input.requesterPhone ?? null,
          organization: input.organization ?? null,
          purpose: input.purpose,
          participantCount: input.participantCount,
          startTime,
          endTime,
          status: "MENUNGGU",
        },
        select: {id: true, bookingNumber: true, version: true},
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: "MENUNGGU",
          createdAt: now,
        },
      });

      await tx.activityLog.create({
        data: {action: "CREATE", resourceType: "Booking", resourceId: booking.id},
      });

      return {
        ok: true as const,
        bookingNumber: booking.bookingNumber,
        trackingToken,
        status: "MENUNGGU" as const,
      };
    }, {
      isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 30000,
    });
  } catch (error) {
    if (error && typeof error === "object" && "ok" in error && (error as { ok: unknown }).ok === false) {
      return error as {ok: false; code: string};
    }
    if (isPrismaCode(error, "P2002")) return {ok: false as const, code: "UNAVAILABLE" as const};
    if (isPrismaCode(error, "P2034")) return {ok: false as const, code: "UNAVAILABLE" as const};
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function executeBookingCommand(
  prisma: BookingDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
) {
  const actor = bookingActorOrNull(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};

  const parsed = BOOKING_ADMIN_COMMAND_SCHEMA.safeParse(rawCommand);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  const command = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: {id: command.bookingId},
        select: {id: true, version: true, status: true},
      });
      if (!booking) throw {ok: false as const, code: "NOT_FOUND" as const};

      if (booking.version !== command.expectedVersion) {
        throw {ok: false as const, code: "VERSION_CONFLICT" as const};
      }

      const fromStatus = booking.status;

      if (command.action === "APPROVE") {
        if (fromStatus !== "MENUNGGU") throw {ok: false as const, code: "INVALID_STATE" as const};

        await tx.booking.update({
          where: {id: booking.id},
          data: {
            status: "DISETUJUI",
            version: {increment: 1},
            approvedById: actor.userId,
            approvedAt: now,
            applicationStorageKey: command.applicationStorageKey ?? null,
          },
        });

        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            actorId: actor.userId,
            fromStatus,
            toStatus: "DISETUJUI",
            createdAt: now,
          },
        });
      } else if (command.action === "REJECT") {
        if (fromStatus !== "MENUNGGU") throw {ok: false as const, code: "INVALID_STATE" as const};

        await tx.booking.update({
          where: {id: booking.id},
          data: {
            status: "DITOLAK",
            version: {increment: 1},
          },
        });

        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            actorId: actor.userId,
            fromStatus,
            toStatus: "DITOLAK",
            reason: command.reason ?? null,
            createdAt: now,
          },
        });
      } else {
        if (!["MENUNGGU", "DISETUJUI"].includes(fromStatus)) {
          throw {ok: false as const, code: "INVALID_STATE" as const};
        }

        await tx.booking.update({
          where: {id: booking.id},
          data: {
            status: "DIBATALKAN",
            version: {increment: 1},
            cancelledAt: now,
            cancelReason: command.reason ?? null,
          },
        });

        await tx.bookingHistory.create({
          data: {
            bookingId: booking.id,
            actorId: actor.userId,
            fromStatus,
            toStatus: "DIBATALKAN",
            reason: command.reason ?? null,
            createdAt: now,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "Booking",
          resourceId: booking.id,
          metadata: {action: command.action, fromStatus},
        },
      });

      return {ok: true as const, bookingId: booking.id, version: booking.version + 1};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (error && typeof error === "object" && "ok" in error && (error as { ok: unknown }).ok === false) {
      return error as {ok: false; code: string};
    }
    if (isPrismaCode(error, "P2034")) return {ok: false as const, code: "UNAVAILABLE" as const};
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function getPublicBooking(
  prisma: BookingDatabase,
  rawQuery: unknown,
) {
  const parsed = PUBLIC_BOOKING_TRACK_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "NOT_FOUND" as const};

  try {
    const secret = getTrackingTokenSecret();

    const booking = await prisma.booking.findUnique({
      where: {bookingNumber: parsed.data.bookingNumber},
      include: {
        room: {
          include: {
            translations: {where: {status: "PUBLISHED"}},
          },
        },
        history: {
          orderBy: {createdAt: "asc"},
          select: {fromStatus: true, toStatus: true, reason: true, createdAt: true},
        },
      },
    });

    /* `verifyTrackingTokenDigest` is used rather than hashing and comparing here:
       `createTrackingTokenDigest` parses with `.parse`, so a well-formed but
       non-canonical base64url token threw and surfaced as UNAVAILABLE, answering
       503 for what is simply a wrong code. The shared verifier also compares in
       constant time, which a plain `!==` on a secret digest did not. */
    if (!booking || !verifyTrackingTokenDigest(parsed.data.token, booking.trackingTokenHash, secret, "BOOKING")) {
      return {ok: false as const, code: "NOT_FOUND" as const};
    }

    const roomTranslation = resolvedTranslation(
      booking.room.translations as Array<{locale: Locale; status: string; name: string; location: string | null}>,
      "id",
    );

    return {
      ok: true as const,
      bookingNumber: booking.bookingNumber,
      roomName: roomTranslation?.name ?? "",
      roomLocation: roomTranslation?.location ?? null,
      status: booking.status,
      startTime: toJakartaISO(booking.startTime),
      endTime: toJakartaISO(booking.endTime),
      purpose: booking.purpose,
      participantCount: booking.participantCount,
      createdAt: toJakartaISO(booking.createdAt),
      approvedAt: booking.approvedAt ? toJakartaISO(booking.approvedAt) : null,
      cancelledAt: booking.cancelledAt ? toJakartaISO(booking.cancelledAt) : null,
      cancelReason: booking.cancelReason ?? null,
      history: booking.history.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        createdAt: toJakartaISO(h.createdAt),
      })),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function cancelPublicBooking(
  prisma: BookingDatabase,
  rawInput: unknown,
  now = new Date(),
) {
  const parsed = PUBLIC_BOOKING_CANCEL_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA.parse({ok: false, code: "REQUEST_INVALID"});

  try {
    const secret = getTrackingTokenSecret();
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: {bookingNumber: parsed.data.bookingNumber},
        select: {
          id: true,
          bookingNumber: true,
          trackingTokenHash: true,
          status: true,
        },
      });
      if (!booking || !verifyTrackingTokenDigest(parsed.data.token, booking.trackingTokenHash, secret, "BOOKING")) {
        return BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA.parse({ok: false, code: "NOT_FOUND"});
      }
      if (!["MENUNGGU", "DISETUJUI"].includes(booking.status)) {
        return BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA.parse({ok: false, code: "INVALID_STATE"});
      }
      await tx.booking.update({
        where: {id: booking.id},
        data: {
          status: "DIBATALKAN",
          version: {increment: 1},
          cancelledAt: now,
          cancelReason: parsed.data.reason ?? null,
        },
      });
      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: "DIBATALKAN",
          reason: parsed.data.reason ?? null,
          createdAt: now,
        },
      });
      await tx.activityLog.create({
        data: {
          action: "UPDATE",
          resourceType: "Booking",
          resourceId: booking.id,
          metadata: {action: "PUBLIC_CANCEL", fromStatus: booking.status},
        },
      });
      return BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA.parse({ok: true, bookingNumber: booking.bookingNumber});
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch {
    return BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA.parse({ok: false, code: "UNAVAILABLE"});
  }
}

export function bookingHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT", "TIME_OVERLAP", "BLACKOUT"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}

export type RoomListQuery = z.infer<typeof ROOM_LIST_QUERY_SCHEMA>;
export type RoomMutationResult = z.infer<typeof ROOM_MUTATION_RESULT_SCHEMA>;
export type BookingPublicSubmitResult = z.infer<typeof BOOKING_PUBLIC_SUBMIT_RESULT_SCHEMA>;
export type BookingAdminResult = z.infer<typeof BOOKING_ADMIN_RESULT_SCHEMA>;
export type BookingAdminListQuery = z.infer<typeof BOOKING_ADMIN_LIST_QUERY_SCHEMA>;
export type BookingPublicCancelResult = z.infer<typeof BOOKING_PUBLIC_CANCEL_RESULT_SCHEMA>;
