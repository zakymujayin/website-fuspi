import {randomUUID} from "node:crypto";

import type {Prisma} from "@/generated/prisma/client";

import {
  GeneralTicketDetailSchema,
  PpksAggregateResultSchema,
  PpksTicketDetailSchema,
  TicketCollectionQuerySchema,
  TicketCountResultSchema,
  TicketDetailResultSchema,
  TicketExportQuerySchema,
  TicketExportResultSchema,
  TicketIdQuerySchema,
  TicketListResultSchema,
  TicketQuerySessionSchema,
  TicketSearchQuerySchema,
  TicketSummarySchema,
  TicketTrackingProbeSchema,
  TicketTrackingResultSchema,
  type GeneralTicketDetail,
  type PpksAggregateResult,
  type PpksTicketDetail,
  type TicketCountResult,
  type TicketDetailResult,
  type TicketExportResult,
  type TicketListResult,
  type TicketQuerySession,
  type TicketSummary,
  type TicketTrackingResult,
} from "@/contracts/ticket";
import {authorize} from "@/lib/auth/runtime/authorization";
import {createPrismaClient} from "@/lib/db/client";
import type {EncryptionKeyResolver} from "@/lib/security/encryption";
import {verifyTrackingTokenDigest} from "@/lib/security/tracking-token";
import {
  openPpksReplyBody,
  openPpksTicketField,
} from "@/lib/tickets/protected-fields";

export type TicketQueryDatabase = ReturnType<typeof createPrismaClient>;

type TicketQueryScope = "GENERAL" | "PPKS";
type ActiveActor = Extract<TicketQuerySession, {ok: true}>["session"];

const SYSTEM_CLOCK = () => new Date();
const PPKS_CATEGORY = "PELECEHAN_SEKSUAL" as const;
const GENERAL_CATEGORY_FILTER = {not: PPKS_CATEGORY} as const;

const SUMMARY_SELECT = {
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

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  subjectCiphertext: true,
  descriptionCiphertext: true,
  reporterIdentityCiphertext: true,
  resolutionCiphertext: true,
} as const;

const PPKS_DETAIL_SELECT = {
  ...DETAIL_SELECT,
  replies: {
    select: {
      id: true,
      authorId: true,
      bodyCiphertext: true,
      createdAt: true,
    },
    orderBy: {createdAt: "asc" as const},
  },
  attachments: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: {createdAt: "asc" as const},
  },
} as const;

type GeneralDetailRow = Prisma.TicketGetPayload<{select: typeof DETAIL_SELECT}>;
type PpksDetailRow = Prisma.TicketGetPayload<{select: typeof PPKS_DETAIL_SELECT}>;

function failure(
  code: "INVALID_REQUEST" | "NOT_FOUND" | "UNAVAILABLE",
) {
  return {ok: false as const, code};
}

function activeActor(
  rawSession: unknown,
  now: Date,
): ActiveActor | null {
  const parsed = TicketQuerySessionSchema.safeParse(rawSession);
  if (
    !parsed.success
    || !parsed.data.ok
    || parsed.data.session.expiresAt <= now
    || parsed.data.session.mustChangePassword
  ) return null;
  return parsed.data.session;
}

function queryScope(actor: ActiveActor): TicketQueryScope | null {
  const ppks = authorize(
    {actor, ticketScope: "PPKS_DETAIL"},
    "VIEW",
    "PPKS_TICKET",
  );
  if (ppks.allowed) return "PPKS";

  const general = authorize(
    {actor, ticketScope: "NON_PPKS"},
    "VIEW",
    "TICKET",
  );
  return general.allowed ? "GENERAL" : null;
}

function ticketWhere(
  scope: TicketQueryScope,
  filters: Readonly<{
    priority?: "RENDAH" | "SEDANG" | "TINGGI" | "URGENT";
    status?: "BARU" | "DIVERIFIKASI" | "DIPROSES" | "MENUNGGU_PELAPOR" | "SELESAI" | "DITOLAK";
    assigneeId?: string;
  }>,
): Prisma.TicketWhereInput {
  return {
    category: scope === "PPKS" ? PPKS_CATEGORY : GENERAL_CATEGORY_FILTER,
    ...(filters.priority ? {priority: filters.priority} : {}),
    ...(filters.status ? {status: filters.status} : {}),
    ...(filters.assigneeId ? {assigneeId: filters.assigneeId} : {}),
  };
}

function projectSummary(row: Prisma.TicketGetPayload<{select: typeof SUMMARY_SELECT}>): TicketSummary {
  return TicketSummarySchema.parse({
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
  });
}

function projectGeneralDetail(row: GeneralDetailRow): GeneralTicketDetail {
  return GeneralTicketDetailSchema.parse({
    ...projectSummary(row),
    subject: row.subjectCiphertext,
    description: row.descriptionCiphertext,
    reporterIdentity: row.reporterIdentityCiphertext,
    resolution: row.resolutionCiphertext,
  });
}

function decryptOptionalTicketField(
  stored: string | null,
  ticketId: string,
  field: "subject" | "reporterIdentity" | "resolution",
  resolveKey: EncryptionKeyResolver,
) {
  return stored === null
    ? null
    : openPpksTicketField(stored, ticketId, field, resolveKey);
}

function projectPpksDetail(
  row: PpksDetailRow,
  resolveKey: EncryptionKeyResolver,
): PpksTicketDetail {
  return PpksTicketDetailSchema.parse({
    ...projectSummary(row),
    subject: decryptOptionalTicketField(
      row.subjectCiphertext,
      row.id,
      "subject",
      resolveKey,
    ),
    description: openPpksTicketField(
      row.descriptionCiphertext,
      row.id,
      "description",
      resolveKey,
    ),
    reporterIdentity: decryptOptionalTicketField(
      row.reporterIdentityCiphertext,
      row.id,
      "reporterIdentity",
      resolveKey,
    ),
    resolution: decryptOptionalTicketField(
      row.resolutionCiphertext,
      row.id,
      "resolution",
      resolveKey,
    ),
    replies: row.replies.map((reply) => ({
      id: reply.id,
      authorId: reply.authorId,
      body: openPpksReplyBody(reply.bodyCiphertext, reply.id, resolveKey),
      createdAt: reply.createdAt,
    })),
    attachments: row.attachments,
  });
}

async function auditAllowedPpksAccess(
  tx: Prisma.TransactionClient,
  ticketIds: readonly string[],
  userId: string,
  action: "VIEW" | "EXPORT",
) {
  if (ticketIds.length === 0) return;
  await tx.ticketAccessLog.createMany({
    data: ticketIds.map((ticketId) => ({
      ticketId,
      userId,
      action,
      allowed: true,
    })),
  });
}

async function auditDeniedPpksDetailAttempt(
  database: TicketQueryDatabase,
  ticketId: string,
  userId: string,
) {
  await database.$executeRaw`
    INSERT INTO "TicketAccessLog"
      ("id", "ticketId", "userId", "action", "allowed", "reasonCode", "createdAt")
    SELECT
      ${randomUUID()},
      "id",
      ${userId},
      'VIEW'::"TicketAccessAction",
      false,
      'ACCESS_DENIED',
      CURRENT_TIMESTAMP
    FROM "Ticket"
    WHERE "id" = ${ticketId}
      AND "category" = 'PELECEHAN_SEKSUAL'::"ComplaintCategory"
  `;
}

async function readSummaries(
  database: TicketQueryDatabase,
  actor: ActiveActor,
  scope: TicketQueryScope,
  where: Prisma.TicketWhereInput,
  page: number,
  pageSize: number,
) {
  const query = {
    where,
    select: SUMMARY_SELECT,
    orderBy: [{createdAt: "desc" as const}, {id: "desc" as const}],
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
  if (scope === "GENERAL") {
    return database.ticket.findMany(query);
  }
  return database.$transaction(async (tx) => {
    const rows = await tx.ticket.findMany(query);
    await auditAllowedPpksAccess(
      tx,
      rows.map(({id}) => id),
      actor.userId,
      "VIEW",
    );
    return rows;
  });
}

export function createTicketQueryBoundary(options: Readonly<{
  database: TicketQueryDatabase;
  resolveKey: EncryptionKeyResolver;
  trackingHmacSecret: string;
  clock?: () => Date;
}>) {
  const {
    database,
    resolveKey,
    trackingHmacSecret,
    clock = SYSTEM_CLOCK,
  } = options;

  async function validatedActor(rawSession: unknown) {
    const actor = activeActor(rawSession, clock());
    if (!actor) return null;
    try {
      const currentUser = await database.user.findFirst({
        where: {
          id: actor.userId,
          role: actor.role,
          isActive: true,
        },
        select: {id: true},
      });
      return currentUser ? actor : null;
    } catch {
      return null;
    }
  }

  async function list(
    rawSession: unknown,
    rawQuery: unknown,
  ): Promise<TicketListResult> {
    const query = TicketCollectionQuerySchema.safeParse(rawQuery);
    if (!query.success) return TicketListResultSchema.parse(failure("INVALID_REQUEST"));
    const actor = await validatedActor(rawSession);
    if (!actor) return TicketListResultSchema.parse(failure("NOT_FOUND"));
    const scope = queryScope(actor);
    if (!scope) return TicketListResultSchema.parse(failure("NOT_FOUND"));

    try {
      const rows = await readSummaries(
        database,
        actor,
        scope,
        ticketWhere(scope, query.data),
        query.data.page,
        query.data.pageSize,
      );
      return TicketListResultSchema.parse({
        ok: true,
        data: {
          items: rows.map(projectSummary),
          page: query.data.page,
          pageSize: query.data.pageSize,
        },
      });
    } catch {
      return TicketListResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function detail(
    rawSession: unknown,
    rawQuery: unknown,
  ): Promise<TicketDetailResult> {
    const query = TicketIdQuerySchema.safeParse(rawQuery);
    if (!query.success) return TicketDetailResultSchema.parse(failure("INVALID_REQUEST"));
    const actor = await validatedActor(rawSession);
    if (!actor) return TicketDetailResultSchema.parse(failure("NOT_FOUND"));
    const scope = queryScope(actor);

    try {
      if (scope === "PPKS") {
        const row = await database.$transaction(async (tx) => {
          const found = await tx.ticket.findFirst({
            where: {id: query.data.id, category: PPKS_CATEGORY},
            select: PPKS_DETAIL_SELECT,
          });
          if (found) {
            await auditAllowedPpksAccess(tx, [found.id], actor.userId, "VIEW");
          }
          return found;
        });
        if (!row) return TicketDetailResultSchema.parse(failure("NOT_FOUND"));
        return TicketDetailResultSchema.parse({
          ok: true,
          data: projectPpksDetail(row, resolveKey),
        });
      }

      if (scope === "GENERAL") {
        const row = await database.ticket.findFirst({
          where: {id: query.data.id, category: GENERAL_CATEGORY_FILTER},
          select: DETAIL_SELECT,
        });
        if (row) {
          return TicketDetailResultSchema.parse({
            ok: true,
            data: projectGeneralDetail(row),
          });
        }
      }

      await auditDeniedPpksDetailAttempt(
        database,
        query.data.id,
        actor.userId,
      );
      return TicketDetailResultSchema.parse(failure("NOT_FOUND"));
    } catch {
      return TicketDetailResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function count(
    rawSession: unknown,
    rawQuery: unknown,
  ): Promise<TicketCountResult> {
    const query = TicketCollectionQuerySchema.safeParse(rawQuery);
    if (!query.success) return TicketCountResultSchema.parse(failure("INVALID_REQUEST"));
    const actor = await validatedActor(rawSession);
    if (!actor) return TicketCountResultSchema.parse(failure("NOT_FOUND"));
    const scope = queryScope(actor);
    if (!scope) return TicketCountResultSchema.parse(failure("NOT_FOUND"));
    const where = ticketWhere(scope, query.data);

    try {
      const value = scope === "GENERAL"
        ? await database.ticket.count({where})
        : await database.$transaction(async (tx) => {
            const rows = await tx.ticket.findMany({where, select: {id: true}});
            await auditAllowedPpksAccess(
              tx,
              rows.map(({id}) => id),
              actor.userId,
              "VIEW",
            );
            return rows.length;
          });
      return TicketCountResultSchema.parse({ok: true, data: {count: value}});
    } catch {
      return TicketCountResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function search(
    rawSession: unknown,
    rawQuery: unknown,
  ): Promise<TicketListResult> {
    const query = TicketSearchQuerySchema.safeParse(rawQuery);
    if (!query.success) return TicketListResultSchema.parse(failure("INVALID_REQUEST"));
    const actor = await validatedActor(rawSession);
    if (!actor) return TicketListResultSchema.parse(failure("NOT_FOUND"));
    const scope = queryScope(actor);
    if (!scope) return TicketListResultSchema.parse(failure("NOT_FOUND"));
    const where: Prisma.TicketWhereInput = {
      ...ticketWhere(scope, {}),
      ticketNumber: {
        contains: query.data.term,
        mode: "insensitive",
      },
    };

    try {
      const rows = await readSummaries(
        database,
        actor,
        scope,
        where,
        query.data.page,
        query.data.pageSize,
      );
      return TicketListResultSchema.parse({
        ok: true,
        data: {
          items: rows.map(projectSummary),
          page: query.data.page,
          pageSize: query.data.pageSize,
        },
      });
    } catch {
      return TicketListResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function exportRows(
    rawSession: unknown,
    rawQuery: unknown,
  ): Promise<TicketExportResult> {
    const query = TicketExportQuerySchema.safeParse(rawQuery);
    if (!query.success) return TicketExportResultSchema.parse(failure("INVALID_REQUEST"));
    const actor = await validatedActor(rawSession);
    if (!actor) return TicketExportResultSchema.parse(failure("NOT_FOUND"));
    const scope = queryScope(actor);
    if (!scope) return TicketExportResultSchema.parse(failure("NOT_FOUND"));
    const where = ticketWhere(scope, query.data);

    try {
      if (scope === "GENERAL") {
        const rows = await database.ticket.findMany({
          where,
          select: DETAIL_SELECT,
          orderBy: [{createdAt: "desc"}, {id: "desc"}],
          take: query.data.limit,
        });
        return TicketExportResultSchema.parse({
          ok: true,
          data: {items: rows.map(projectGeneralDetail)},
        });
      }

      const rows = await database.$transaction(async (tx) => {
        const found = await tx.ticket.findMany({
          where,
          select: PPKS_DETAIL_SELECT,
          orderBy: [{createdAt: "desc"}, {id: "desc"}],
          take: query.data.limit,
        });
        await auditAllowedPpksAccess(
          tx,
          found.map(({id}) => id),
          actor.userId,
          "EXPORT",
        );
        return found;
      });
      return TicketExportResultSchema.parse({
        ok: true,
        data: {items: rows.map((row) => projectPpksDetail(row, resolveKey))},
      });
    } catch {
      return TicketExportResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function ppksAggregate(
    rawSession: unknown,
  ): Promise<PpksAggregateResult> {
    const actor = await validatedActor(rawSession);
    if (!actor) return PpksAggregateResultSchema.parse(failure("NOT_FOUND"));
    const decision = authorize(
      {actor, ticketScope: "PPKS_AGGREGATE"},
      "VIEW",
      "PPKS_AGGREGATE",
    );
    if (!decision.allowed) {
      return PpksAggregateResultSchema.parse(failure("NOT_FOUND"));
    }

    try {
      const rows = await database.$transaction(async (tx) => {
        const found = await tx.ticket.findMany({
          where: {category: PPKS_CATEGORY},
          select: {id: true, status: true},
        });
        await auditAllowedPpksAccess(
          tx,
          found.map(({id}) => id),
          actor.userId,
          "VIEW",
        );
        return found;
      });
      const byStatus = {
        BARU: 0,
        DIVERIFIKASI: 0,
        DIPROSES: 0,
        MENUNGGU_PELAPOR: 0,
        SELESAI: 0,
        DITOLAK: 0,
      };
      for (const row of rows) byStatus[row.status] += 1;
      return PpksAggregateResultSchema.parse({
        ok: true,
        data: {
          total: rows.length,
          active: rows.filter(({status}) =>
            status !== "SELESAI" && status !== "DITOLAK"
          ).length,
          byStatus,
        },
      });
    } catch {
      return PpksAggregateResultSchema.parse(failure("UNAVAILABLE"));
    }
  }

  async function tracking(
    rawQuery: unknown,
  ): Promise<TicketTrackingResult> {
    const query = TicketTrackingProbeSchema.safeParse(rawQuery);
    if (!query.success) {
      return TicketTrackingResultSchema.parse({ok: false, code: "NOT_FOUND"});
    }

    try {
      const row = await database.ticket.findFirst({
        where: {
          ticketNumber: query.data.ticketNumber,
          category: GENERAL_CATEGORY_FILTER,
        },
        select: {
          ticketNumber: true,
          trackingTokenHash: true,
          priority: true,
          status: true,
          updatedAt: true,
        },
      });
      const matches = verifyTrackingTokenDigest(
        query.data.token,
        row?.trackingTokenHash ?? "0".repeat(64),
        trackingHmacSecret,
        "TICKET",
      );
      return TicketTrackingResultSchema.parse(
        row && matches
          ? {
              ok: true,
              data: {
                ticketNumber: row.ticketNumber,
                priority: row.priority,
                status: row.status,
                updatedAt: row.updatedAt,
              },
            }
          : {ok: false, code: "NOT_FOUND"},
      );
    } catch {
      return TicketTrackingResultSchema.parse({ok: false, code: "NOT_FOUND"});
    }
  }

  return Object.freeze({
    list,
    detail,
    count,
    search,
    export: exportRows,
    ppksAggregate,
    tracking,
  });
}

export type TicketQueryBoundary = ReturnType<typeof createTicketQueryBoundary>;
