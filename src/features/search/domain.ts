import {z} from "zod";

import {institution} from "@/config/institution";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type SearchDatabase = ReturnType<typeof createPrismaClient>;

type Locale = "id" | "en" | "ar";

const SUPPORTED_LOCALES: readonly Locale[] = ["id", "en", "ar"] as const;

const RESOURCE_TYPE_SCHEMA = z.enum([
  "POST",
  "STUDY_PROGRAM",
  "LECTURER",
  "DOCUMENT",
  "EVENT",
  "SERVICE",
  "PARTNERSHIP",
]);

export type SearchResourceType = z.infer<typeof RESOURCE_TYPE_SCHEMA>;

const SEARCHABLE_POST_TYPES = ["BERITA", "PENGUMUMAN", "KOLOM"] as const;
const PUBLIC_STUDY_PROGRAM_CODES: string[] = institution.studyPrograms.map((program) => program.code);

const SEARCH_QUERY_SCHEMA = z.object({
  query: z.string().trim().min(1).max(200),
  locale: z.enum(SUPPORTED_LOCALES).default("id"),
  resourceTypes: z.array(RESOURCE_TYPE_SCHEMA).min(1).max(7).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
}).strict();

const SEARCH_RESULT_ITEM_SCHEMA = z.object({
  type: RESOURCE_TYPE_SCHEMA,
  id: z.string().min(1).max(191),
  title: z.string().min(1).max(500),
  excerpt: z.string().max(200),
  slug: z.string().min(1).max(191),
  relevanceScore: z.number().min(0).max(1),
});

export type SearchQuery = z.infer<typeof SEARCH_QUERY_SCHEMA>;
export type SearchResultItem = z.infer<typeof SEARCH_RESULT_ITEM_SCHEMA>;
export type SearchResult =
  | {ok: true; items: SearchResultItem[]; page: {page: number; pageSize: 10 | 20 | 50; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean}}
  | {ok: false; code: "REQUEST_INVALID" | "UNAVAILABLE"};

function snippet(text: string | null | undefined, maxChars = 200): string {
  if (!text) return "";
  const stripped = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxChars - 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

function resolveTranslation<T extends {locale: Locale; status: string}>(
  translations: T[],
  requestedLocale: Locale,
): T | undefined {
  const exact = translations.find((t) => t.locale === requestedLocale && t.status === "PUBLISHED");
  if (exact) return exact;
  if (requestedLocale !== "id") {
    return translations.find((t) => t.locale === "id" && t.status === "PUBLISHED");
  }
  return undefined;
}

function pageMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
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

async function searchPosts(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.PostWhereInput = {
    type: {in: [...SEARCHABLE_POST_TYPES]},
    status: "PUBLISHED",
    publishedAt: {not: null},
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        OR: [
          {title: {contains: query, mode: "insensitive"}},
          {excerpt: {contains: query, mode: "insensitive"}},
        ],
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip,
      take,
      orderBy: [{publishedAt: "desc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.post.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "POST",
      id: row.id,
      title: translation.title,
      excerpt: snippet(translation.excerpt),
      slug: row.slug,
      relevanceScore: 1.0,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchStudyPrograms(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.StudyProgramWhereInput = {
    isActive: true,
    code: {in: PUBLIC_STUDY_PROGRAM_CODES},
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        OR: [
          {name: {contains: query, mode: "insensitive"}},
          {description: {contains: query, mode: "insensitive"}},
        ],
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.studyProgram.findMany({
      where,
      skip,
      take,
      orderBy: [{order: "asc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.studyProgram.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "STUDY_PROGRAM",
      id: row.id,
      title: translation.name,
      excerpt: snippet(translation.description),
      slug: row.slug,
      relevanceScore: 0.9,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchLecturers(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.LecturerWhereInput = {
    isActive: true,
    OR: [
      {name: {contains: query, mode: "insensitive"}},
      {email: {contains: query, mode: "insensitive"}},
      {
        translations: {
          some: {
            status: "PUBLISHED",
            locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
            OR: [
              {position: {contains: query, mode: "insensitive"}},
              {expertise: {contains: query, mode: "insensitive"}},
            ],
          },
        },
      },
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.lecturer.findMany({
      where,
      skip,
      take,
      orderBy: [{order: "asc"}, {name: "asc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.lecturer.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    const excerpt = translation
      ? [translation.position, translation.expertise].filter(Boolean).join(" · ")
      : row.email ?? "";
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "LECTURER",
      id: row.id,
      title: row.name,
      excerpt: snippet(excerpt),
      slug: row.slug,
      relevanceScore: 0.8,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchDocuments(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.DocumentWhereInput = {
    storageClass: "PUBLIC",
    publishedAt: {not: null},
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        title: {contains: query, mode: "insensitive"},
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: [{publishedAt: "desc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.document.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "DOCUMENT",
      id: row.id,
      title: translation.title,
      excerpt: snippet(translation.category),
      slug: row.slug,
      relevanceScore: 0.7,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchEvents(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    isPublished: true,
    startAt: {lte: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)},
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        title: {contains: query, mode: "insensitive"},
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      skip,
      take,
      orderBy: [{startAt: "asc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.event.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "EVENT",
      id: row.id,
      title: translation.title,
      excerpt: snippet(translation.description),
      slug: row.slug,
      relevanceScore: 0.7,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchServices(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.ServiceWhereInput = {
    isActive: true,
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        name: {contains: query, mode: "insensitive"},
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      skip,
      take,
      orderBy: [{order: "asc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.service.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "SERVICE",
      id: row.id,
      title: translation.name,
      excerpt: snippet(translation.description),
      slug: row.slug,
      relevanceScore: 0.6,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

async function searchPartnerships(
  prisma: SearchDatabase,
  query: string,
  locale: Locale,
  skip: number,
  take: number,
): Promise<{items: SearchResultItem[]; total: number}> {
  const where: Prisma.PartnershipWhereInput = {
    isActive: true,
    translations: {
      some: {
        status: "PUBLISHED",
        locale: {in: locale === "id" ? ["id"] : [locale, "id"]},
        description: {contains: query, mode: "insensitive"},
      },
    },
  };

  const [rows, total] = await prisma.$transaction([
    prisma.partnership.findMany({
      where,
      skip,
      take,
      orderBy: [{order: "asc"}, {id: "asc"}],
      include: {translations: {where: {status: "PUBLISHED"}}},
    }),
    prisma.partnership.count({where}),
  ]);

  const items = rows.flatMap((row): SearchResultItem[] => {
    const translation = resolveTranslation(row.translations, locale);
    if (!translation) return [];
    const parsed = SEARCH_RESULT_ITEM_SCHEMA.safeParse({
      type: "PARTNERSHIP",
      id: row.id,
      title: row.partnerName,
      excerpt: snippet(translation.description),
      slug: row.slug,
      relevanceScore: 0.6,
    });
    return parsed.success ? [parsed.data] : [];
  });

  return {items, total};
}

const SEARCHERS: Record<
  SearchResourceType,
  (prisma: SearchDatabase, query: string, locale: Locale, skip: number, take: number) => Promise<{items: SearchResultItem[]; total: number}>
> = {
  POST: searchPosts,
  STUDY_PROGRAM: searchStudyPrograms,
  LECTURER: searchLecturers,
  DOCUMENT: searchDocuments,
  EVENT: searchEvents,
  SERVICE: searchServices,
  PARTNERSHIP: searchPartnerships,
};

export function normalizeSearchQuery(
  params: URLSearchParams,
): {ok: true; query: SearchQuery} | {ok: false; code: "REQUEST_INVALID"} {
  try {
    const rawResourceTypes = params.get("resourceTypes");
    const resourceTypes = rawResourceTypes
      ? rawResourceTypes.split(",").map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)
      : undefined;

    const query = SEARCH_QUERY_SCHEMA.parse({
      query: params.get("q") ?? "",
      locale: params.get("locale") ?? "id",
      resourceTypes: resourceTypes ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : 1,
      pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 20,
    });
    return {ok: true, query};
  } catch {
    return {ok: false, code: "REQUEST_INVALID"};
  }
}

export async function searchPublicContent(
  prisma: SearchDatabase,
  rawQuery: unknown,
): Promise<SearchResult> {
  const parsed = SEARCH_QUERY_SCHEMA.safeParse(rawQuery);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};

  const {query, locale, resourceTypes, page, pageSize} = parsed.data;
  const types = resourceTypes ?? Object.keys(SEARCHERS) as SearchResourceType[];
  const pagination = {skip: (page - 1) * pageSize, take: pageSize};

  try {
    const results = await Promise.all(
      types.map((type) => SEARCHERS[type](prisma, query, locale, pagination.skip, pagination.take)),
    );

    const allItems = results
      .flatMap((r) => r.items)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, pageSize);

    const total = results.reduce((sum, r) => sum + r.total, 0);

    return {
      ok: true,
      items: allItems,
      page: pageMetadata(page, pageSize, total),
    };
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function searchHttpStatus(result: SearchResult): number {
  if (result.ok) return 200;
  if (result.code === "REQUEST_INVALID") return 400;
  return 503;
}
