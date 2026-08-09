import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {CmsIdentifierSchema} from "@/contracts/cms";
import {LocaleSchema} from "@/contracts/platform";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {consumeSharedRateLimit, createSharedRateLimitKey} from "@/lib/rate-limit/persistent";

export type FormDatabase = ReturnType<typeof createPrismaClient>;


const REQUEST_INVALID = {ok: false as const, code: "REQUEST_INVALID" as const};
const UNAVAILABLE = {ok: false as const, code: "UNAVAILABLE" as const};
const SESSION_INVALID = {ok: false as const, code: "SESSION_INVALID" as const};
const NOT_FOUND = {ok: false as const, code: "NOT_FOUND" as const};
const RATE_LIMITED = {ok: false as const, code: "RATE_LIMITED" as const};

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

const CONTACT_FORM_SCHEMA = z.object({
  name: z.string().trim().min(1).max(255).refine((v) => !UNSAFE_TEXT_PATTERN.test(v), "Invalid name."),
  email: z.string().trim().toLowerCase().email().max(320),
  subject: z.string().trim().max(500).refine((v) => !UNSAFE_TEXT_PATTERN.test(v), "Invalid subject.").optional(),
  message: z.string().trim().min(1).max(10_000).refine((v) => !UNSAFE_TEXT_PATTERN.test(v), "Invalid message."),
  locale: LocaleSchema.default("id"),
}).strict();

const FORM_LIST_QUERY_SCHEMA = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  fromDate: z.iso.datetime({offset: true}).optional(),
  toDate: z.iso.datetime({offset: true}).optional(),
}).strict();

const FORM_SUBMISSION_SCHEMA = z.object({
  id: CmsIdentifierSchema,
  name: z.string().min(1).max(255),
  email: z.string().email().max(320),
  subject: z.string().max(500).nullable(),
  message: z.string().min(1).max(10_000),
  locale: LocaleSchema,
  createdAt: z.iso.datetime({offset: true}),
  isRead: z.boolean(),
});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const FORM_LIST_RESULT_SCHEMA = z.object({
  items: z.array(FORM_SUBMISSION_SCHEMA).max(50),
  page: z.object({
    page: z.number().int().min(1).max(10_000),
    pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

const CSV_CELL_SCHEMA = z.string().max(100_000).refine(
  (value) => !/^[=+\-@\t\r]/u.test(value), "Spreadsheet formula prefixes are sanitized.",
);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const FORM_CSV_ROW_SCHEMA = z.object({
  name: CSV_CELL_SCHEMA,
  email: CSV_CELL_SCHEMA,
  subject: CSV_CELL_SCHEMA,
  message: CSV_CELL_SCHEMA,
  locale: CSV_CELL_SCHEMA,
  receivedAt: CSV_CELL_SCHEMA,
}).strict();

export type ContactFormInput = z.infer<typeof CONTACT_FORM_SCHEMA>;
export type FormSubmitResult =
  | {ok: true; id: string}
  | {ok: false; code: "REQUEST_INVALID" | "UNAVAILABLE" | "RATE_LIMITED"};
export type AdminFormListResult =
  | {ok: true; data: z.infer<typeof FORM_LIST_RESULT_SCHEMA>}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};
export type AdminFormDetailResult =
  | {ok: true; submission: z.infer<typeof FORM_SUBMISSION_SCHEMA>}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE"};
export type AdminFormReadResult =
  | {ok: true; id: string}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE"};
export type FormCsvResult =
  | {ok: true; filename: string; rows: z.infer<typeof FORM_CSV_ROW_SCHEMA>[]}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};
export type AdminSubscriberListResult =
  | {ok: true; data: {items: Array<{id: string; email: string; locale: string; isActive: boolean; createdAt: string}>; page: {page: number; pageSize: 10 | 20 | 50; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean}}}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};
export type SubscriberCsvResult =
  | {ok: true; filename: string; rows: Array<{email: string; locale: string; isActive: string; subscribedAt: string}>}
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

function sanitizeCsvCell(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/^[=+\-@\t\r]+/u, "'");
  return cleaned.slice(0, 100_000);
}

export async function submitContactForm(
  prisma: FormDatabase,
  rawInput: unknown,
  clientIp: string,
  rateLimitSecret: string,
  now = new Date(),
): Promise<FormSubmitResult> {
  const parsed = CONTACT_FORM_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  try {
    const keyHash = createSharedRateLimitKey("CONTACT_SUBMIT", clientIp, rateLimitSecret);
    const rateLimitResult = await consumeSharedRateLimit(prisma, {
      policy: "CONTACT_SUBMIT",
      keyHash,
      now,
    });

    if (!rateLimitResult.allowed) {
      return RATE_LIMITED;
    }

    const submission = await prisma.formSubmission.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject ?? null,
        message: parsed.data.message,
        locale: parsed.data.locale,
      },
      select: {id: true},
    });

    return {ok: true, id: submission.id};
  } catch {
    return UNAVAILABLE;
  }
}

export async function listFormSubmissions(
  prisma: FormDatabase,
  rawActor: unknown,
  rawInput: unknown,
  now = new Date(),
): Promise<AdminFormListResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const parsed = FORM_LIST_QUERY_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {page, pageSize, search, fromDate, toDate} = parsed.data;

  try {
    const where: Prisma.FormSubmissionWhereInput = {
      ...(search
        ? {OR: [
          {name: {contains: search, mode: "insensitive"}},
          {email: {contains: search, mode: "insensitive"}},
          {subject: {contains: search, mode: "insensitive"}},
        ]}
        : {}),
      ...(fromDate || toDate ? {createdAt: {
        ...(fromDate ? {gte: new Date(fromDate)} : {}),
        ...(toDate ? {lte: new Date(toDate)} : {}),
      }} : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.formSubmission.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.formSubmission.count({where}),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      locale: row.locale,
      createdAt: row.createdAt.toISOString(),
      isRead: false,
    }));

    return {
      ok: true,
      data: {items, page: pagesMetadata(page, pageSize, total)},
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function getFormSubmission(
  prisma: FormDatabase,
  rawActor: unknown,
  rawInput: {id: string},
  now = new Date(),
): Promise<AdminFormDetailResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  if (!CmsIdentifierSchema.safeParse(rawInput.id).success) return REQUEST_INVALID;

  try {
    const row = await prisma.formSubmission.findUnique({
      where: {id: rawInput.id},
    });

    if (!row) return NOT_FOUND;

    const submission = FORM_SUBMISSION_SCHEMA.parse({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      locale: row.locale,
      createdAt: row.createdAt.toISOString(),
      isRead: false,
    });

    return {ok: true, submission};
  } catch (error) {
    if (error instanceof z.ZodError) return {ok: false, code: "UNAVAILABLE"};
    return UNAVAILABLE;
  }
}

export async function exportFormCsv(
  prisma: FormDatabase,
  rawActor: unknown,
  now = new Date(),
): Promise<FormCsvResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  try {
    const rows = await prisma.formSubmission.findMany({
      orderBy: {createdAt: "desc"},
      take: 10_000,
    });

    const csvRows = rows.map((row) => ({
      name: sanitizeCsvCell(row.name),
      email: sanitizeCsvCell(row.email),
      subject: sanitizeCsvCell(row.subject),
      message: sanitizeCsvCell(row.message),
      locale: sanitizeCsvCell(row.locale),
      receivedAt: sanitizeCsvCell(row.createdAt.toISOString()),
    }));

    const date = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      filename: `fuspi-form-submissions-${date}.csv`,
      rows: csvRows,
    };
  } catch {
    return UNAVAILABLE;
  }
}

const SUBSCRIBER_LIST_QUERY_SCHEMA = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  locale: LocaleSchema.optional(),
  search: z.string().trim().max(120).default(""),
}).strict();

export async function listSubscribers(
  prisma: FormDatabase,
  rawActor: unknown,
  rawInput: unknown,
  now = new Date(),
): Promise<AdminSubscriberListResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const parsed = SUBSCRIBER_LIST_QUERY_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {page, pageSize, active, locale, search} = parsed.data;

  try {
    const where: Prisma.SubscriberWhereInput = {
      ...(active !== "ALL" ? {isActive: active === "ACTIVE"} : {}),
      ...(locale ? {locale} : {}),
      ...(search ? {email: {contains: search, mode: "insensitive"}} : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.subscriber.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          locale: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.subscriber.count({where}),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      email: row.email,
      locale: row.locale,
      isActive: row.isActive,
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

export async function exportSubscribersCsv(
  prisma: FormDatabase,
  rawActor: unknown,
  rawInput: unknown,
  now = new Date(),
): Promise<SubscriberCsvResult> {
  if (!actorOrNull(rawActor, now)) return SESSION_INVALID;

  const parsed = SUBSCRIBER_LIST_QUERY_SCHEMA.safeParse(rawInput);
  if (!parsed.success) return REQUEST_INVALID;

  const {active, locale, search} = parsed.data;

  try {
    const where: Prisma.SubscriberWhereInput = {
      ...(active !== "ALL" ? {isActive: active === "ACTIVE"} : {}),
      ...(locale ? {locale} : {}),
      ...(search ? {email: {contains: search, mode: "insensitive"}} : {}),
    };

    const rows = await prisma.subscriber.findMany({
      where,
      orderBy: {createdAt: "desc"},
      take: 10_000,
      select: {
        email: true,
        locale: true,
        isActive: true,
        createdAt: true,
      },
    });

    const csvRows = rows.map((row) => ({
      email: sanitizeCsvCell(row.email),
      locale: sanitizeCsvCell(row.locale),
      isActive: sanitizeCsvCell(row.isActive ? "Yes" : "No"),
      subscribedAt: sanitizeCsvCell(row.createdAt.toISOString()),
    }));

    const date = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      filename: `fuspi-subscribers-${date}.csv`,
      rows: csvRows,
    };
  } catch {
    return UNAVAILABLE;
  }
}

export function formHttpStatus(result: {ok: boolean; code?: string}): number {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "REQUEST_INVALID") return 400;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "RATE_LIMITED") return 429;
  return 503;
}
