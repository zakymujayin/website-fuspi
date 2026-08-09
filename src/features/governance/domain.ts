import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsIdentifierSchema,
  CmsPageMetadataSchema,
  CmsRevisionSummarySchema,
} from "@/contracts/cms";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createContentRevision} from "@/lib/db/revision";

export type GovernanceDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));

const ContentRevisionViewSchema = CmsRevisionSummarySchema.extend({
  resourceType: z.string().trim().min(1).max(80),
  resourceId: CmsIdentifierSchema,
}).strict();

const RevisionDiffSchema = z.object({
  revisionId: CmsIdentifierSchema,
  createdAt: z.iso.datetime({offset: true}),
  resourceType: z.string(),
  resourceId: z.string(),
  previousRevisionId: CmsIdentifierSchema.nullable(),
  previousCreatedAt: z.iso.datetime({offset: true}).nullable(),
  snapshot: z.record(z.string(), z.unknown()),
  previousSnapshot: z.record(z.string(), z.unknown()).nullable(),
}).strict();

const GlossaryTranslationInputSchema = z.object({
  locale: z.enum(["id", "en", "ar"]),
  term: RequiredText(255),
  definition: RequiredText(100_000),
}).strict();

const GlossaryTermInputSchema = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  translations: z.array(GlossaryTranslationInputSchema).min(1).max(3),
}).strict().superRefine(({translations}, context) => {
  if (!translations.some((t) => t.locale === "id")) {
    context.addIssue({
      code: "custom",
      path: ["translations"],
      message: "Indonesian translation is required.",
    });
  }
  const locales = translations.map((t) => t.locale);
  if (new Set(locales).size !== locales.length) {
    context.addIssue({
      code: "custom",
      path: ["translations"],
      message: "Translation locales must be unique.",
    });
  }
});

const GlossaryTermUpdateInputSchema = GlossaryTermInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const RetentionPolicyInputSchema = z.object({
  resourceType: z.string().trim().min(1).max(80),
  legalBasis: RequiredText(500),
  activeDays: z.number().int().min(1).max(36500),
  archiveDays: z.number().int().min(0).max(36500),
  disposition: z.enum(["DELETE", "ANONYMIZE", "HOLD"]),
  legalHold: z.boolean().default(false),
  rationale: z.string().default(""),
}).strict();

const RetentionPolicyUpdateInputSchema = RetentionPolicyInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const GlossaryTermViewSchema = z.object({
  id: CmsIdentifierSchema,
  key: z.string(),
  translations: z.array(
    z.object({
      id: CmsIdentifierSchema,
      locale: z.enum(["id", "en", "ar"]),
      term: z.string(),
      definition: z.string().nullable(),
    }),
  ),
}).strict();

const RetentionPolicyViewSchema = z.object({
  id: CmsIdentifierSchema,
  resourceType: z.string(),
  legalBasis: z.string(),
  activeDays: z.number(),
  archiveDays: z.number(),
  disposition: z.string(),
  legalHold: z.boolean(),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

const PublicGlossaryTermSchema = z.object({
  key: z.string(),
  term: z.string(),
  definition: z.string().nullable(),
  resolvedLocale: z.enum(["id", "en", "ar"]),
  isFallback: z.boolean(),
}).strict();

export const GovernanceListQuerySchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  direction: z.enum(["ASC", "DESC"]).default("ASC"),
  resource: z.enum(["GLOSSARY_TERM", "RETENTION_POLICY"]),
}).strict();

const RawGovernanceListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["GLOSSARY_TERM", "RETENTION_POLICY"]),
}).strict();

const GovernanceFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "SLUG_CONFLICT",
  "UNAVAILABLE",
]);

const GovernanceMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: CmsIdentifierSchema,
    version: z.number().int().positive().nullable(),
  }).strict(),
  z.object({ok: z.literal(false), code: GovernanceFailureCodeSchema}).strict(),
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

export function normalizeGovernanceListSearchParams(params: URLSearchParams) {
  try {
    const entries: Record<string, string> = {};
    for (const [key, value] of params.entries()) entries[key] = value;
    const raw = RawGovernanceListQuerySchema.parse(entries);
    return {
      ok: true as const,
      data: GovernanceListQuerySchema.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        search: raw.search ?? "",
        direction: raw.direction ?? "ASC",
        resource: raw.resource,
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listContentRevisions(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  resourceType: string,
  resourceId: string,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const revisions = await prisma.contentRevision.findMany({
      where: {resourceType, resourceId},
      orderBy: {createdAt: "desc"},
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        locale: true,
        version: true,
        changeSummary: true,
        actorId: true,
        createdAt: true,
      },
    });
    const items = revisions.map((rev) =>
      ContentRevisionViewSchema.parse({
        id: rev.id,
        resourceType: rev.resourceType,
        resourceId: rev.resourceId,
        resource: {
          resourceType: rev.resourceType,
          resourceId: rev.resourceId,
          version: rev.version,
        },
        locale: rev.locale,
        changeSummary: rev.changeSummary,
        actorId: rev.actorId,
        createdAt: rev.createdAt.toISOString(),
      }),
    );
    return {ok: true as const, data: {items, total: items.length}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function getRevisionDiff(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  revisionId: string,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const revision = await prisma.contentRevision.findUnique({
      where: {id: revisionId},
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        version: true,
        snapshotJson: true,
        createdAt: true,
      },
    });
    if (!revision) return {ok: false as const, code: "NOT_FOUND" as const};

    const previous = await prisma.contentRevision.findFirst({
      where: {
        resourceType: revision.resourceType,
        resourceId: revision.resourceId,
        createdAt: {lt: revision.createdAt},
      },
      orderBy: {createdAt: "desc"},
      select: {id: true, snapshotJson: true, createdAt: true},
    });

    return {
      ok: true as const,
      data: RevisionDiffSchema.parse({
        revisionId: revision.id,
        createdAt: revision.createdAt.toISOString(),
        resourceType: revision.resourceType,
        resourceId: revision.resourceId,
        previousRevisionId: previous?.id ?? null,
        previousCreatedAt: previous?.createdAt.toISOString() ?? null,
        snapshot: revision.snapshotJson,
        previousSnapshot: previous?.snapshotJson ?? null,
      }),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function restoreRevision(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  resourceType: string,
  resourceId: string,
  revisionId: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const revision = await tx.contentRevision.findUnique({
        where: {id: revisionId},
        select: {snapshotJson: true, version: true},
      });
      if (!revision) return {ok: false, code: "NOT_FOUND"} as const;

      const maxVersion = await tx.contentRevision.aggregate({
        where: {resourceType, resourceId},
        _max: {version: true},
      });
      const newVersion = (maxVersion._max.version ?? revision.version) + 1;

      await createContentRevision(tx, {
        resourceType,
        resourceId,
        version: newVersion,
        actorId: actor.userId,
        changeSummary: `Restored from revision ${revisionId}`,
        snapshot: revision.snapshotJson as Record<string, unknown>,
      });

      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: resourceId,
        version: newVersion,
      });
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function changeContentOwner(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  resourceType: string,
  resourceId: string,
  newOwnerId: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const resourceMap: Record<string, {table: string; idField: string}> = {
        Post: {table: "post", idField: "id"},
        Page: {table: "page", idField: "id"},
        StudyProgram: {table: "studyProgram", idField: "id"},
        Service: {table: "service", idField: "id"},
        Unit: {table: "unit", idField: "id"},
        Document: {table: "document", idField: "id"},
        Faq: {table: "faq", idField: "id"},
        Event: {table: "event", idField: "id"},
        Room: {table: "room", idField: "id"},
        MenuItem: {table: "menuItem", idField: "id"},
        HomeSection: {table: "homeSection", idField: "id"},
        SiteSetting: {table: "siteSetting", idField: "id"},
        SiteAlert: {table: "siteAlert", idField: "id"},
      };

      const mapping = resourceMap[resourceType];
      if (!mapping) return {ok: false, code: "NOT_FOUND"} as const;

      const record = await (tx as unknown as Record<string, unknown>)[mapping.table as string] as {
        findUnique: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      } | undefined;

      if (!record) return {ok: false, code: "NOT_FOUND"} as const;

      const existing = await record.findUnique({
        where: {[mapping.idField]: resourceId},
        select: {id: true, contentOwnerId: true},
      }) as {id: string; contentOwnerId: string | null} | null;

      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await record.update({
        where: {[mapping.idField]: resourceId},
        data: {contentOwnerId: newOwnerId},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType,
          resourceId,
          metadata: {operation: "CHANGE_OWNER", previousOwnerId: existing.contentOwnerId, newOwnerId},
        },
      });

      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: resourceId,
        version: null,
      });
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "NOT_FOUND"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listDueReviews(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const governedResources = [
      {table: "post" as const, type: "Post" as const},
      {table: "page" as const, type: "Page" as const},
      {table: "studyProgram" as const, type: "StudyProgram" as const},
      {table: "service" as const, type: "Service" as const},
      {table: "unit" as const, type: "Unit" as const},
      {table: "document" as const, type: "Document" as const},
      {table: "faq" as const, type: "Faq" as const},
      {table: "event" as const, type: "Event" as const},
      {table: "room" as const, type: "Room" as const},
      {table: "menuItem" as const, type: "MenuItem" as const},
      {table: "homeSection" as const, type: "HomeSection" as const},
      {table: "siteSetting" as const, type: "SiteSetting" as const},
      {table: "siteAlert" as const, type: "SiteAlert" as const},
    ];

    const results: Array<{
      resourceType: string;
      resourceId: string;
      governanceStatus: string;
      reviewDueAt: string | null;
      contentOwnerId: string | null;
    }> = [];

    for (const {table, type} of governedResources) {
      const db = prisma as unknown as Record<string, unknown>;
      const model = db[table] as {
        findMany: (args: unknown) => Promise<Array<{
          id: string;
          governanceStatus: string;
          reviewDueAt: Date | null;
          contentOwnerId: string | null;
        }>>;
      } | undefined;
      if (!model) continue;
      const rows = await model.findMany({
        where: {reviewDueAt: {lte: now}, governanceStatus: {not: "EXPIRED"}},
        select: {
          id: true,
          governanceStatus: true,
          reviewDueAt: true,
          contentOwnerId: true,
        },
      });
      for (const row of rows) {
        results.push({
          resourceType: type,
          resourceId: row.id,
          governanceStatus: row.governanceStatus,
          reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
          contentOwnerId: row.contentOwnerId,
        });
      }
    }

    return {ok: true as const, data: {items: results, total: results.length}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function listGlossaryTerms(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  query: z.infer<typeof GovernanceListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      OR: [
        {key: {contains: query.search, mode: "insensitive" as const}},
        {translations: {some: {term: {contains: query.search, mode: "insensitive" as const}}}},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.glossaryTerm.findMany({
        where: searchFilter,
        orderBy: [{key: direction}, {id: "asc"}],
        ...pagination,
        include: {translations: true},
      }),
      prisma.glossaryTerm.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      GlossaryTermViewSchema.parse({
        id: row.id,
        key: row.key,
        translations: row.translations.map((t) => ({
          id: t.id,
          locale: t.locale,
          term: t.term,
          definition: t.definition,
        })),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createGlossaryTerm(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  input: z.infer<typeof GlossaryTermInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = GlossaryTermInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.glossaryTerm.create({
        data: {
          key: parsed.data.slug,
          translations: {
            create: parsed.data.translations.map((t) => ({
              locale: t.locale,
              term: t.term,
              definition: t.definition,
            })),
          },
        },
        select: {id: true},
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "GlossaryTerm",
          resourceId: row.id,
        },
      });
      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: row.id,
        version: null,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateGlossaryTerm(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  input: z.infer<typeof GlossaryTermUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = GlossaryTermUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.glossaryTerm.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.glossaryTerm.update({
        where: {id: parsed.data.id},
        data: {
          key: parsed.data.slug,
        },
      });

      await tx.glossaryTranslation.deleteMany({
        where: {
          glossaryTermId: parsed.data.id,
          locale: {notIn: parsed.data.translations.map((t) => t.locale)},
        },
      });

      for (const translation of parsed.data.translations) {
        await tx.glossaryTranslation.upsert({
          where: {
            glossaryTermId_locale: {
              glossaryTermId: parsed.data.id,
              locale: translation.locale,
            },
          },
          create: {
            glossaryTermId: parsed.data.id,
            locale: translation.locale,
            term: translation.term,
            definition: translation.definition,
          },
          update: {
            term: translation.term,
            definition: translation.definition,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "GlossaryTerm",
          resourceId: parsed.data.id,
        },
      });

      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deleteGlossaryTerm(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.glossaryTerm.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.glossaryTerm.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "GlossaryTerm",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return GovernanceMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listRetentionPolicies(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  query: z.infer<typeof GovernanceListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      OR: [
        {resourceType: {contains: query.search, mode: "insensitive" as const}},
        {legalBasis: {contains: query.search, mode: "insensitive" as const}},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.retentionPolicy.findMany({
        where: searchFilter,
        orderBy: [{resourceType: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.retentionPolicy.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      RetentionPolicyViewSchema.parse({
        id: row.id,
        resourceType: row.resourceType,
        legalBasis: row.legalBasis,
        activeDays: row.activeDays,
        archiveDays: row.archiveDays,
        disposition: row.disposition,
        legalHold: row.legalHold,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createRetentionPolicy(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  input: z.infer<typeof RetentionPolicyInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = RetentionPolicyInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.retentionPolicy.create({
        data: {
          ...parsed.data,
          rationale: "",
        },
        select: {id: true},
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "RetentionPolicy",
          resourceId: row.id,
        },
      });
      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: row.id,
        version: null,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateRetentionPolicy(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  input: z.infer<typeof RetentionPolicyUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = RetentionPolicyUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.retentionPolicy.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.retentionPolicy.update({
        where: {id: parsed.data.id},
        data: {
          resourceType: parsed.data.resourceType,
          legalBasis: parsed.data.legalBasis,
          activeDays: parsed.data.activeDays,
          archiveDays: parsed.data.archiveDays,
          disposition: parsed.data.disposition,
          legalHold: parsed.data.legalHold,
          rationale: "",
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "RetentionPolicy",
          resourceId: parsed.data.id,
        },
      });

      return GovernanceMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"} as const;
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deleteRetentionPolicy(
  prisma: GovernanceDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.retentionPolicy.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.retentionPolicy.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "RetentionPolicy",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return GovernanceMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listPublicGlossaryTerms(
  prisma: GovernanceDatabase,
  locale: Locale,
) {
  try {
    const rows = await prisma.glossaryTerm.findMany({
      where: {},
      include: {
        translations: {
          where: {
            locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
          },
        },
      },
      orderBy: {key: "asc"},
    });

    const items = rows.flatMap((row) => {
      const exact = row.translations.find((t) => t.locale === locale);
      const fallback = row.translations.find((t) => t.locale === "id");
      const translation = exact ?? fallback;
      if (!translation) return [];
      const parsed = PublicGlossaryTermSchema.safeParse({
        key: row.key,
        term: translation.term,
        definition: translation.definition,
        resolvedLocale: translation.locale,
        isFallback: translation.locale !== locale,
      });
      return parsed.success ? [parsed.data] : [];
    });

    return {ok: true as const, data: {items, total: items.length}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function governanceHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
