import {z} from "zod";

import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type AdmissionDatabase = ReturnType<typeof createPrismaClient>;

type Locale = "id" | "en" | "ar";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));

const UNSAFE_URL_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const ENCODED_CONTROL_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|7f|8[0-9a-f]|9[0-9a-f])/iu;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (
    normalized.includes(":")
    && (
      normalized === "::1"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || normalized.startsWith("fe80:")
    )
  ) return true;
  const octets = normalized.split(".").map(Number);
  if (
    octets.length !== 4
    || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) return false;
  return (
    octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || octets.every((octet) => octet === 0)
  );
}

function isValidSourceUrl(value: string) {
  if (
    UNSAFE_URL_TEXT_PATTERN.test(value)
    || ENCODED_CONTROL_PATTERN.test(value)
    || value.includes("\\")
  ) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!url.hostname || url.hostname.length === 0) return false;
    if (url.username || url.password) return false;
    if (url.hash) return false;

    const domain = url.hostname.toLowerCase();
    const allowedDomains = [
      "uinbanten.ac.id",
      "sbmptn.id",
      "snmptn.ac.id",
      "kemdikbud.go.id",
      "kemenag.go.id",
      "dikti.kemdikbud.go.id",
      "spmb.uinbanten.ac.id",
      "pmb.uinbanten.ac.id",
    ];

    const isAllowed = allowedDomains.some(
      (d) => domain === d || domain.endsWith(`.${d}`),
    );
    if (!isAllowed) return false;

    return !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

const SourceUrlSchema = z.string().min(1).max(2048).refine(
  isValidSourceUrl,
  "Source URL must be an HTTPS URL from a safe domain.",
);

const AdmissionTranslationInputSchema = z.object({
  locale: z.enum(["id", "en", "ar"]),
  title: RequiredText(255),
  content: RequiredText(100_000),
}).strict();

const AdmissionInfoInputSchema = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  sourceUrl: SourceUrlSchema,
  reviewDueAt: z.iso.datetime({offset: true}).nullable(),
  expiresAt: z.iso.datetime({offset: true}).nullable(),
  isActive: z.boolean().default(true),
  translations: z.array(AdmissionTranslationInputSchema).min(1).max(3),
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

const AdmissionGovernanceInputSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  reviewDueAt: z.iso.datetime({offset: true}).nullable(),
  expiresAt: z.iso.datetime({offset: true}).nullable(),
}).strict();

const AdmissionPaginationSchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
});

const RawAdmissionPaginationSchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
}).strict();

const AdmissionPaginationMetadataSchema = z.object({
  page: z.number().int().min(1).max(10000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  total: z.number().int().min(0).max(2_147_483_647),
  totalPages: z.number().int().min(0).max(214_748_365),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const AdmissionTranslationAdminViewSchema = z.object({
  locale: z.enum(["id", "en", "ar"]),
  title: RequiredText(255),
  content: RequiredText(100_000),
  status: z.enum(["DRAFT", "REVIEWED", "PUBLISHED", "STALE"]),
  sourceVersion: z.number().int().positive().max(2_147_483_647),
});

const AdmissionInfoAdminViewSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  sourceUrl: SourceUrlSchema,
  isActive: z.boolean(),
  lastReviewedAt: z.iso.datetime({offset: true}),
  reviewDueAt: z.iso.datetime({offset: true}).nullable(),
  expiresAt: z.iso.datetime({offset: true}).nullable(),
  translations: z.array(AdmissionTranslationAdminViewSchema),
});

const AdmissionInfoListResultSchema = z.object({
  items: z.array(AdmissionInfoAdminViewSchema).max(50),
  page: AdmissionPaginationMetadataSchema,
});

const AdmissionPublicItemSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  sourceUrl: SourceUrlSchema,
  title: RequiredText(255),
  content: RequiredText(100_000),
  requestedLocale: z.enum(["id", "en", "ar"]),
  resolvedLocale: z.enum(["id", "en", "ar"]),
  isFallback: z.boolean(),
});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const AdmissionFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "SLUG_CONFLICT",
  "URL_INVALID",
  "UNAVAILABLE",
]);

type AdmissionInfoInput = z.infer<typeof AdmissionInfoInputSchema>;
type AdmissionPagination = z.infer<typeof AdmissionPaginationSchema>;
type AdmissionFailureCode = z.infer<typeof AdmissionFailureCodeSchema>;

type AdmissionResult<T> =
  | {ok: true; data: T}
  | {ok: false; code: AdmissionFailureCode};

const TrustedAdminActorSchema = z.object({
  userId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  role: z.literal("ADMIN"),
  expiresAt: z.date(),
}).strict();

const TRANSLATION_SELECT = {
  locale: true,
  title: true,
  content: true,
  status: true,
  sourceVersion: true,
} as const;

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function isPrismaCode(error: unknown, code: string) {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError
    && error.code === code
  );
}

function uniqueFailure(error: unknown): AdmissionResult<never> {
  if (!isPrismaCode(error, "P2002")) return {ok: false, code: "UNAVAILABLE"};
  const target =
    error instanceof PrismaNamespace.PrismaClientKnownRequestError
      ? String(error.meta?.target ?? "")
      : "";
  return {
    ok: false,
    code: target.toLowerCase().includes("slug") ? "SLUG_CONFLICT" : "UNAVAILABLE",
  };
}

function pageMeta(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return AdmissionPaginationMetadataSchema.parse({
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
}

function translationState(actorId: string, now: Date) {
  return {
    status: "PUBLISHED" as const,
    reviewerId: actorId,
    reviewedAt: now,
  };
}

function adminView(row: {
  id: string;
  slug: string;
  sourceUrl: string;
  isActive: boolean;
  lastReviewedAt: Date;
  reviewDueAt: Date | null;
  expiresAt: Date | null;
  translations: Array<{
    locale: Locale;
    title: string;
    content: string;
    status: string;
    sourceVersion: number;
  }>;
}) {
  return AdmissionInfoAdminViewSchema.parse({
    id: row.id,
    slug: row.slug,
    sourceUrl: row.sourceUrl,
    isActive: row.isActive,
    lastReviewedAt: row.lastReviewedAt.toISOString(),
    reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    translations: row.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      content: t.content,
      status: t.status,
      sourceVersion: t.sourceVersion,
    })),
  });
}

function resolvedTranslation<T extends {locale: Locale; title: string; content: string}>(
  translations: T[],
  requestedLocale: Locale,
) {
  const exact = translations.find((t) => t.locale === requestedLocale);
  const fallback = translations.find((t) => t.locale === "id");
  const resolved = exact ?? fallback;
  if (!resolved) return null;
  return {
    resolved,
    requestedLocale,
    resolvedLocale: resolved.locale,
    isFallback: resolved.locale !== requestedLocale,
  };
}

export function normalizeAdmissionPagination(
  params: URLSearchParams,
): AdmissionPagination | {ok: false; code: "REQUEST_INVALID"} {
  try {
    const raw = RawAdmissionPaginationSchema.parse(
      Object.fromEntries(params.entries()),
    );
    return AdmissionPaginationSchema.parse({
      page: raw.page === undefined ? 1 : Number(raw.page),
      pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
    });
  } catch {
    return {ok: false, code: "REQUEST_INVALID"};
  }
}

export async function listAdmissionInfos(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  rawPagination: unknown,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoListResultSchema>>> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AdmissionPaginationSchema.safeParse(rawPagination);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {page, pageSize} = parsed.data;
  const skip = (page - 1) * pageSize;

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.admissionInfo.findMany({
        skip,
        take: pageSize,
        orderBy: {lastReviewedAt: "desc"},
        include: {translations: {select: TRANSLATION_SELECT}},
      }),
      prisma.admissionInfo.count(),
    ]);

    const items = rows.map(adminView);
    return {
      ok: true,
      data: AdmissionInfoListResultSchema.parse({
        items,
        page: pageMeta(page, pageSize, total),
      }),
    };
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function getAdmissionInfo(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  id: string,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoAdminViewSchema>>> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};

  try {
    const row = await prisma.admissionInfo.findUnique({
      where: {id},
      include: {translations: {select: TRANSLATION_SELECT}},
    });

    if (!row) return {ok: false, code: "NOT_FOUND"};
    return {ok: true, data: adminView(row)};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function createAdmissionInfo(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  input: AdmissionInfoInput,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const validated = AdmissionInfoInputSchema.parse(input);
    const state = translationState(actor.userId, now);

    const row = await prisma.$transaction(async (tx) => {
      const info = await tx.admissionInfo.create({
        data: {
          slug: validated.slug,
          sourceUrl: validated.sourceUrl,
          isActive: validated.isActive,
          lastReviewedAt: now,
          reviewDueAt: validated.reviewDueAt ? new Date(validated.reviewDueAt) : null,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
          translations: {
            create: validated.translations.map((t) => ({
              locale: t.locale,
              title: t.title,
              content: t.content,
              status: state.status,
              reviewerId: state.reviewerId,
              reviewedAt: state.reviewedAt,
              sourceVersion: 1,
            })),
          },
        },
        include: {translations: {select: TRANSLATION_SELECT}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "AdmissionInfo",
          resourceId: info.id,
        },
      });

      return info;
    });

    return {ok: true, data: adminView(row)};
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function updateAdmissionInfo(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  id: string,
  input: AdmissionInfoInput,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const validated = AdmissionInfoInputSchema.parse(input) as z.infer<typeof AdmissionInfoInputSchema>;
    const existing = await prisma.admissionInfo.findUnique({
      where: {id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"};

    const state = translationState(actor.userId, now);
    const locales = validated.translations.map((t) => t.locale);

    const row = await prisma.$transaction(async (tx) => {
      await tx.admissionInfoTranslation.deleteMany({
        where: {admissionInfoId: id, locale: {notIn: locales}},
      });

      for (const trans of validated.translations) {
        await tx.admissionInfoTranslation.upsert({
          where: {
            admissionInfoId_locale: {admissionInfoId: id, locale: trans.locale},
          },
          create: {
            admissionInfoId: id,
            locale: trans.locale,
            title: trans.title,
            content: trans.content,
            status: state.status,
            reviewerId: state.reviewerId,
            reviewedAt: state.reviewedAt,
            sourceVersion: 1,
          },
          update: {
            title: trans.title,
            content: trans.content,
            status: state.status,
            reviewerId: state.reviewerId,
            reviewedAt: state.reviewedAt,
            sourceVersion: {increment: 1},
          },
        });
      }

      const info = await tx.admissionInfo.update({
        where: {id},
        data: {
          slug: validated.slug,
          sourceUrl: validated.sourceUrl,
          isActive: validated.isActive,
          reviewDueAt: validated.reviewDueAt ? new Date(validated.reviewDueAt) : null,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
          lastReviewedAt: now,
        },
        include: {translations: {select: TRANSLATION_SELECT}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "AdmissionInfo",
          resourceId: id,
        },
      });

      return info;
    });

    return {ok: true, data: adminView(row)};
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function setAdmissionActivation(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  id: string,
  isActive: boolean,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const existing = await prisma.admissionInfo.findUnique({
      where: {id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"};

    const row = await prisma.$transaction(async (tx) => {
      const info = await tx.admissionInfo.update({
        where: {id},
        data: {isActive},
        include: {translations: {select: TRANSLATION_SELECT}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "AdmissionInfo",
          resourceId: id,
          metadata: {operation: isActive ? "ACTIVATE" : "DEACTIVATE"},
        },
      });

      return info;
    });

    return {ok: true, data: adminView(row)};
  } catch (error) {
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function reviewAdmissionInfo(
  prisma: AdmissionDatabase,
  rawActor: unknown,
  input: z.infer<typeof AdmissionGovernanceInputSchema>,
  now = new Date(),
): Promise<AdmissionResult<z.infer<typeof AdmissionInfoAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const validated = AdmissionGovernanceInputSchema.parse(input);
    const existing = await prisma.admissionInfo.findUnique({
      where: {id: validated.id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"};

    const row = await prisma.$transaction(async (tx) => {
      const info = await tx.admissionInfo.update({
        where: {id: validated.id},
        data: {
          lastReviewedAt: now,
          reviewDueAt: validated.reviewDueAt ? new Date(validated.reviewDueAt) : null,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        },
        include: {translations: {select: TRANSLATION_SELECT}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "AdmissionInfo",
          resourceId: validated.id,
          metadata: {operation: "GOVERNANCE_REVIEW"},
        },
      });

      return info;
    });

    return {ok: true, data: adminView(row)};
  } catch (error) {
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function listActiveAdmissionInfos(
  prisma: AdmissionDatabase,
  locale: Locale,
): Promise<AdmissionResult<z.infer<typeof AdmissionPublicItemSchema>[]>> {
  try {
    const rows = await prisma.admissionInfo.findMany({
      where: {isActive: true},
      orderBy: {lastReviewedAt: "desc"},
      include: {
        translations: {
          where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}},
          select: {locale: true, title: true, content: true},
        },
      },
    });

    const items = rows.flatMap((row) => {
      const rt = resolvedTranslation(row.translations as Array<{locale: Locale; title: string; content: string}>, locale);
      if (!rt) return [];

      const parsed = AdmissionPublicItemSchema.safeParse({
        id: row.id,
        slug: row.slug,
        sourceUrl: row.sourceUrl,
        title: rt.resolved.title,
        content: rt.resolved.content,
        requestedLocale: rt.requestedLocale,
        resolvedLocale: rt.resolvedLocale,
        isFallback: rt.isFallback,
      });

      return parsed.success ? [parsed.data] : [];
    });

    return {ok: true, data: items};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function admissionHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "SLUG_CONFLICT" || result.code === "URL_INVALID") return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
