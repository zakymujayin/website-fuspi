import type {Prisma} from "@/generated/prisma/client";

import {PublicMediaViewSchema} from "@/contracts/media";
import {
  PublicPostDetailQuerySchema,
  PublicPostListQuerySchema,
  PublicPostListResultSchema,
  PublicPostViewSchema,
  type PublicPostListResult,
  type PublicPostView,
} from "@/contracts/post";
import {StorageKeySchema} from "@/contracts/storage";
import {createPrismaClient} from "@/lib/db/client";

export type PublicPostQueryDatabase = ReturnType<typeof createPrismaClient>;
export type PublicPostQueryClock = () => Date;

export type PublicPostListQueryResult =
  | {ok: true; data: PublicPostListResult}
  | {ok: false; code: "INVALID_QUERY" | "QUERY_UNAVAILABLE"};

export type PublicPostDetailQueryResult =
  | {ok: true; data: PublicPostView}
  | {ok: false; code: "NOT_FOUND"};

type PublicPostRow = {
  id: string;
  type: "BERITA" | "PENGUMUMAN" | "INFORMASI" | "KOLOM";
  columnType: "DEKAN" | "DOSEN" | "MAHASISWA" | null;
  slug: string;
  isFeatured: boolean;
  publishedAt: Date | null;
  author: {name: string} | null;
  category: {slug: string} | null;
  coverMedia: {
    id: string;
    storageKey: string;
    storageClass: "PUBLIC" | "PRIVATE" | "PPKS_PRIVATE";
    mimeType: string;
    size: number;
    alt: string | null;
    isDecorative: boolean;
    width: number | null;
    height: number | null;
    focalX: number | null;
    focalY: number | null;
  } | null;
  images: Array<{
    id: string;
    caption: string | null;
    media: {
      id: string;
      storageKey: string;
      storageClass: "PUBLIC" | "PRIVATE" | "PPKS_PRIVATE";
      mimeType: string;
      size: number;
      alt: string | null;
      isDecorative: boolean;
      width: number | null;
      height: number | null;
      focalX: number | null;
      focalY: number | null;
    };
  }>;
  translations: Array<{
    locale: "id" | "en" | "ar";
    title: string;
    excerpt: string | null;
    content: string;
    metaTitle: string | null;
    metaDesc: string | null;
    coverCaption: string | null;
  }>;
};

const SYSTEM_CLOCK: PublicPostQueryClock = () => new Date();

const PUBLIC_POST_SELECT = {
  id: true,
  type: true,
  columnType: true,
  slug: true,
  isFeatured: true,
  publishedAt: true,
  author: {select: {name: true}},
  category: {select: {slug: true}},
  coverMedia: {
    select: {
      id: true,
      storageKey: true,
      storageClass: true,
      mimeType: true,
      size: true,
      alt: true,
      isDecorative: true,
      width: true,
      height: true,
      focalX: true,
      focalY: true,
    },
  },
  images: {
    orderBy: {order: "asc" as const},
    select: {
      id: true,
      caption: true,
      media: {
        select: {
          id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
          alt: true, isDecorative: true, width: true, height: true, focalX: true, focalY: true,
        },
      },
    },
  },
} as const;

function normalizeUploadBase(rawBase: string): string | null {
  if (
    typeof rawBase !== "string"
    || rawBase.length < 1
    || rawBase.length > 2_048
    || rawBase.includes("\\")
    || /[\u0000-\u001f\u007f-\u009f]/u.test(rawBase)
  ) return null;

  try {
    const relative = rawBase.startsWith("/") && !rawBase.startsWith("//");
    const parsed = new URL(rawBase, "https://fuspi.invalid");
    if (
      (!relative && parsed.protocol !== "https:")
      || parsed.username
      || parsed.password
      || parsed.search
      || parsed.hash
    ) return null;
    const pathname = parsed.pathname.replace(/\/+$/u, "");
    if (!pathname || pathname === "/") return null;
    return relative
      ? pathname
      : `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
}

function publicMediaView(
  media: PublicPostRow["coverMedia"],
  uploadBase: string,
) {
  if (
    !media
    || media.storageClass !== "PUBLIC"
    || media.mimeType !== "image/webp"
    || !StorageKeySchema.safeParse(media.storageKey).success
    || media.alt === null
  ) return null;

  const url = `${uploadBase}/${media.storageKey}`;
  const parsed = PublicMediaViewSchema.safeParse({
    id: media.id,
    url,
    mimeType: media.mimeType,
    size: media.size,
    alt: media.alt,
    isDecorative: media.isDecorative,
    width: media.width,
    height: media.height,
    focalX: media.focalX,
    focalY: media.focalY,
  });
  return parsed.success ? parsed.data : null;
}

function resolveTranslation(
  row: PublicPostRow,
  requestedLocale: "id" | "en" | "ar",
) {
  const exact = row.translations.find(({locale}) => locale === requestedLocale);
  if (exact) {
    return {
      requestedLocale,
      resolvedLocale: requestedLocale,
      isFallback: false,
      value: {
        title: exact.title,
        excerpt: exact.excerpt,
        content: exact.content,
        metaTitle: exact.metaTitle,
        metaDesc: exact.metaDesc,
        coverCaption: exact.coverCaption,
      },
    };
  }
  if (requestedLocale === "id") return null;
  const fallback = row.translations.find(({locale}) => locale === "id");
  return fallback ? {
    requestedLocale,
    resolvedLocale: "id" as const,
    isFallback: true,
    value: {
      title: fallback.title,
      excerpt: fallback.excerpt,
      content: fallback.content,
      metaTitle: fallback.metaTitle,
      metaDesc: fallback.metaDesc,
      coverCaption: fallback.coverCaption,
    },
  } : null;
}

function projectPost(
  row: PublicPostRow,
  requestedLocale: "id" | "en" | "ar",
  uploadBase: string,
): PublicPostView | null {
  if (!row.publishedAt) return null;
  const translation = resolveTranslation(row, requestedLocale);
  if (!translation) return null;
  const parsed = PublicPostViewSchema.safeParse({
    id: row.id,
    type: row.type,
    columnType: row.columnType,
    slug: row.slug,
    isFeatured: row.isFeatured,
    publishedAt: row.publishedAt,
    authorName: row.author?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    cover: publicMediaView(row.coverMedia, uploadBase),
    images: row.images.flatMap((image) => {
      const media = publicMediaView(image.media, uploadBase);
      return media ? [{id: image.id, media, caption: image.caption}] : [];
    }),
    translation,
  });
  return parsed.success ? parsed.data : null;
}

function visibilityWhere(options: {
  type: "BERITA" | "PENGUMUMAN" | "INFORMASI" | "KOLOM";
  now: Date;
}): Prisma.PostWhereInput {
  return {
    type: options.type,
    status: "PUBLISHED",
    publishedAt: {not: null, lte: options.now},
    translations: {
      some: {
        locale: "id",
        status: "PUBLISHED",
      },
    },
  };
}

function translationWhere(requestedLocale: "id" | "en" | "ar") {
  return {
    locale: {
      in: requestedLocale === "id"
        ? ["id" as const]
        : [requestedLocale, "id" as const],
    },
    status: "PUBLISHED" as const,
  };
}

export async function listPublicPosts(
  database: PublicPostQueryDatabase,
  rawQuery: unknown,
  publicUploadBaseUrl: string,
  clock: PublicPostQueryClock = SYSTEM_CLOCK,
): Promise<PublicPostListQueryResult> {
  const query = PublicPostListQuerySchema.safeParse(rawQuery);
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!query.success || !uploadBase) {
    return {ok: false, code: "INVALID_QUERY"};
  }
  const now = clock();
  const where: Prisma.PostWhereInput = {
    ...visibilityWhere({
      type: query.data.type,
      now,
    }),
    ...(query.data.categorySlug
      ? {category: {is: {slug: query.data.categorySlug}}}
      : {}),
    ...(query.data.tagSlug
      ? {tags: {some: {tag: {slug: query.data.tagSlug}}}}
      : {}),
    ...(query.data.columnType
      ? {columnType: query.data.columnType}
      : {}),
  };
  const skip = (query.data.page - 1) * query.data.pageSize;

  try {
    const [rows, total] = await database.$transaction([
      database.post.findMany({
        where,
        select: {
          ...PUBLIC_POST_SELECT,
          translations: {
            where: translationWhere(query.data.locale),
            select: {
              locale: true,
              title: true,
              excerpt: true,
              content: true,
              metaTitle: true,
              metaDesc: true,
              coverCaption: true,
            },
          },
        },
        orderBy: [{publishedAt: "desc"}, {id: "asc"}],
        skip,
        take: query.data.pageSize,
      }),
      database.post.count({where}),
    ]);

    const items = rows.map((row) =>
      projectPost(row as PublicPostRow, query.data.locale, uploadBase));
    if (items.some((item) => item === null)) {
      return {ok: false, code: "QUERY_UNAVAILABLE"};
    }
    const result = PublicPostListResultSchema.safeParse({
      items,
      page: query.data.page,
      pageSize: query.data.pageSize,
      total,
      hasNextPage: skip + rows.length < total,
    });
    return result.success
      ? {ok: true, data: result.data}
      : {ok: false, code: "QUERY_UNAVAILABLE"};
  } catch {
    return {ok: false, code: "QUERY_UNAVAILABLE"};
  }
}

export async function getPublicPostDetail(
  database: PublicPostQueryDatabase,
  rawQuery: unknown,
  publicUploadBaseUrl: string,
  clock: PublicPostQueryClock = SYSTEM_CLOCK,
): Promise<PublicPostDetailQueryResult> {
  const query = PublicPostDetailQuerySchema.safeParse(rawQuery);
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!query.success || !uploadBase) return {ok: false, code: "NOT_FOUND"};

  try {
    const row = await database.post.findFirst({
      where: {
        ...visibilityWhere({
          type: query.data.type,
          now: clock(),
        }),
        slug: query.data.slug,
      },
      select: {
        ...PUBLIC_POST_SELECT,
        translations: {
          where: translationWhere(query.data.locale),
          select: {
            locale: true,
            title: true,
            excerpt: true,
            content: true,
            metaTitle: true,
            metaDesc: true,
            coverCaption: true,
          },
        },
      },
    });
    if (!row) return {ok: false, code: "NOT_FOUND"};
    const projected = projectPost(row as PublicPostRow, query.data.locale, uploadBase);
    return projected
      ? {ok: true, data: projected}
      : {ok: false, code: "NOT_FOUND"};
  } catch {
    return {ok: false, code: "NOT_FOUND"};
  }
}

export async function getPostsByStudyProgram(
  database: PublicPostQueryDatabase,
  studyProgramId: string,
  requestedLocale: "id" | "en" | "ar",
  publicUploadBaseUrl: string,
  limit = 3,
): Promise<RelatedPostCard[]> {
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!uploadBase) return [];

  const now = new Date();
  const rows = await database.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: {not: null, lte: now},
      translations: {some: {locale: "id", status: "PUBLISHED"}},
      studyPrograms: {some: {studyProgramId}},
    },
    orderBy: {publishedAt: "desc"},
    take: limit,
    select: {
      ...PUBLIC_POST_SELECT,
      translations: {
        where: translationWhere(requestedLocale),
        select: {locale: true, title: true, excerpt: true},
      },
    },
  });

  return rows.map((row): RelatedPostCard => {
    const translation = row.translations.find(({locale}) => locale === requestedLocale) ?? row.translations[0];
    return {
      id: row.id,
      type: row.type,
      slug: row.slug,
      publishedAt: row.publishedAt!,
      translation: translation
        ? {locale: translation.locale, title: translation.title, excerpt: translation.excerpt}
        : {locale: "id", title: "", excerpt: null},
      cover: publicMediaView(row.coverMedia, uploadBase),
    };
  });
}

export async function incrementPostViewCount(
  database: PublicPostQueryDatabase,
  postId: string,
): Promise<void> {
  await database.post.update({
    where: {id: postId},
    data: {viewCount: {increment: 1}},
  });
}

export type RelatedPostCard = {
  id: string;
  type: string;
  slug: string;
  publishedAt: Date;
  translation: {
    locale: string;
    title: string;
    excerpt: string | null;
  };
  cover: ReturnType<typeof publicMediaView>;
};

export async function getRelatedPosts(
  database: PublicPostQueryDatabase,
  postId: string,
  type: "BERITA" | "PENGUMUMAN" | "INFORMASI" | "KOLOM",
  categoryId: string | null,
  publicUploadBaseUrl: string,
  limit = 3,
): Promise<RelatedPostCard[]> {
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!uploadBase) return [];

  const now = new Date();
  const whereBase: Prisma.PostWhereInput = {
    type,
    status: "PUBLISHED",
    publishedAt: {not: null, lte: now},
    id: {not: postId},
    translations: {
      some: {
        locale: "id",
        status: "PUBLISHED",
      },
    },
  };

  const byCategory = categoryId
    ? await database.post.findMany({
        where: {...whereBase, categoryId},
        orderBy: {publishedAt: "desc"},
        take: limit,
        select: {
          ...PUBLIC_POST_SELECT,
          translations: {
            where: translationWhere("id"),
            select: {
              locale: true,
              title: true,
              excerpt: true,
            },
          },
        },
      })
    : [];

  if (byCategory.length >= limit) {
    return byCategory.map((row): RelatedPostCard => ({
      id: row.id,
      type: row.type,
      slug: row.slug,
      publishedAt: row.publishedAt!,
      translation: row.translations[0]
        ? {
            locale: row.translations[0].locale,
            title: row.translations[0].title,
            excerpt: row.translations[0].excerpt,
          }
        : {locale: "id", title: "", excerpt: null},
      cover: publicMediaView(row.coverMedia, uploadBase),
    }));
  }

  const remaining = limit - byCategory.length;
  const excludeIds = [postId, ...byCategory.map((r) => r.id)];

  const fallback = await database.post.findMany({
    where: {
      ...whereBase,
      id: {notIn: excludeIds},
    },
    orderBy: {publishedAt: "desc"},
    take: remaining,
    select: {
      ...PUBLIC_POST_SELECT,
      translations: {
        where: translationWhere("id"),
        select: {
          locale: true,
          title: true,
          excerpt: true,
        },
      },
    },
  });

  const allRows = [...byCategory, ...fallback];

  return allRows.map((row): RelatedPostCard => ({
    id: row.id,
    type: row.type,
    slug: row.slug,
    publishedAt: row.publishedAt!,
    translation: row.translations[0]
      ? {
          locale: row.translations[0].locale,
          title: row.translations[0].title,
          excerpt: row.translations[0].excerpt,
        }
      : {locale: "id", title: "", excerpt: null},
    cover: publicMediaView(row.coverMedia, uploadBase),
  }));
}
