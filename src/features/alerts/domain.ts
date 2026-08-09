import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsIdentifierSchema,
  CmsPageMetadataSchema,
} from "@/contracts/cms";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type AlertsDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));

const AlertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
const AlertAudienceSchema = z.enum(["ALL", "ADMIN", "PUBLIC"]);

const SiteAlertTranslationInputSchema = z.object({
  locale: z.enum(["id", "en", "ar"]),
  title: RequiredText(255),
  message: RequiredText(5000),
}).strict();

const SiteAlertInputSchema = z.object({
  severity: AlertSeveritySchema,
  audience: AlertAudienceSchema,
  startsAt: z.iso.datetime({offset: true}),
  endsAt: z.iso.datetime({offset: true}).nullable(),
  isDismissible: z.boolean().default(true),
  isActive: z.boolean().default(false),
  translations: z.array(SiteAlertTranslationInputSchema).min(1).max(3),
}).strict().superRefine(({translations, startsAt, endsAt}, context) => {
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
  if (endsAt && new Date(startsAt) >= new Date(endsAt)) {
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "End date must be after start date.",
    });
  }
});

const SiteAlertUpdateInputSchema = SiteAlertInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const ServiceEndpointInputSchema = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  name: RequiredText(255),
  url: z.string().trim().min(1).max(2048).url(),
  ownerId: CmsIdentifierSchema.nullable(),
  isPublic: z.boolean().default(true),
}).strict();

const ServiceEndpointUpdateInputSchema = ServiceEndpointInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const IncidentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const IncidentStatusSchema = z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]);

const ServiceIncidentInputSchema = z.object({
  endpointId: CmsIdentifierSchema,
  severity: IncidentSeveritySchema,
  status: IncidentStatusSchema,
}).strict();

const ServiceIncidentUpdateInputSchema = ServiceIncidentInputSchema.extend({
  id: CmsIdentifierSchema,
}).strict();

const SiteAlertViewSchema = z.object({
  id: CmsIdentifierSchema,
  severity: z.string(),
  audience: z.string(),
  isActive: z.boolean(),
  isDismissible: z.boolean(),
  startsAt: z.iso.datetime({offset: true}),
  endsAt: z.iso.datetime({offset: true}).nullable(),
  translations: z.array(
    z.object({
      id: CmsIdentifierSchema,
      locale: z.enum(["id", "en", "ar"]),
      title: z.string(),
      message: z.string(),
    }),
  ),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

const ServiceEndpointViewSchema = z.object({
  id: CmsIdentifierSchema,
  slug: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  ownerId: z.string().nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
}).strict();

const ServiceIncidentViewSchema = z.object({
  id: CmsIdentifierSchema,
  serviceEndpointId: CmsIdentifierSchema,
  severity: z.string(),
  status: z.string(),
  startedAt: z.iso.datetime({offset: true}),
  resolvedAt: z.iso.datetime({offset: true}).nullable(),
}).strict();

const PublicActiveAlertSchema = z.object({
  id: CmsIdentifierSchema,
  severity: z.string(),
  audience: z.string(),
  isDismissible: z.boolean(),
  startsAt: z.iso.datetime({offset: true}),
  endsAt: z.iso.datetime({offset: true}).nullable(),
  title: z.string(),
  message: z.string(),
  resolvedLocale: z.enum(["id", "en", "ar"]),
  isFallback: z.boolean(),
}).strict();

const PublicServiceStatusSchema = z.object({
  endpoints: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      status: z.string(),
      activeIncidents: z.number().int().min(0),
      lastUpdated: z.iso.datetime({offset: true}).nullable(),
    }),
  ),
  overallStatus: z.enum(["OPERATIONAL", "DEGRADED", "PARTIAL_OUTAGE", "MAJOR_OUTAGE"]),
}).strict();

export const AlertsListQuerySchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  search: z.string().trim().max(120).default(""),
  direction: z.enum(["ASC", "DESC"]).default("DESC"),
  resource: z.enum(["SITE_ALERT", "SERVICE_ENDPOINT", "SERVICE_INCIDENT"]),
}).strict();

const RawAlertsListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["SITE_ALERT", "SERVICE_ENDPOINT", "SERVICE_INCIDENT"]),
}).strict();

const AlertsFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "SLUG_CONFLICT",
  "UNAVAILABLE",
]);

const AlertsMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    id: CmsIdentifierSchema,
    version: z.number().int().positive().nullable(),
  }).strict(),
  z.object({ok: z.literal(false), code: AlertsFailureCodeSchema}).strict(),
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

export function normalizeAlertsListSearchParams(params: URLSearchParams) {
  try {
    const entries: Record<string, string> = {};
    for (const [key, value] of params.entries()) entries[key] = value;
    const raw = RawAlertsListQuerySchema.parse(entries);
    return {
      ok: true as const,
      data: AlertsListQuerySchema.parse({
        page: raw.page === undefined ? 1 : Number(raw.page),
        pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
        search: raw.search ?? "",
        direction: raw.direction ?? "DESC",
        resource: raw.resource,
      }),
    };
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listSiteAlerts(
  prisma: AlertsDatabase,
  rawActor: unknown,
  query: z.infer<typeof AlertsListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      OR: [
        {translations: {some: {title: {contains: query.search, mode: "insensitive" as const}}}},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.siteAlert.findMany({
        where: searchFilter,
        orderBy: [{startsAt: direction}, {id: "asc"}],
        ...pagination,
        include: {translations: true},
      }),
      prisma.siteAlert.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      SiteAlertViewSchema.parse({
        id: row.id,
        severity: row.severity,
        audience: row.audience,
        isActive: row.isActive,
        isDismissible: row.isDismissible,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt?.toISOString() ?? null,
        translations: row.translations.map((t) => ({
          id: t.id,
          locale: t.locale,
          title: t.title,
          message: t.message,
        })),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createSiteAlert(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof SiteAlertInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = SiteAlertInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.siteAlert.create({
        data: {
          severity: parsed.data.severity,
          audience: parsed.data.audience,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          isDismissible: parsed.data.isDismissible,
          isActive: parsed.data.isActive,
          translations: {
            create: parsed.data.translations.map((t) => ({
              locale: t.locale,
              title: t.title,
              message: t.message,
            })),
          },
        },
        select: {id: true},
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "SiteAlert",
          resourceId: row.id,
        },
      });
      return AlertsMutationResultSchema.parse({
        ok: true,
        id: row.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateSiteAlert(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof SiteAlertUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = SiteAlertUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.siteAlert.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.siteAlert.update({
        where: {id: parsed.data.id},
        data: {
          severity: parsed.data.severity,
          audience: parsed.data.audience,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          isDismissible: parsed.data.isDismissible,
          isActive: parsed.data.isActive,
        },
      });

      await tx.siteAlertTranslation.deleteMany({
        where: {
          siteAlertId: parsed.data.id,
          locale: {notIn: parsed.data.translations.map((t) => t.locale)},
        },
      });

      for (const translation of parsed.data.translations) {
        await tx.siteAlertTranslation.upsert({
          where: {
            siteAlertId_locale: {
              siteAlertId: parsed.data.id,
              locale: translation.locale,
            },
          },
          create: {
            siteAlertId: parsed.data.id,
            locale: translation.locale,
            title: translation.title,
            message: translation.message,
          },
          update: {
            title: translation.title,
            message: translation.message,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "SiteAlert",
          resourceId: parsed.data.id,
        },
      });

      return AlertsMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deleteSiteAlert(
  prisma: AlertsDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.siteAlert.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.siteAlert.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "SiteAlert",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return AlertsMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listServiceEndpoints(
  prisma: AlertsDatabase,
  rawActor: unknown,
  query: z.infer<typeof AlertsListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      OR: [
        {slug: {contains: query.search, mode: "insensitive" as const}},
        {name: {contains: query.search, mode: "insensitive" as const}},
      ],
    };

    const [rows, total] = await prisma.$transaction([
      prisma.serviceEndpoint.findMany({
        where: searchFilter,
        orderBy: [{slug: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.serviceEndpoint.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      ServiceEndpointViewSchema.parse({
        id: row.id,
        slug: row.slug,
        name: row.name,
        url: row.url,
        ownerId: row.ownerId,
        isPublic: row.isPublic,
        isActive: row.isActive,
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createServiceEndpoint(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof ServiceEndpointInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = ServiceEndpointInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.serviceEndpoint.create({
        data: parsed.data,
        select: {id: true},
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "ServiceEndpoint",
          resourceId: row.id,
        },
      });
      return AlertsMutationResultSchema.parse({
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

export async function updateServiceEndpoint(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof ServiceEndpointUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = ServiceEndpointUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceEndpoint.findUnique({
        where: {id: parsed.data.id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.serviceEndpoint.update({
        where: {id: parsed.data.id},
        data: {
          slug: parsed.data.slug,
          name: parsed.data.name,
          url: parsed.data.url,
          ownerId: parsed.data.ownerId,
          isPublic: parsed.data.isPublic,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "ServiceEndpoint",
          resourceId: parsed.data.id,
        },
      });

      return AlertsMutationResultSchema.parse({
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

export async function deleteServiceEndpoint(
  prisma: AlertsDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceEndpoint.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      const incidentCount = await tx.serviceIncident.count({
        where: {serviceEndpointId: id},
      });
      if (incidentCount > 0) return {ok: false, code: "SLUG_CONFLICT"} as const;
      await tx.serviceEndpoint.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "ServiceEndpoint",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return AlertsMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listServiceIncidents(
  prisma: AlertsDatabase,
  rawActor: unknown,
  query: z.infer<typeof AlertsListQuerySchema>,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const direction = query.direction.toLowerCase() as "asc" | "desc";
    const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
    const searchFilter = query.search === "" ? {} : {
      translations: {some: {title: {contains: query.search, mode: "insensitive" as const}}},
    };

    const [rows, total] = await prisma.$transaction([
      prisma.serviceIncident.findMany({
        where: searchFilter,
        orderBy: [{startedAt: direction}, {id: "asc"}],
        ...pagination,
      }),
      prisma.serviceIncident.count({where: searchFilter}),
    ]);

    const items = rows.map((row) =>
      ServiceIncidentViewSchema.parse({
        id: row.id,
        serviceEndpointId: row.serviceEndpointId,
        severity: row.severity,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
      }),
    );

    return {ok: true as const, data: {items, page: pageMetadata(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function createServiceIncident(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof ServiceIncidentInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = ServiceIncidentInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const endpoint = await tx.serviceEndpoint.findUnique({
        where: {id: parsed.data.endpointId},
        select: {id: true},
      });
      if (!endpoint) return {ok: false, code: "NOT_FOUND"} as const;

      const row = await tx.serviceIncident.create({
        data: {
          serviceEndpointId: parsed.data.endpointId,
          severity: parsed.data.severity,
          status: parsed.data.status,
          startedAt: now,
          resolvedAt: parsed.data.status === "RESOLVED" ? now : null,
        },
        select: {id: true},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "ServiceIncident",
          resourceId: row.id,
        },
      });
      return AlertsMutationResultSchema.parse({
        ok: true,
        id: row.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function updateServiceIncident(
  prisma: AlertsDatabase,
  rawActor: unknown,
  input: z.infer<typeof ServiceIncidentUpdateInputSchema>,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  const parsed = ServiceIncidentUpdateInputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceIncident.findUnique({
        where: {id: parsed.data.id},
        select: {id: true, serviceEndpointId: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;

      const endpoint = await tx.serviceEndpoint.findUnique({
        where: {id: parsed.data.endpointId},
        select: {id: true},
      });
      if (!endpoint) return {ok: false, code: "NOT_FOUND"} as const;

      await tx.serviceIncident.update({
        where: {id: parsed.data.id},
        data: {
          serviceEndpointId: parsed.data.endpointId,
          severity: parsed.data.severity,
          status: parsed.data.status,
          resolvedAt: parsed.data.status === "RESOLVED" ? now : null,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "ServiceIncident",
          resourceId: parsed.data.id,
        },
      });

      return AlertsMutationResultSchema.parse({
        ok: true,
        id: parsed.data.id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function deleteServiceIncident(
  prisma: AlertsDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceIncident.findUnique({
        where: {id},
        select: {id: true},
      });
      if (!existing) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.serviceIncident.delete({where: {id}});
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "ServiceIncident",
          resourceId: id,
          metadata: {operation: "DELETE"},
        },
      });
      return AlertsMutationResultSchema.parse({
        ok: true,
        id,
        version: null,
      });
    });
  } catch {
    return {ok: false, code: "UNAVAILABLE"} as const;
  }
}

export async function listActiveAlerts(
  prisma: AlertsDatabase,
  locale: Locale,
  audience: z.infer<typeof AlertAudienceSchema>,
  now = new Date(),
) {
  try {
    const rows = await prisma.siteAlert.findMany({
      where: {
        isActive: true,
        startsAt: {lte: now},
        OR: [{endsAt: null}, {endsAt: {gte: now}}],
        audience: {in: [audience, "ALL"]},
      },
      include: {
        translations: {
          where: {
            locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
          },
        },
      },
      orderBy: {severity: "asc"},
    });

    const items = rows.flatMap((row) => {
      const exact = row.translations.find((t) => t.locale === locale);
      const fallback = row.translations.find((t) => t.locale === "id");
      const translation = exact ?? fallback;
      if (!translation) return [];
      const parsed = PublicActiveAlertSchema.safeParse({
        id: row.id,
        severity: row.severity,
        audience: row.audience,
        isDismissible: row.isDismissible,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt?.toISOString() ?? null,
        title: translation.title,
        message: translation.message,
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

export async function listServiceStatus(
  prisma: AlertsDatabase,
) {
  try {
    const endpoints = await prisma.serviceEndpoint.findMany({
      where: {isPublic: true},
      orderBy: {slug: "asc"},
      include: {
        incidents: {
          where: {status: {not: "RESOLVED"}},
          select: {id: true},
        },
      },
    });

    const endpointViews = endpoints.map((ep) => ({
      slug: ep.slug,
      name: ep.name,
      status: "OPERATIONAL",
      activeIncidents: ep.incidents.length,
      lastUpdated: null,
    }));

    const overallStatus: "OPERATIONAL" | "DEGRADED" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE" = "OPERATIONAL";

    return {
      ok: true as const,
      data: PublicServiceStatusSchema.parse({
        endpoints: endpointViews,
        overallStatus,
      }),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function alertsHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["SLUG_CONFLICT"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
