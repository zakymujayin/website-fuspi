import {randomUUID} from "node:crypto";
import {z} from "zod";

import {Sha256ChecksumSchema, StorageClassSchema} from "@/contracts/storage";
import {
  ComplaintCategory,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createTrackingTokenDigest, generateTrackingToken, verifyTrackingTokenDigest} from "@/lib/security/tracking-token";
import {createHmacDigest} from "@/lib/security/hmac";
import {sealPpksTicketField} from "@/lib/tickets/protected-fields";

export type TicketWorkflowDatabase = ReturnType<typeof createPrismaClient>;

const PPKS_CATEGORY = "PELECEHAN_SEKSUAL" as const;
const NON_PPKS_CATEGORIES = Object.values(ComplaintCategory).filter(
  (c): c is ComplaintCategory => c !== PPKS_CATEGORY,
) as unknown as [ComplaintCategory, ...ComplaintCategory[]];
function GENERAL_CATEGORY_FILTER(): {notIn: ComplaintCategory[]} { return {notIn: [PPKS_CATEGORY]}; }

const STAFF_ROLES = ["ADMIN", "PETUGAS"] as const;
const TICKET_NUMBER_PATTERN = /^FUSPI-\d{4}-\d{4,}$/u;
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PUBLIC_TICKET_RATE_WINDOW_MS = 3_600_000;
const PUBLIC_TICKET_RATE_MAX = 10;

// ── Schemas ──────────────────────────────────────────────────────────────

const PublicTicketInputSchema = z.object({
  category: z.enum(NON_PPKS_CATEGORIES),
  subject: z.string().trim().min(2).max(500),
  description: z.string().trim().min(10).max(100_000),
}).strict();

/* PPKS intake is deliberately separate from `PublicTicketInputSchema`, which
   excludes the PPKS category. Identity is optional: a reporter must be able to
   file anonymously, and an empty field is a choice rather than a missing value. */
const PpksReportInputSchema = z.object({
  subject: z.string().trim().min(2).max(500).nullable().optional(),
  description: z.string().trim().min(10).max(100_000),
  reporterIdentity: z.string().trim().min(1).max(2_000).nullable().optional(),
  /* `docs/14` D2: a report may come from a witness or a third party, not only
     from the person harmed. The distinction is stored with the identity text so
     it stays inside the encrypted envelope rather than becoming queryable
     metadata about who reported what. */
  reporterRole: z.enum(["KORBAN", "SAKSI", "PIHAK_KETIGA"]).nullable().optional(),
  /* `docs/14` D2: an immediate safety threat escalates to URGENT automatically,
     without waiting for triage. */
  immediateDanger: z.boolean().optional(),
}).strict();

const PPKS_REPORTER_ROLE_LABEL = {
  KORBAN: "Korban langsung",
  SAKSI: "Saksi",
  PIHAK_KETIGA: "Pihak ketiga",
} as const;

const PublicReplyInputSchema = z.object({
  ticketNumber: z.string().regex(TICKET_NUMBER_PATTERN),
  token: z.string().regex(TRACKING_TOKEN_PATTERN),
  body: z.string().trim().min(1).max(100_000),
}).strict();

const PublicTicketLookupSchema = z.object({
  ticketNumber: z.string().regex(TICKET_NUMBER_PATTERN),
  token: z.string().regex(TRACKING_TOKEN_PATTERN),
}).strict();

const StaffTicketListQuerySchema = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  status: z.enum(TicketStatus).optional(),
  category: z.enum(ComplaintCategory).optional(),
  priority: z.enum(TicketPriority).optional(),
  assigneeId: z.string().trim().min(1).max(191).optional(),
  search: z.string().trim().max(64).optional(),
}).strict();

const StaffCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ASSIGN"),
    ticketId: z.string().min(1).max(191),
    assigneeId: z.string().min(1).max(191),
    reason: z.string().trim().max(500).nullable().default(null),
  }).strict(),
  z.object({
    action: z.literal("UPDATE_STATUS"),
    ticketId: z.string().min(1).max(191),
    status: z.enum(TicketStatus),
    reason: z.string().trim().max(500).nullable().default(null),
  }).strict(),
  z.object({
    action: z.literal("UPDATE_PRIORITY"),
    ticketId: z.string().min(1).max(191),
    priority: z.enum(TicketPriority),
    reason: z.string().trim().max(500).nullable().default(null),
  }).strict(),
  z.object({
    action: z.literal("REPLY"),
    ticketId: z.string().min(1).max(191),
    body: z.string().trim().min(1).max(100_000),
  }).strict(),
  z.object({
    action: z.literal("CLOSE"),
    ticketId: z.string().min(1).max(191),
    resolution: z.string().trim().min(1).max(100_000),
  }).strict(),
  z.object({
    action: z.literal("EXPORT"),
    ticketId: z.string().min(1).max(191),
  }).strict(),
]);

const AttachmentInputSchema = z.object({
  storageKey: z.string().min(1).max(191),
  storageClass: StorageClassSchema,
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(191),
  size: z.number().int().min(1).max(5_242_880),
  checksumSha256: Sha256ChecksumSchema,
}).strict();

// ── Result types ──────────────────────────────────────────────────────────

type PublicTicketResult =
  | {ok: true; data: {ticketNumber: string; trackingToken: string}}
  | {ok: false; code: "RATE_LIMITED" | "REQUEST_INVALID" | "UNAVAILABLE" | "NOT_FOUND" | "SESSION_INVALID" | "VALIDATION_FAILED"};

type PublicTicketView = {
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  replies: Array<{id: string; body: string; createdAt: Date}>;
  createdAt: Date;
  updatedAt: Date;
};

type PublicTicketViewResult =
  | {ok: true; data: PublicTicketView}
  | {ok: false; code: "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED" | "SESSION_INVALID" | "VALIDATION_FAILED"};

type StaffTicketSummary = {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  assigneeId: string | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StaffTicketDetail = StaffTicketSummary & {
  subject: string | null;
  description: string;
  reporterIdentity: null;
  resolution: string | null;
  replies: Array<{
    id: string;
    authorId: string | null;
    body: string;
    createdAt: Date;
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }>;
};

type StaffListResult =
  | {ok: true; data: {items: StaffTicketSummary[]; page: number; pageSize: number; total: number}}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE" | "RATE_LIMITED" | "NOT_FOUND" | "VALIDATION_FAILED"};

type StaffDetailResult =
  | {ok: true; data: StaffTicketDetail}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED" | "VALIDATION_FAILED"};

type StaffCommandResult =
  | {ok: true; data: StaffTicketDetail}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED" | "VALIDATION_FAILED"};

type AttachmentResult =
  | {ok: true; data: {id: string}}
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED" | "VALIDATION_FAILED"};

// ── Helpers ───────────────────────────────────────────────────────────────

function isPrismaCode(error: unknown, code: string) {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === code;
}

function failure(code: "RATE_LIMITED" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "SESSION_INVALID" | "VALIDATION_FAILED") {
  return {ok: false as const, code};
}

// GENERAL_CATEGORY_FILTER moved to top of file

function validateStaffActor(rawActor: unknown, now: Date):
  | {ok: true; userId: string; role: "ADMIN" | "PETUGAS"}
  | {ok: false; code: "SESSION_INVALID"} {
  const parsed = z.object({
    userId: z.string().min(1).max(191),
    role: z.enum(STAFF_ROLES),
    isActive: z.literal(true),
    mustChangePassword: z.literal(false),
    expiresAt: z.date(),
  }).safeParse(rawActor);
  if (!parsed.success || parsed.data.expiresAt <= now) {
    return {ok: false, code: "SESSION_INVALID"};
  }
  return {ok: true, userId: parsed.data.userId, role: parsed.data.role};
}

/* Delegates to the shared verifier. The local reimplementation reached for
   `createTrackingTokenDigest`, which parses the token with `.parse` and therefore
   throws on a well-formed but non-canonical base64url token. That exception was
   caught upstream and reported as UNAVAILABLE, so a simply wrong tracking code
   answered "service unavailable" instead of "not found", and the public API
   returned 503 rather than 404. */
function verifyTrackingToken(ticketNumber: string, token: string, storedHash: string | undefined, trackingHmacSecret: string): boolean {
  if (!storedHash) return false;
  return verifyTrackingTokenDigest(token, storedHash, trackingHmacSecret, "TICKET");
}

async function nextAnnualTicketNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = now.getUTCFullYear();
  const row = await tx.annualSequence.upsert({
    where: {kind_year: {kind: "TICKET", year}},
    create: {kind: "TICKET", year, value: 1},
    update: {value: {increment: 1}},
    select: {value: true},
  });
  return `FUSPI-${year}-${String(row.value).padStart(4, "0")}`;
}

async function checkPublicRateLimit(
  tx: Prisma.TransactionClient,
  clientIp: string,
  ipHmacSecret: string,
  now: Date,
): Promise<boolean> {
  const keyHash = createHmacDigest(`public-ticket:${clientIp}`, ipHmacSecret);
  const windowStart = new Date(Math.floor(now.getTime() / PUBLIC_TICKET_RATE_WINDOW_MS) * PUBLIC_TICKET_RATE_WINDOW_MS);
  const bucket = await tx.rateLimitBucket.findUnique({
    where: {
      keyHash_scope_windowStart: {
        keyHash,
        scope: "PUBLIC_TICKET",
        windowStart,
      },
    },
    select: {count: true},
  });
  return (bucket?.count ?? 0) >= PUBLIC_TICKET_RATE_MAX;
}

async function incrementPublicRateLimit(
  tx: Prisma.TransactionClient,
  clientIp: string,
  ipHmacSecret: string,
  now: Date,
): Promise<void> {
  const keyHash = createHmacDigest(`public-ticket:${clientIp}`, ipHmacSecret);
  const windowStart = new Date(Math.floor(now.getTime() / PUBLIC_TICKET_RATE_WINDOW_MS) * PUBLIC_TICKET_RATE_WINDOW_MS);
  await tx.rateLimitBucket.upsert({
    where: {
      keyHash_scope_windowStart: {keyHash, scope: "PUBLIC_TICKET", windowStart},
    },
    create: {keyHash, scope: "PUBLIC_TICKET", windowStart, count: 1},
    update: {count: {increment: 1}},
  });
}

const STAFF_TICKET_DETAIL_SELECT = {
  id: true,
  ticketNumber: true,
  category: true,
  priority: true,
  status: true,
  assigneeId: true,
  responseDueAt: true,
  resolutionDueAt: true,
  subjectCiphertext: true,
  descriptionCiphertext: true,
  reporterIdentityCiphertext: true,
  resolutionCiphertext: true,
  createdAt: true,
  updatedAt: true,
} as const;

const STAFF_TICKET_SUMMARY_SELECT = {
  id: true,
  ticketNumber: true,
  category: true,
  priority: true,
  status: true,
  assigneeId: true,
  responseDueAt: true,
  resolutionDueAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function projectSummary(row: Prisma.TicketGetPayload<{select: typeof STAFF_TICKET_SUMMARY_SELECT}>): StaffTicketSummary {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assigneeId,
    responseDueAt: row.responseDueAt,
    resolutionDueAt: row.resolutionDueAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type StaffDetailRow = Prisma.TicketGetPayload<{select: typeof STAFF_TICKET_DETAIL_SELECT}> & {
  replies: Array<{id: string; authorId: string | null; bodyCiphertext: string; createdAt: Date}>;
  attachments: Array<{id: string; originalName: string; mimeType: string; size: number; createdAt: Date}>;
};

function projectDetail(row: StaffDetailRow): StaffTicketDetail {
  return {
    ...projectSummary(row),
    subject: row.subjectCiphertext,
    description: row.descriptionCiphertext,
    reporterIdentity: null,
    resolution: row.resolutionCiphertext,
    replies: row.replies.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      body: r.bodyCiphertext,
      createdAt: r.createdAt,
    })),
    attachments: row.attachments,
  };
}

// ── Public Domain Functions ───────────────────────────────────────────────

export async function submitPublicTicket(
  prisma: TicketWorkflowDatabase,
  rawInput: unknown,
  clientIp: string,
  ipHmacSecret: string,
  trackingHmacSecret: string,
  now = new Date(),
): Promise<PublicTicketResult> {
  const parsed = PublicTicketInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("REQUEST_INVALID");

  try {
    return await prisma.$transaction(async (tx) => {
      const limited = await checkPublicRateLimit(tx, clientIp, ipHmacSecret, now);
      if (limited) return failure("RATE_LIMITED");

      const ticketNumber = await nextAnnualTicketNumber(tx, now);
      const trackingToken = generateTrackingToken();
      const trackingTokenHash = createTrackingTokenDigest(trackingToken, trackingHmacSecret, "TICKET");

      await tx.ticket.create({
        data: {
          ticketNumber,
          trackingTokenHash,
          category: parsed.data.category,
          subjectCiphertext: parsed.data.subject,
          descriptionCiphertext: parsed.data.description,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: (await tx.ticket.findUniqueOrThrow({where: {ticketNumber}, select: {id: true}})).id,
          event: "CREATED",
        },
      });

      await incrementPublicRateLimit(tx, clientIp, ipHmacSecret, now);
      return {ok: true as const, data: {ticketNumber, trackingToken}};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch {
    return failure("UNAVAILABLE");
  }
}

/**
 * Files a PPKS report. Content is sealed field by field before anything touches
 * the database, so a misconfigured key fails the request instead of storing
 * plaintext or consuming a ticket number.
 *
 * The row is written with the PPKS category, which every general-purpose query
 * in this module and in `query-isolation.ts` filters out. Only SATGAS_PPKS can
 * reach it, and only through the audited detail path.
 */
export async function submitPpksReport(
  prisma: TicketWorkflowDatabase,
  rawInput: unknown,
  clientIp: string,
  ipHmacSecret: string,
  trackingHmacSecret: string,
  sealingKey: Readonly<{key: Uint8Array; keyVersion: number}>,
  now = new Date(),
): Promise<PublicTicketResult> {
  const parsed = PpksReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return failure("REQUEST_INVALID");

  /* The id is minted here because each envelope is bound to it, which stops
     ciphertext from being lifted onto another ticket. */
  const ticketId = randomUUID();
  const trackingToken = generateTrackingToken();

  let subjectCiphertext: string | null;
  let descriptionCiphertext: string;
  let reporterIdentityCiphertext: string | null;
  try {
    subjectCiphertext = parsed.data.subject
      ? sealPpksTicketField(parsed.data.subject, ticketId, "subject", sealingKey)
      : null;
    descriptionCiphertext = sealPpksTicketField(
      parsed.data.description, ticketId, "description", sealingKey,
    );
    const identityParts = [
      parsed.data.reporterRole ? PPKS_REPORTER_ROLE_LABEL[parsed.data.reporterRole] : null,
      parsed.data.reporterIdentity,
    ].filter((part): part is string => Boolean(part));
    reporterIdentityCiphertext = identityParts.length > 0
      ? sealPpksTicketField(identityParts.join("\n"), ticketId, "reporterIdentity", sealingKey)
      : null;
  } catch {
    /* Never surface why sealing failed: the reason is configuration, and the
       reporter can do nothing with it. */
    return failure("UNAVAILABLE");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const limited = await checkPublicRateLimit(tx, clientIp, ipHmacSecret, now);
      if (limited) return failure("RATE_LIMITED");

      const ticketNumber = await nextAnnualTicketNumber(tx, now);
      const trackingTokenHash = createTrackingTokenDigest(trackingToken, trackingHmacSecret, "TICKET");

      await tx.ticket.create({
        data: {
          id: ticketId,
          ticketNumber,
          trackingTokenHash,
          category: PPKS_CATEGORY,
          /* `docs/14` A: PPKS is at least TINGGI, and an immediate safety
             threat goes straight to URGENT. Satgas may adjust after triage. */
          priority: parsed.data.immediateDanger ? "URGENT" : "TINGGI",
          subjectCiphertext,
          descriptionCiphertext,
          reporterIdentityCiphertext,
          keyVersion: sealingKey.keyVersion,
        },
      });

      await tx.ticketHistory.create({data: {ticketId, event: "CREATED"}});
      await incrementPublicRateLimit(tx, clientIp, ipHmacSecret, now);
      return {ok: true as const, data: {ticketNumber, trackingToken}};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch {
    return failure("UNAVAILABLE");
  }
}

export async function getPublicTicket(
  prisma: TicketWorkflowDatabase,
  ticketNumber: string,
  token: string,
  trackingHmacSecret: string,
): Promise<PublicTicketViewResult> {
  const parsed = PublicTicketLookupSchema.safeParse({ticketNumber, token});
  if (!parsed.success) return failure("REQUEST_INVALID");

  try {
    const row = await prisma.ticket.findFirst({
      where: {
        ticketNumber,
        category: GENERAL_CATEGORY_FILTER(),
      },
      select: {
        ticketNumber: true,
        category: true,
        priority: true,
        status: true,
        subjectCiphertext: true,
        descriptionCiphertext: true,
        resolutionCiphertext: true,
        trackingTokenHash: true,
        createdAt: true,
        updatedAt: true,
        replies: {
          select: {id: true, bodyCiphertext: true, createdAt: true},
          orderBy: {createdAt: "asc"},
        },
      },
    });

    if (!row || !verifyTrackingToken(ticketNumber, token, row.trackingTokenHash, trackingHmacSecret)) {
      return failure("NOT_FOUND");
    }

    return {
      ok: true,
      data: {
        ticketNumber: row.ticketNumber,
        category: row.category,
        priority: row.priority,
        status: row.status,
        subject: row.subjectCiphertext ?? "",
        description: row.descriptionCiphertext,
        resolution: row.resolutionCiphertext,
        replies: row.replies.map((r) => ({
          id: r.id,
          body: r.bodyCiphertext,
          createdAt: r.createdAt,
        })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch {
    return failure("UNAVAILABLE");
  }
}

export async function addPublicReply(
  prisma: TicketWorkflowDatabase,
  ticketNumber: string,
  token: string,
  body: string,
  trackingHmacSecret: string,
): Promise<PublicTicketViewResult> {
  const parsed = PublicReplyInputSchema.safeParse({ticketNumber, token, body});
  if (!parsed.success) return failure("REQUEST_INVALID");

  try {
    return await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {
          ticketNumber,
          category: GENERAL_CATEGORY_FILTER(),
        },
        select: {id: true, trackingTokenHash: true, status: true},
      });

      if (!ticket || !verifyTrackingToken(ticketNumber, token, ticket.trackingTokenHash, trackingHmacSecret)) {
        return failure("NOT_FOUND");
      }

      if (ticket.status === "SELESAI" || ticket.status === "DITOLAK") {
        return failure("NOT_FOUND");
      }

      const replyId = randomUUID();
      await tx.ticketReply.create({
        data: {
          id: replyId,
          ticketId: ticket.id,
          bodyCiphertext: parsed.data.body,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          event: "REPLIED",
        },
      });

      // Re-fetch to return updated state
      const updated = await tx.ticket.findUniqueOrThrow({
        where: {id: ticket.id},
        select: {
          ticketNumber: true,
          category: true,
          priority: true,
          status: true,
          subjectCiphertext: true,
          descriptionCiphertext: true,
          resolutionCiphertext: true,
          trackingTokenHash: true,
          createdAt: true,
          updatedAt: true,
          replies: {
            select: {id: true, bodyCiphertext: true, createdAt: true},
            orderBy: {createdAt: "asc"},
          },
        },
      });

      return {
        ok: true as const,
        data: {
          ticketNumber: updated.ticketNumber,
          category: updated.category,
          priority: updated.priority,
          status: updated.status,
          subject: updated.subjectCiphertext ?? "",
          description: updated.descriptionCiphertext,
          resolution: updated.resolutionCiphertext,
          replies: updated.replies.map((r) => ({
            id: r.id,
            body: r.bodyCiphertext,
            createdAt: r.createdAt,
          })),
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    });
  } catch {
    return failure("UNAVAILABLE");
  }
}

// ── Staff Domain Functions ────────────────────────────────────────────────

export async function listStaffTickets(
  prisma: TicketWorkflowDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
): Promise<StaffListResult> {
  const actor = validateStaffActor(rawActor, now);
  if (!actor.ok) return failure("SESSION_INVALID");

  const parsed = StaffTicketListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return failure("REQUEST_INVALID");

  const query = parsed.data;
  const where: Prisma.TicketWhereInput = {
    category: GENERAL_CATEGORY_FILTER(),
    ...(query.status ? {status: query.status} : {}),
    ...(query.category ? {category: query.category} : {}),
    ...(query.priority ? {priority: query.priority} : {}),
    ...(query.assigneeId ? {assigneeId: query.assigneeId} : {}),
    ...(query.search ? {
      ticketNumber: {contains: query.search, mode: "insensitive"},
    } : {}),
  };

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        select: STAFF_TICKET_SUMMARY_SELECT,
        orderBy: [{createdAt: "desc"}, {id: "desc"}],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.ticket.count({where}),
    ]);

    return {
      ok: true,
      data: {
        items: rows.map(projectSummary),
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  } catch {
    return failure("UNAVAILABLE");
  }
}

export async function getStaffTicket(
  prisma: TicketWorkflowDatabase,
  rawActor: unknown,
  ticketId: string,
  now = new Date(),
): Promise<StaffDetailResult> {
  const actor = validateStaffActor(rawActor, now);
  if (!actor.ok) return failure("SESSION_INVALID");

  if (!z.string().min(1).max(191).safeParse(ticketId).success) {
    return failure("REQUEST_INVALID");
  }

  try {
    const row = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        category: GENERAL_CATEGORY_FILTER(),
      },
      select: {
        ...STAFF_TICKET_DETAIL_SELECT,
        replies: {
          select: {id: true, authorId: true, bodyCiphertext: true, createdAt: true},
          orderBy: {createdAt: "asc"},
        },
        attachments: {
          select: {id: true, originalName: true, mimeType: true, size: true, createdAt: true},
          orderBy: {createdAt: "asc"},
        },
      },
    });

    if (!row) return failure("NOT_FOUND");

    return {
      ok: true,
      data: projectDetail(row as StaffDetailRow),
    };
  } catch {
    return failure("UNAVAILABLE");
  }
}

export async function executeStaffCommand(
  prisma: TicketWorkflowDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<StaffCommandResult> {
  const actor = validateStaffActor(rawActor, now);
  if (!actor.ok) return failure("SESSION_INVALID");

  const parsed = StaffCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return failure("REQUEST_INVALID");

  const command = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {id: command.ticketId, category: GENERAL_CATEGORY_FILTER()},
        select: {
          id: true,
          status: true,
          priority: true,
          assigneeId: true,
          firstRespondedAt: true,
          closedAt: true,
          category: true,
        },
      });

      if (!ticket) return failure("NOT_FOUND");

      switch (command.action) {
        case "ASSIGN": {
          if (!command.assigneeId) return failure("VALIDATION_FAILED");
          const newStatus = ticket.status === "BARU" ? "DIVERIFIKASI" : ticket.status;
          await tx.ticket.update({
            where: {id: ticket.id},
            data: {
              assigneeId: command.assigneeId,
              status: newStatus,
              firstRespondedAt: ticket.firstRespondedAt ?? now,
              responseDueAt: ticket.firstRespondedAt ? undefined : new Date(now.getTime() + 48 * 3_600_000),
            },
          });
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.userId,
              event: "ASSIGNED",
              fromStatus: ticket.status,
              toStatus: newStatus,
              reason: command.reason,
            },
          });
          if (newStatus !== ticket.status) {
            await tx.ticketHistory.create({
              data: {
                ticketId: ticket.id,
                actorId: actor.userId,
                event: "STATUS_CHANGED",
                fromStatus: ticket.status,
                toStatus: newStatus,
                reason: `Auto-verifikasi saat penugasan`,
              },
            });
          }
          break;
        }
        case "UPDATE_STATUS": {
          if (command.status === ticket.status) break;
          const closedStatuses: string[] = ["SELESAI", "DITOLAK"];
          await tx.ticket.update({
            where: {id: ticket.id},
            data: {
              status: command.status,
              closedAt: closedStatuses.includes(command.status) ? now : undefined,
              firstRespondedAt: ticket.firstRespondedAt ?? now,
            },
          });
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.userId,
              event: "STATUS_CHANGED",
              fromStatus: ticket.status,
              toStatus: command.status,
              reason: command.reason,
            },
          });
          break;
        }
        case "UPDATE_PRIORITY": {
          if (command.priority === ticket.priority) break;
          await tx.ticket.update({
            where: {id: ticket.id},
            data: {priority: command.priority},
          });
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.userId,
              event: "PRIORITY_CHANGED",
              fromPriority: ticket.priority,
              toPriority: command.priority,
              reason: command.reason,
            },
          });
          break;
        }
        case "REPLY": {
          await tx.ticketReply.create({
            data: {
              ticketId: ticket.id,
              authorId: actor.userId,
              bodyCiphertext: command.body,
            },
          });
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.userId,
              event: "REPLIED",
            },
          });
          if (!ticket.firstRespondedAt) {
            await tx.ticket.update({
              where: {id: ticket.id},
              data: {
                firstRespondedAt: now,
                responseDueAt: new Date(now.getTime() + 48 * 3_600_000),
                status: ticket.status === "BARU" ? "DIVERIFIKASI" : undefined,
              },
            });
            if (ticket.status === "BARU") {
              await tx.ticketHistory.create({
                data: {
                  ticketId: ticket.id,
                  actorId: actor.userId,
                  event: "STATUS_CHANGED",
                  fromStatus: "BARU",
                  toStatus: "DIVERIFIKASI",
                  reason: "Auto-verifikasi saat balasan pertama",
                },
              });
            }
          }
          break;
        }
        case "CLOSE": {
          await tx.ticket.update({
            where: {id: ticket.id},
            data: {
              status: "SELESAI",
              resolutionCiphertext: command.resolution,
              closedAt: now,
            },
          });
          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: actor.userId,
              event: "CLOSED",
              fromStatus: ticket.status,
              toStatus: "SELESAI",
              reason: "Tiket ditutup dengan resolusi",
            },
          });
          break;
        }
        case "EXPORT": {
          break;
        }
      }

      const updated = await tx.ticket.findUniqueOrThrow({
        where: {id: ticket.id},
        select: {
          ...STAFF_TICKET_DETAIL_SELECT,
          replies: {
            select: {id: true, authorId: true, bodyCiphertext: true, createdAt: true},
            orderBy: {createdAt: "asc"},
          },
          attachments: {
            select: {id: true, originalName: true, mimeType: true, size: true, createdAt: true},
            orderBy: {createdAt: "asc"},
          },
        },
      });

      return {
        ok: true as const,
        data: projectDetail(updated as StaffDetailRow),
      };
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2003")) return failure("NOT_FOUND");
    return failure("UNAVAILABLE");
  }
}

export async function addAttachment(
  prisma: TicketWorkflowDatabase,
  rawActor: unknown,
  ticketId: string,
  fileData: unknown,
  now = new Date(),
): Promise<AttachmentResult> {
  const actor = validateStaffActor(rawActor, now);
  if (!actor.ok) return failure("SESSION_INVALID");

  if (!z.string().min(1).max(191).safeParse(ticketId).success) {
    return failure("REQUEST_INVALID");
  }

  const parsed = AttachmentInputSchema.safeParse(fileData);
  if (!parsed.success) return failure("REQUEST_INVALID");

  try {
    return await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {id: ticketId, category: GENERAL_CATEGORY_FILTER()},
        select: {id: true},
      });

      if (!ticket) return failure("NOT_FOUND");

      if (parsed.data.storageClass === "PPKS_PRIVATE") {
        return failure("REQUEST_INVALID");
      }

      const attachmentId = randomUUID();
      await tx.ticketAttachment.create({
        data: {
          id: attachmentId,
          ticketId: ticket.id,
          storageKey: parsed.data.storageKey,
          storageClass: parsed.data.storageClass,
          originalName: parsed.data.originalName,
          mimeType: parsed.data.mimeType,
          size: parsed.data.size,
          checksumSha256: parsed.data.checksumSha256,
        },
      });

      return {ok: true as const, data: {id: attachmentId}};
    });
  } catch {
    return failure("UNAVAILABLE");
  }
}

// ── HTTP status helper ────────────────────────────────────────────────────

export function ticketWorkflowHttpStatus(result: {ok: boolean; code?: string}): number {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "RATE_LIMITED") return 429;
  if (result.code === "VALIDATION_FAILED") return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
