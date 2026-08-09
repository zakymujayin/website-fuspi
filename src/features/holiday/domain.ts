import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {CmsIdentifierSchema} from "@/contracts/cms";
import {HolidayDateKeySchema} from "@/contracts/operations";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type HolidayDatabase = ReturnType<typeof createPrismaClient>;

const REQUEST_INVALID = {ok: false as const, code: "REQUEST_INVALID" as const};
const UNAVAILABLE = {ok: false as const, code: "UNAVAILABLE" as const};
const SESSION_INVALID = {ok: false as const, code: "SESSION_INVALID" as const};
const NOT_FOUND = {ok: false as const, code: "NOT_FOUND" as const};

const RAW_HOLIDAY_LIST_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  year: z.string().regex(/^\d{4}$/u).optional(),
}).strict();

const HOLIDAY_LIST_QUERY_SCHEMA = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  year: z.number().int().min(2000).max(2100).optional(),
}).strict();

const HOLIDAY_CREATE_SCHEMA = z.object({
  date: HolidayDateKeySchema,
  description: z.string().trim().min(1).max(255),
  isActive: z.boolean().default(true),
}).strict();

const HOLIDAY_UPDATE_SCHEMA = z.object({
  id: CmsIdentifierSchema,
  date: HolidayDateKeySchema,
  description: z.string().trim().min(1).max(255),
  isActive: z.boolean(),
}).strict();

const HOLIDAY_DELETE_SCHEMA = z.object({
  id: CmsIdentifierSchema,
}).strict();

const HOLIDAY_COMMAND_SCHEMA = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: HOLIDAY_CREATE_SCHEMA}).strict(),
  z.object({action: z.literal("UPDATE"), payload: HOLIDAY_UPDATE_SCHEMA}).strict(),
  z.object({action: z.literal("DELETE"), payload: HOLIDAY_DELETE_SCHEMA}).strict(),
]);

export type HolidayListResult =
  | {ok: true; data: {items: Array<{id: string; date: string; description: string; isActive: boolean}>; page: {page: number; pageSize: 10 | 20 | 50; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean}}}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};
export type HolidayCommandResult =
  | {ok: true; id: string}
  | {ok: false; code: "SESSION_INVALID" | "CSRF_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE"};

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

export function normalizeHolidaySearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_HOLIDAY_LIST_SCHEMA.parse(Object.fromEntries(params));
    return {
      ok: true as const,
      data: HOLIDAY_LIST_QUERY_SCHEMA.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        year: raw.year === undefined ? undefined : Number(raw.year),
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listHolidays(
  prisma: HolidayDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
): Promise<HolidayListResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const parsed = HOLIDAY_LIST_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return REQUEST_INVALID;

  const {page, pageSize, year} = parsed.data;

  try {
    const where: Prisma.HolidayWhereInput = {
      ...(year !== undefined
        ? {date: {gte: new Date(`${year}-01-01T00:00:00.000Z`), lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)}}
        : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.holiday.findMany({
        where,
        orderBy: {date: "asc"},
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.holiday.count({where}),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      date: row.date.toISOString().slice(0, 10),
      description: row.name,
      isActive: row.isActive,
    }));

    return {
      ok: true,
      data: {items, page: pagesMetadata(page, pageSize, total)},
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function getAllActiveHolidays(
  prisma: HolidayDatabase,
): Promise<string[]> {
  try {
    const rows = await prisma.holiday.findMany({
      where: {isActive: true},
      select: {date: true},
      orderBy: {date: "asc"},
    });
    return rows.map((row) => row.date.toISOString().slice(0, 10));
  } catch {
    return [];
  }
}

export async function executeHolidayCommand(
  prisma: HolidayDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<HolidayCommandResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  const parsed = HOLIDAY_COMMAND_SCHEMA.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};

  const command = parsed.data;

  try {
    if (command.action === "CREATE") {
      const {date, description, isActive} = command.payload;
      const row = await prisma.holiday.create({
        data: {date: new Date(`${date}T00:00:00.000Z`), name: description, isActive},
        select: {id: true},
      });
      return {ok: true, id: row.id};
    }

    if (command.action === "UPDATE") {
      const {id, date, description, isActive} = command.payload;
      const existing = await prisma.holiday.findUnique({where: {id}, select: {id: true}});
      if (!existing) return NOT_FOUND;
      await prisma.holiday.update({
        where: {id},
        data: {date: new Date(`${date}T00:00:00.000Z`), name: description, isActive},
      });
      return {ok: true, id};
    }

    const {id} = command.payload;
    const existing = await prisma.holiday.findUnique({where: {id}, select: {id: true}});
    if (!existing) return NOT_FOUND;
    await prisma.holiday.delete({where: {id}});
    return {ok: true, id};
  } catch {
    return UNAVAILABLE;
  }
}

export function holidayHttpStatus(result: {ok: boolean; code?: string}): number {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "REQUEST_INVALID") return 400;
  if (result.code === "NOT_FOUND") return 404;
  return 503;
}
