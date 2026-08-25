import {Prisma} from "@/generated/prisma/client";

import {ActiveDatabaseSessionSchema, type ActiveDatabaseSession} from "@/contracts/auth";
import {PublicMediaViewSchema} from "@/contracts/media";
import {
  AdminPostEditorViewSchema,
  AdminPostListQuerySchema,
  AdminPostListResultSchema,
  AdminPostListSearchParamsSchema,
  AdminPostMutationResponseSchema,
  AdminPostTransportCommandSchema,
  toAdminPostMutationResponse,
  toBeritaAutosaveInput,
  toBeritaCreateInput,
  toBeritaUpdateInput,
  type AdminPostEditorView,
  type AdminPostListResult,
  type AdminPostMutationResponse,
} from "@/contracts/post-admin";
import {StorageKeySchema} from "@/contracts/storage";
import {authorize} from "@/lib/auth/runtime/authorization";
import {createPrismaClient} from "@/lib/db/client";
import {
  autosavePost,
  createPost,
  deletePost,
  mutatePostPublication,
  updatePost,
} from "@/lib/content/post-mutations";

export type AdminPostTransportDatabase = ReturnType<typeof createPrismaClient>;
export type AdminPostTransportClock = () => Date;
type Actor = ActiveDatabaseSession & {role: "ADMIN" | "EDITOR"};
type FailureCode = "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE";
export type AdminPostListLoadResult =
  | {ok: true; data: AdminPostListResult}
  | {ok: false; code: FailureCode};
export type AdminPostEditorLoadResult =
  | {ok: true; data: AdminPostEditorView}
  | {ok: false; code: FailureCode};

const SYSTEM_CLOCK: AdminPostTransportClock = () => new Date();

function actorFromSession(raw: unknown, now: Date): Actor | null {
  const parsed = ActiveDatabaseSessionSchema.safeParse(raw);
  if (
    !parsed.success
    || parsed.data.expiresAt <= now
    || parsed.data.mustChangePassword
    || (parsed.data.role !== "ADMIN" && parsed.data.role !== "EDITOR")
  ) return null;
  return {...parsed.data, role: parsed.data.role};
}

function ownershipWhere(actor: Actor): Prisma.PostWhereInput {
  return actor.role === "ADMIN"
    ? {}
    : {authorId: actor.userId, contentOwnerId: actor.userId};
}

function publicationState(status: "DRAFT" | "PUBLISHED" | "ARCHIVED", at: Date | null, now: Date) {
  if (status === "ARCHIVED") return "ARCHIVED" as const;
  if (status === "DRAFT") return "DRAFT" as const;
  return at && at > now ? "SCHEDULED" as const : "PUBLISHED" as const;
}

function capabilities(actor: Actor, ownerId: string | null) {
  const context = {actor, resourceOwnerId: ownerId};
  return {
    update: authorize(context, "UPDATE", "POST").allowed,
    publish: authorize(context, "PUBLISH", "POST").allowed,
    delete: authorize(context, "DELETE", "POST").allowed,
  };
}

function normalizeUploadBase(raw: string): string | null {
  if (!raw || raw.length > 2_048 || raw.includes("\\") || /[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    return null;
  }
  try {
    const relative = raw.startsWith("/") && !raw.startsWith("//");
    const value = new URL(raw, "https://fuspi.invalid");
    if ((!relative && value.protocol !== "https:") || value.username || value.password || value.search || value.hash) {
      return null;
    }
    const path = value.pathname.replace(/\/+$/u, "");
    if (!path || path === "/") return null;
    return relative ? path : `${value.origin}${path}`;
  } catch {
    return null;
  }
}

function safeCover(media: {
  id: string;
  storageKey: string;
  storageClass: "PUBLIC" | "PRIVATE" | "PPKS_PRIVATE";
  mimeType: string;
  size: number;
  alt: string | null;
  isDecorative: boolean;
  width: number | null;
  height: number | null;
} | null, uploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success) {
    return null;
  }
  // PublicMediaViewSchema is `.strict()` and does not declare storageKey/storageClass; spreading the
  // whole `media` would fail parsing on those extra keys. Pass only the declared fields.
  const {id, mimeType, size, alt, isDecorative, width, height} = media;
  const parsed = PublicMediaViewSchema.safeParse({
    id, mimeType, size, alt, isDecorative, width, height,
    url: `${uploadBase}/${media.storageKey}`,
  });
  return parsed.success ? parsed.data : null;
}

export function normalizeAdminPostSearchParams(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length !== 1) return {ok: false as const, code: "REQUEST_INVALID" as const};
    raw[key] = values[0] ?? "";
  }
  const parsed = AdminPostListSearchParamsSchema.safeParse(raw);
  return parsed.success
    ? {ok: true as const, data: parsed.data}
    : {ok: false as const, code: "REQUEST_INVALID" as const};
}

const POST_SELECT = {
  id: true,
  slug: true,
  status: true,
  version: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  coverMediaId: true,
  contentOwnerId: true,
  authorId: true,
  author: {select: {name: true}},
  category: {select: {translations: {where: {locale: "id" as const}, select: {name: true}}}},
  coverMedia: {select: {
    id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
    alt: true, isDecorative: true, width: true, height: true,
  }},
  translations: {select: {
    locale: true, title: true, excerpt: true, content: true, metaTitle: true,
    metaDesc: true, coverCaption: true,
  }},
  tags: {select: {tagId: true}},
  images: {
    orderBy: {order: "asc" as const},
    select: {
      id: true, caption: true,
      media: {select: {
        id: true, storageKey: true, storageClass: true, mimeType: true, size: true,
        alt: true, isDecorative: true, width: true, height: true,
      }},
    },
  },
} as const;

function safeGalleryImages(
  images: ReadonlyArray<{id: string; caption: string | null; media: Parameters<typeof safeCover>[0]}>,
  uploadBase: string,
) {
  return images.flatMap((image) => {
    const media = safeCover(image.media, uploadBase);
    return media ? [{id: image.id, media, caption: image.caption}] : [];
  });
}

export async function listAdminPosts(
  database: AdminPostTransportDatabase,
  rawSession: unknown,
  rawQuery: unknown,
  clock: AdminPostTransportClock = SYSTEM_CLOCK,
): Promise<AdminPostListLoadResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const query = AdminPostListQuerySchema.safeParse(rawQuery);
  if (!query.success) return {ok: false, code: "REQUEST_INVALID"};
  const where: Prisma.PostWhereInput = {
    ...(query.data.type !== "ALL" ? {type: query.data.type} : {}),
    ...ownershipWhere(actor),
    ...(query.data.status === "ALL" ? {} : {status: query.data.status}),
    ...(query.data.search ? {translations: {some: {
      locale: "id", title: {contains: query.data.search, mode: "insensitive"},
    }}} : {}),
    translations: {
      some: {
        locale: "id",
        ...(query.data.search ? {title: {contains: query.data.search, mode: "insensitive"}} : {}),
      },
    },
  };
  const orderBy: Prisma.PostOrderByWithRelationInput[] = query.data.sort === "PUBLISHED_DESC"
      ? [{publishedAt: "desc"}, {id: "asc"}]
      : [{updatedAt: "desc"}, {id: "asc"}];
  const skip = (query.data.page - 1) * query.data.pageSize;
  try {
    let rows;
    let total;
    if (query.data.sort === "TITLE_ASC") {
      const ownershipSql = actor.role === "ADMIN" ? Prisma.empty : Prisma.sql`
        AND p."authorId" = ${actor.userId} AND p."contentOwnerId" = ${actor.userId}
      `;
      const statusSql = query.data.status === "ALL" ? Prisma.empty : Prisma.sql`
        AND p."status"::text = ${query.data.status}
      `;
      const typeSql = query.data.type === "ALL" ? Prisma.empty : Prisma.sql`
        AND p."type"::text = ${query.data.type}
      `;
      const searchSql = query.data.search ? Prisma.sql`
        AND t."title" ILIKE ${`%${query.data.search}%`}
      ` : Prisma.empty;
      [rows, total] = await database.$transaction(async (transaction) => {
        const identifiers = await transaction.$queryRaw<Array<{id: string}>>(Prisma.sql`
          SELECT p."id"
          FROM "Post" p
          INNER JOIN "PostTranslation" t
            ON t."postId" = p."id" AND t."locale"::text = 'id'
          WHERE 1=1
            ${typeSql}
            ${ownershipSql}
            ${statusSql}
            ${searchSql}
          ORDER BY t."title" ASC, p."id" ASC
          LIMIT ${query.data.pageSize} OFFSET ${skip}
        `);
        const unordered = await transaction.post.findMany({
          where: {id: {in: identifiers.map(({id}) => id)}},
          select: POST_SELECT,
        });
        const byId = new Map(unordered.map((row) => [row.id, row]));
        return [
          identifiers.flatMap(({id}) => {
            const row = byId.get(id);
            return row ? [row] : [];
          }),
          await transaction.post.count({where}),
        ] as const;
      });
    } else {
      [rows, total] = await database.$transaction([
        database.post.findMany({where, select: POST_SELECT, orderBy, skip, take: query.data.pageSize}),
        database.post.count({where}),
      ]);
    }
    const result = AdminPostListResultSchema.safeParse({
      items: rows.map((row) => {
        const title = row.translations.find(({locale}) => locale === "id")?.title;
        const ownerId = row.contentOwnerId ?? row.authorId;
        return {
          id: row.id,
          slug: row.slug,
          title,
          titleLocale: "id",
          availableLocales: ["id", "en", "ar"].filter((locale) =>
            row.translations.some((item) => item.locale === locale)),
          status: row.status,
          publicationState: publicationState(row.status, row.publishedAt, now),
          version: row.version,
          isFeatured: row.isFeatured,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          updatedAt: row.updatedAt.toISOString(),
          category: row.category?.translations[0]
            ? {id: row.categoryId, label: row.category.translations[0].name}
            : null,
          author: row.author ? {name: row.author.name} : null,
          capabilities: capabilities(actor, ownerId),
        };
      }),
      page: query.data.page,
      pageSize: query.data.pageSize,
      total,
      hasNextPage: skip + rows.length < total,
    });
    return result.success ? {ok: true, data: result.data} : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function getAdminPostEditor(
  database: AdminPostTransportDatabase,
  rawSession: unknown,
  postId: unknown,
  publicUploadBaseUrl: string,
  clock: AdminPostTransportClock = SYSTEM_CLOCK,
): Promise<AdminPostEditorLoadResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  if (typeof postId !== "string" || !uploadBase) return {ok: false, code: "NOT_FOUND"};
  try {
    const row = await database.post.findFirst({
      where: {id: postId, type: "BERITA", ...ownershipWhere(actor)},
      select: POST_SELECT,
    });
    if (!row) return {ok: false, code: "NOT_FOUND"};
    const translations = Object.fromEntries(row.translations.map(({locale, ...value}) => [locale, value]));
    const result = AdminPostEditorViewSchema.safeParse({
      id: row.id,
      type: "BERITA",
      columnType: null,
      slug: row.slug,
      isFeatured: row.isFeatured,
      categoryId: row.categoryId,
      coverMediaId: row.coverMediaId,
      tagIds: row.tags.map(({tagId}) => tagId),
      translations,
      status: row.status,
      publicationState: publicationState(row.status, row.publishedAt, now),
      version: row.version,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      cover: safeCover(row.coverMedia, uploadBase),
      images: safeGalleryImages(row.images, uploadBase),
      capabilities: capabilities(actor, row.contentOwnerId ?? row.authorId),
    });
    return result.success ? {ok: true, data: result.data} : {ok: false, code: "NOT_FOUND"};
  } catch {
    return {ok: false, code: "NOT_FOUND"};
  }
}

type AdminPostFailureResponse = Extract<AdminPostMutationResponse, {ok: false}>;

function mutationFailure(code: AdminPostFailureResponse["code"]): AdminPostMutationResponse {
  return AdminPostMutationResponseSchema.parse({ok: false, code});
}

export async function executeAdminPostCommand(
  database: AdminPostTransportDatabase,
  rawSession: unknown,
  rawCommand: unknown,
  clock: AdminPostTransportClock = SYSTEM_CLOCK,
): Promise<AdminPostMutationResponse> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (!actor) return mutationFailure("SESSION_INVALID");
  const command = AdminPostTransportCommandSchema.safeParse(rawCommand);
  if (!command.success) return mutationFailure("REQUEST_INVALID");

  try {
    if (command.data.action !== "CREATE") {
      const target = await database.post.findFirst({
        where: {id: command.data.payload.postId, type: "BERITA", ...ownershipWhere(actor)},
        select: {id: true},
      });
      if (!target) return mutationFailure("NOT_FOUND");
    }
    const result = command.data.action === "CREATE"
      ? await createPost(database, actor, toBeritaCreateInput(command.data.payload), clock)
      : command.data.action === "UPDATE"
        ? await updatePost(database, actor, toBeritaUpdateInput(command.data.payload), clock)
        : command.data.action === "AUTOSAVE"
          ? await autosavePost(database, actor, toBeritaAutosaveInput(command.data.payload), clock)
          : command.data.action === "PUBLICATION"
            ? await mutatePostPublication(database, actor, command.data.payload, clock)
            : await deletePost(database, actor, command.data.payload, clock);
    return toAdminPostMutationResponse(result);
  } catch {
    return mutationFailure("UNAVAILABLE");
  }
}

export function adminPostHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "INVALID_STATE", "SLUG_CONFLICT"].includes(result.code ?? "")) return 409;
  if (result.code === "MEDIA_INVALID") return 422;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
