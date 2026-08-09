import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsIdentifierSchema,
  CmsPageMetadataSchema,
} from "@/contracts/cms";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type PrivacyDatabase = ReturnType<typeof createPrismaClient>;

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();

const PrivacyNoticeInputSchema = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  title: RequiredText(255),
  version: z.number().int().positive().max(2147483647),
  effectiveAt: z.iso.datetime({offset: true}),
  summaryCiphertext: z.string().min(1),
  isCurrent: z.boolean().default(false),
}).strict();

const PrivacyNoticeUpdateInputSchema = PrivacyNoticeInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const ConsentRecordInputSchema = z.object({
  privacyNoticeId: CmsIdentifierSchema,
  purpose: RequiredText(255),
  granted: z.boolean(),
  sessionId: z.string().trim().min(8).max(191),
  subjectHash: z.string().trim().min(1).max(128),
}).strict();

const DataSubjectRequestInputSchema = z.object({
  type: z.enum(["ACCESS", "CORRECTION", "ERASURE", "RESTRICTION", "OBJECTION"]),
  requesterCiphertext: z.string().min(1),
  trackingTokenHash: z.string().trim().min(8).max(191),
}).strict();

const DataSubjectRequestProcessInputSchema = z.object({
  id: CmsIdentifierSchema,
  requestNumber: z.string().trim().min(1).max(50),
  verificationState: z.enum(["PENDING", "VERIFIED", "FAILED", "EXPIRED"]),
  resolutionCiphertext: OptionalText(5000),
}).strict();

const DataIncidentInputSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  systemsAffected: z.array(z.string().trim().min(1).max(255)).min(1).max(50),
  dataCategories: z.array(z.string().trim().min(1).max(255)).min(1).max(50),
  summaryCiphertext: z.string().min(1),
  ownerId: CmsIdentifierSchema,
  occurredAt: z.iso.datetime({offset: true}),
  discoveredAt: z.iso.datetime({offset: true}),
}).strict();

const DataIncidentUpdateInputSchema = z.object({
  id: CmsIdentifierSchema,
  status: z.enum(["OPEN", "CONTAINED", "INVESTIGATING", "RESOLVED"]),
  containmentCiphertext: OptionalText(5000),
}).strict();

const DataExportInputSchema = z.object({
  resourceType: z.string().trim().min(1).max(80),
  resourceId: CmsIdentifierSchema,
  purpose: RequiredText(500),
}).strict();

const DataExportDownloadInputSchema = z.object({
  id: CmsIdentifierSchema,
  storageKey: z.string().trim().min(1).max(500),
}).strict();

const PrivacyNoticeViewSchema = z.object({
  id: CmsIdentifierSchema,
  version: z.number(),
  effectiveAt: z.iso.datetime({offset: true}),
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime({offset: true}),
}).strict();

const DataSubjectRequestViewSchema = z.object({
  id: CmsIdentifierSchema,
  requestNumber: z.string(),
  type: z.string(),
  status: z.enum(["RECEIVED", "VERIFYING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
  verificationState: z.string(),
  resolutionCiphertext: z.string().nullable(),
  trackingTokenHash: z.string(),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

const DataIncidentViewSchema = z.object({
  id: CmsIdentifierSchema,
  severity: z.string(),
  status: z.string(),
  systemsAffected: z.array(z.string()),
  dataCategories: z.array(z.string()),
  containmentCiphertext: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

const DataExportLogViewSchema = z.object({
  id: CmsIdentifierSchema,
  resourceType: z.string(),
  resourceId: CmsIdentifierSchema,
  purpose: z.string(),
  storageKey: z.string().nullable(),
  downloadedAt: z.iso.datetime({offset: true}).nullable(),
  createdAt: z.iso.datetime({offset: true}),
  actorId: z.string(),
}).strict();

const PublicPrivacyNoticeSchema = z.object({
  version: z.number(),
  effectiveAt: z.iso.datetime({offset: true}),
}).strict();

export const PrivacyListQuerySchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  direction: z.enum(["ASC", "DESC"]).default("DESC"),
  resource: z.enum(["PRIVACY_NOTICE", "DATA_REQUEST", "DATA_INCIDENT", "DATA_EXPORT"]),
  status: z.enum(["ALL", "ACTIVE", "PENDING", "IN_PROGRESS", "COMPLETED", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"]).optional(),
}).strict();

const RawPrivacyListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["PRIVACY_NOTICE", "DATA_REQUEST", "DATA_INCIDENT", "DATA_EXPORT"]),
  status: z.enum(["ALL", "ACTIVE", "PENDING", "IN_PROGRESS", "COMPLETED", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"]).optional(),
}).strict();

const PrivacyFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "SLUG_CONFLICT",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "UNAVAILABLE",
]);

const PrivacyMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: CmsIdentifierSchema,
    version: z.number().int().positive().nullable(),
  }).strict(),
  z.object({ok: z.literal(false), code: PrivacyFailureCodeSchema}).strict(),
]);

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

function isPrismaCode(error: unknown, code: string) {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError
    && error.code === code
  );
}

export function normalizePrivacyListSearchParams(params: URLSearchParams) {
  try {
    const entries: Record<string, string> = {};
    for (const [key, value] of params.entries()) entries[key] = value;
    const raw = RawPrivacyListQuerySchema.parse(entries);
    return {
      ok: true as const,
      data: PrivacyListQuerySchema.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        search: raw.search ?? "",
        direction: raw.direction ?? "DESC",
        resource: raw.resource,
        status: raw.status ?? "ALL",
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listPrivacyNotices(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  query: z.infer<typeof PrivacyListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      translations: {some: {title: {contains: query.search, mode: "insensitive" as const}}},
    };
    const statusFilter = query.status === "ACTIVE" ? {isCurrent: true} : {};

    const [rows, total] = await prisma.$transaction([
      prisma.privacyNotice.findMany({
        where: {...searchFilter, ...statusFilter},
        orderBy: [{version: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.privacyNotice.count({where: {...searchFilter, ...statusFilter}}),
    ]);

    const items = rows.map((row) =>
      PrivacyNoticeViewSchema.parse({
        id: row.id,
        version: row.version,
        effectiveAt: row.effectiveAt.toISOString(),
        isCurrent: row.isCurrent,
        createdAt: row.createdAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createPrivacyNotice(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof PrivacyNoticeInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = PrivacyNoticeInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.privacyNotice.create({
        data: {
          version: parsed.data.version,
          effectiveAt: new Date(parsed.data.effectiveAt),
          isCurrent: parsed.data.isCurrent,
        },
        select: {id: true},
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "PrivacyNotice",
          resourceId: row.id,
        },
      });
      return PrivacyMutationResultSchema.parse({
        ok: true,
        id: row.id,
        version: parsed.data.version,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updatePrivacyNotice(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof PrivacyNoticeUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = PrivacyNoticeUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.privacyNotice.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.privacyNotice.update({
        where: {id: parsed.data.id},
        data: {
          version: parsed.data.version,
          effectiveAt: new Date(parsed.data.effectiveAt),
          isCurrent: parsed.data.isCurrent,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "PrivacyNotice",
          resourceId: parsed.data.id,
        },
      });

      return PrivacyMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: parsed.data.version,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deletePrivacyNotice(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.privacyNotice.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.privacyNotice.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "PrivacyNotice",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return PrivacyMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function getActivePrivacyNotice(
  prisma: PrivacyDatabase,
) {
  try {
    const notice = await prisma.privacyNotice.findFirst({
      where: {isCurrent: true},
      orderBy: {version: "desc"},
      select: {
        version: true,
        effectiveAt: true,
      },
    });

    if (!notice) return {ok: false as const, code: "NOT_FOUND" as const};

    const parsed = PublicPrivacyNoticeSchema.safeParse({
      version: notice.version,
      effectiveAt: notice.effectiveAt.toISOString(),
    });

    if (!parsed.success) return {ok: false as const, code: "UNAVAILABLE" as const};
    return {ok: true as const, data: parsed.data};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function recordConsent(
  prisma: PrivacyDatabase,
  input: z.infer<typeof ConsentRecordInputSchema>,
) {
  const parsed = ConsentRecordInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  try {
    const record = await prisma.consentRecord.create({
      data: {
        privacyNoticeId: parsed.data.privacyNoticeId,
        purpose: parsed.data.purpose,
        granted: parsed.data.granted,
        sessionId: parsed.data.sessionId,
        subjectHash: parsed.data.subjectHash,
      },
      select: {id: true},
    });

    return {ok: true as const, data: {id: record.id, recorded: true}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function submitDataRequest(
  prisma: PrivacyDatabase,
  input: z.infer<typeof DataSubjectRequestInputSchema>,
) {
  const parsed = DataSubjectRequestInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  try {
    const requestNumber = `DSR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const record = await prisma.dataSubjectRequest.create({
      data: {
        type: parsed.data.type,
        requesterCiphertext: parsed.data.requesterCiphertext,
        requestCiphertext: parsed.data.requesterCiphertext,
        trackingTokenHash: parsed.data.trackingTokenHash,
        requestNumber,
        status: "RECEIVED",
        verificationState: "PENDING",
      },
      select: {
        id: true,
        requestNumber: true,
        trackingTokenHash: true,
      },
    });

    return {
      ok: true as const,
      data: {
        requestNumber: record.requestNumber,
        trackingTokenHash: record.trackingTokenHash,
      },
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function processDataRequest(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof DataSubjectRequestProcessInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = DataSubjectRequestProcessInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.dataSubjectRequest.findUnique({
        where: {id: parsed.data.id},
        select: {id: true, status: true, assigneeId: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      const isFinal = parsed.data.verificationState === "VERIFIED"
        || parsed.data.verificationState === "FAILED";

      if (isFinal) {
        if (!existing.assigneeId) {
          await tx.dataSubjectRequest.update({
            where: {id: parsed.data.id},
            data: {assigneeId: actor.userId},
          });
          await tx.activityLog.create({
            data: {
              actorId: actor.userId,
              action: "UPDATE",
              resourceType: "DataSubjectRequest",
              resourceId: parsed.data.id,
              metadata: {operation: "ASSIGN_REVIEW", verificationState: parsed.data.verificationState, role: "firstApprover", assigneeId: actor.userId},
            },
          });
          return PrivacyMutationResultSchema.parse({
            ok: true,
            id: parsed.data.id,
            version: null,
          });
        }
        if (existing.assigneeId === actor.userId) {
          return {ok: false, code: "INVALID_STATE"} as const;
        }
      }

      const newStatus = parsed.data.verificationState === "VERIFIED"
        ? "IN_PROGRESS"
        : parsed.data.verificationState === "FAILED" ? "REJECTED" : "RECEIVED";

      await tx.dataSubjectRequest.update({
        where: {id: parsed.data.id},
        data: {
          status: newStatus,
          verificationState: parsed.data.verificationState,
          resolutionCiphertext: parsed.data.resolutionCiphertext,
                  },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "DataSubjectRequest",
          resourceId: parsed.data.id,
          metadata: {
            operation: "PROCESS",
            verificationState: parsed.data.verificationState,
            approvers: {
              assigneeId: existing.assigneeId,
              disposedById: actor.userId,
            },
          },
        },
      });

      return PrivacyMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listDataSubjectRequests(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  query: z.infer<typeof PrivacyListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const statusFilter = query.status && !["ALL", "ACTIVE", "PENDING"].includes(query.status)
      ? {status: query.status as "RECEIVED" | "VERIFYING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"}
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.dataSubjectRequest.findMany({
        where: statusFilter,
        orderBy: [{createdAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.dataSubjectRequest.count({where: statusFilter}),
    ]);

    const items = rows.map((row) =>
      DataSubjectRequestViewSchema.parse({
        id: row.id,
        requestNumber: row.requestNumber,
        type: row.type,
        status: row.status,
        verificationState: row.verificationState,
        resolutionCiphertext: row.resolutionCiphertext,
        trackingTokenHash: row.trackingTokenHash,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createDataIncident(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof DataIncidentInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = DataIncidentInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const row = await prisma.dataIncident.create({
      data: {
        severity: parsed.data.severity,
        status: "OPEN",
        systemsAffected: parsed.data.systemsAffected,
        dataCategories: parsed.data.dataCategories,
        summaryCiphertext: parsed.data.summaryCiphertext,
        ownerId: parsed.data.ownerId,
        occurredAt: new Date(parsed.data.occurredAt),
        discoveredAt: new Date(parsed.data.discoveredAt),
      },
      select: {id: true},
    });

    return PrivacyMutationResultSchema.parse({
      ok: true,
      id: row.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateDataIncident(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof DataIncidentUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = DataIncidentUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.dataIncident.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.dataIncident.update({
        where: {id: parsed.data.id},
        data: {
          status: parsed.data.status,
          containmentCiphertext: parsed.data.containmentCiphertext,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "DataIncident",
          resourceId: parsed.data.id,
          metadata: {operation: "UPDATE_STATUS", newStatus: parsed.data.status},
        },
      });

      return PrivacyMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listDataIncidents(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  query: z.infer<typeof PrivacyListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const statusFilter = query.status && !["ALL", "ACTIVE", "PENDING"].includes(query.status)
      ? {status: query.status as "OPEN" | "CONTAINED" | "INVESTIGATING" | "RESOLVED"}
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.dataIncident.findMany({
        where: statusFilter,
        orderBy: [{createdAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.dataIncident.count({where: statusFilter}),
    ]);

    const items = rows.map((row) =>
      DataIncidentViewSchema.parse({
        id: row.id,
        severity: row.severity,
        status: row.status,
        systemsAffected: row.systemsAffected as string[],
        dataCategories: row.dataCategories as string[],
        containmentCiphertext: row.containmentCiphertext,
        ownerId: row.ownerId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createDataExport(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof DataExportInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = DataExportInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const row = await prisma.dataExportLog.create({
      data: {
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
        purpose: parsed.data.purpose,
        actorId: actor.userId,
        recordCount: 0,
      },
      select: {id: true},
    });

    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "EXPORT",
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
      },
    });

    return PrivacyMutationResultSchema.parse({
      ok: true,
      id: row.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function recordExportDownload(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  input: z.infer<typeof DataExportDownloadInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = DataExportDownloadInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const existing = await prisma.dataExportLog.findUnique({
      where: {id: parsed.data.id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

    await prisma.dataExportLog.update({
      where: {id: parsed.data.id},
      data: {
        storageKey: parsed.data.storageKey,
        downloadedAt: now,
      },
    });

    return PrivacyMutationResultSchema.parse({
      ok: true,
      id: parsed.data.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listDataExports(
  prisma: PrivacyDatabase,
  rawActor: unknown,
  query: z.infer<typeof PrivacyListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      OR: [
        {resourceType: {contains: query.search, mode: "insensitive" as const}},
        {purpose: {contains: query.search, mode: "insensitive" as const}},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.dataExportLog.findMany({
        where: searchFilter,
        orderBy: [{createdAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.dataExportLog.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      DataExportLogViewSchema.parse({
        id: row.id,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        purpose: row.purpose,
        storageKey: row.storageKey,
        downloadedAt: row.downloadedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        actorId: row.actorId,
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function privacyHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT", "INVALID_STATE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
