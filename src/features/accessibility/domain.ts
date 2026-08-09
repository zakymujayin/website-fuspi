import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsIdentifierSchema,
  CmsPageMetadataSchema,
} from "@/contracts/cms";
import type {Prisma} from "@/generated/prisma/client";
import {$Enums} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type AccessibilityDatabase = ReturnType<typeof createPrismaClient>;

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();

const IssueSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const IssueStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "ACCEPTED_RISK"]);
const WcagCriterionSchema = z.enum([
  "1.1.1", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5",
  "1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5",
  "1.4.1", "1.4.2", "1.4.3", "1.4.4", "1.4.5", "1.4.6", "1.4.7", "1.4.8", "1.4.9", "1.4.10", "1.4.11", "1.4.12", "1.4.13",
  "2.1.1", "2.1.2", "2.1.3", "2.1.4",
  "2.2.1", "2.2.2",
  "2.3.1", "2.3.2", "2.3.3",
  "2.4.1", "2.4.2", "2.4.3", "2.4.4", "2.4.5", "2.4.6", "2.4.7", "2.4.8", "2.4.9", "2.4.10",
  "2.5.1", "2.5.2", "2.5.3", "2.5.4", "2.5.5", "2.5.6",
  "3.1.1", "3.1.2",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5", "3.2.6",
  "3.3.1", "3.3.2", "3.3.3", "3.3.4", "3.3.5", "3.3.6",
  "4.1.1", "4.1.2", "4.1.3",
]);

const AccessibilityIssueInputSchema = z.object({
  route: z.string().trim().min(1).max(2048),
  wcagCriterion: WcagCriterionSchema,
  description: RequiredText(5000),
  summary: RequiredText(255),
  severity: IssueSeveritySchema,
  status: IssueStatusSchema.default("OPEN"),
}).strict();

const AccessibilityIssueUpdateStatusInputSchema = z.object({
  id: CmsIdentifierSchema,
  status: IssueStatusSchema,
  resolution: OptionalText(5000),
}).strict();

const AccessibilityRequestInputSchema = z.object({
  requestedFormat: RequiredText(255),
  resourcePath: z.string().trim().min(1).max(2048),
  requesterEncrypted: z.string().min(1),
}).strict();

const AccessibilityIssueViewSchema = z.object({
  id: CmsIdentifierSchema,
  route: z.string(),
  wcagCriterion: z.string(),
  description: z.string(),
  summary: z.string(),
  severity: z.string(),
  status: z.string(),
  retestResult: z.string().nullable(),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

const AccessibilityRequestViewSchema = z.object({
  id: CmsIdentifierSchema,
  requestedFormat: z.string(),
  resourcePath: z.string(),
  status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
  trackingToken: z.string(),
  completedAt: z.iso.datetime({offset: true}).nullable(),
  createdAt: z.iso.datetime({offset: true}),
}).strict();

export const AccessibilityListQuerySchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  direction: z.enum(["ASC", "DESC"]).default("DESC"),
  resource: z.enum(["ISSUE", "REQUEST"]),
  status: z.enum(["ALL", "OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "ACCEPTED_RISK", "RECEIVED", "COMPLETED", "REJECTED"]).optional(),
}).strict();

const RawAccessibilityListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["ISSUE", "REQUEST"]),
  status: z.enum(["ALL", "OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "ACCEPTED_RISK", "RECEIVED", "COMPLETED", "REJECTED"]).optional(),
}).strict();

const AccessibilityFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "UNAVAILABLE",
]);

const AccessibilityMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: CmsIdentifierSchema,
    version: z.number().int().positive().nullable(),
  }).strict(),
  z.object({ok: z.literal(false), code: AccessibilityFailureCodeSchema}).strict(),
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

export function normalizeAccessibilityListSearchParams(params: URLSearchParams) {
  try {
    const entries: Record<string, string> = {};
    for (const [key, value] of params.entries()) entries[key] = value;
    const raw = RawAccessibilityListQuerySchema.parse(entries);
    return {
      ok: true as const,
      data: AccessibilityListQuerySchema.parse({
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

export async function listAccessibilityIssues(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  query: z.infer<typeof AccessibilityListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter: Prisma.AccessibilityIssueWhereInput = query.search === "" ? {} : {
      OR: [
        {route: {contains: query.search, mode: "insensitive"}},
        {description: {contains: query.search, mode: "insensitive"}},
        {wcagCriterion: {contains: query.search, mode: "insensitive"}},
      ],
    };
    const statusFilter: Prisma.AccessibilityIssueWhereInput = query.status
      && !["ALL", "RECEIVED", "COMPLETED", "REJECTED"].includes(query.status)
      ? {status: query.status as $Enums.AccessibilityIssueStatus}
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.accessibilityIssue.findMany({
        where: {...searchFilter, ...statusFilter},
        orderBy: [{severity: "asc" as const}, {createdAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.accessibilityIssue.count({where: {...searchFilter, ...statusFilter}}),
    ]);

    const items = rows.map((row) =>
      AccessibilityIssueViewSchema.parse({
        id: row.id,
        route: row.route,
        wcagCriterion: row.wcagCriterion,
        description: row.description,
        summary: row.summary,
        severity: row.severity,
        status: row.status,
        retestResult: row.retestResult,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createAccessibilityIssue(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  input: z.infer<typeof AccessibilityIssueInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = AccessibilityIssueInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const row = await prisma.accessibilityIssue.create({
      data: {
        route: parsed.data.route,
        wcagCriterion: parsed.data.wcagCriterion,
        description: parsed.data.description,
        summary: parsed.data.summary,
        severity: parsed.data.severity as $Enums.IncidentSeverity,
        status: parsed.data.status as $Enums.AccessibilityIssueStatus,
      },
      select: {id: true},
    });
    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "CREATE",
        resourceType: "AccessibilityIssue",
        resourceId: row.id,
      },
    });
    return AccessibilityMutationResultSchema.parse({
      ok: true,
      id: row.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateAccessibilityIssue(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  input: z.infer<typeof AccessibilityIssueInputSchema> & {id: string},
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = AccessibilityIssueInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const existing = await prisma.accessibilityIssue.findUnique({
      where: {id: input.id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

    await prisma.accessibilityIssue.update({
      where: {id: input.id},
      data: {
        route: parsed.data.route,
        wcagCriterion: parsed.data.wcagCriterion,
        description: parsed.data.description,
        summary: parsed.data.summary,
        severity: parsed.data.severity as $Enums.IncidentSeverity,
        status: parsed.data.status as $Enums.AccessibilityIssueStatus,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "AccessibilityIssue",
        resourceId: input.id,
      },
    });

    return AccessibilityMutationResultSchema.parse({
      ok: true,
      id: input.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateIssueStatus(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  input: z.infer<typeof AccessibilityIssueUpdateStatusInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = AccessibilityIssueUpdateStatusInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    const existing = await prisma.accessibilityIssue.findUnique({
      where: {id: parsed.data.id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

    await prisma.accessibilityIssue.update({
      where: {id: parsed.data.id},
      data: {
        status: parsed.data.status as $Enums.AccessibilityIssueStatus,
        retestResult: parsed.data.resolution,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "AccessibilityIssue",
        resourceId: parsed.data.id,
        metadata: {operation: "CHANGE_STATUS", newStatus: parsed.data.status},
      },
    });

    return AccessibilityMutationResultSchema.parse({
      ok: true,
      id: parsed.data.id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deleteAccessibilityIssue(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    const existing = await prisma.accessibilityIssue.findUnique({
      where: {id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

    await prisma.accessibilityIssue.delete({where: {id}});

    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "AccessibilityIssue",
        resourceId: id,
        metadata: {operation: "DELETE"},
      },
    });

    return AccessibilityMutationResultSchema.parse({
      ok: true,
      id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function submitAccessibilityRequest(
  prisma: AccessibilityDatabase,
  input: z.infer<typeof AccessibilityRequestInputSchema>,
) {
  const parsed = AccessibilityRequestInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  try {
    const trackingToken = `AR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const requestNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;

    const record = await prisma.accessibilityRequest.create({
      data: {
        requestNumber,
        trackingTokenHash: trackingToken,
        requestedFormat: parsed.data.requestedFormat,
        resourcePath: parsed.data.resourcePath,
        requesterCiphertext: parsed.data.requesterEncrypted,
        status: "RECEIVED" as $Enums.AccessibilityRequestStatus,
      },
      select: {
        id: true,
        trackingTokenHash: true,
      },
    });

    return {
      ok: true as const,
      data: {
        trackingToken: record.trackingTokenHash,
      },
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function listAccessibilityRequests(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  query: z.infer<typeof AccessibilityListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const statusFilter: Prisma.AccessibilityRequestWhereInput = query.status
      && !["ALL", "OPEN", "FIXED", "VERIFIED", "ACCEPTED_RISK"].includes(query.status)
      ? {status: query.status as $Enums.AccessibilityRequestStatus}
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.accessibilityRequest.findMany({
        where: statusFilter,
        orderBy: [{createdAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.accessibilityRequest.count({where: statusFilter}),
    ]);

    const items = rows.map((row) =>
      AccessibilityRequestViewSchema.parse({
        id: row.id,
        requestedFormat: row.requestedFormat,
        resourcePath: row.resourcePath,
        status: row.status,
        trackingToken: row.trackingTokenHash,
        completedAt: row.completedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function completeAccessibilityRequest(
  prisma: AccessibilityDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    const existing = await prisma.accessibilityRequest.findUnique({
      where: {id},
      select: {id: true, status: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

    await prisma.accessibilityRequest.update({
      where: {id},
      data: {
        status: "COMPLETED" as $Enums.AccessibilityRequestStatus,
        completedAt: now,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "AccessibilityRequest",
        resourceId: id,
        metadata: {operation: "COMPLETE"},
      },
    });

    return AccessibilityMutationResultSchema.parse({
      ok: true,
      id,
      version: null,
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export function accessibilityHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
