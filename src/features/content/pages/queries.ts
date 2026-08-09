import {Prisma} from "@/generated/prisma/client";

import {
  ActiveDatabaseSessionSchema,
  type ActiveDatabaseSession,
} from "@/contracts/auth";
import {authorize} from "@/lib/auth/runtime/authorization";
import {createPrismaClient} from "@/lib/db/client";
import {
  PageDetailViewSchema,
  PageIdSchema,
  PageListQuerySchema,
  PageListResultSchema,
  type PageDetailView,
  type PageListResult,
} from "@/features/content/pages/contract";

export type PageQueryDatabase = ReturnType<typeof createPrismaClient>;
export type PageQueryClock = () => Date;

type Actor = ActiveDatabaseSession & {role: "ADMIN"};
type FailureCode = "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE";

const SYSTEM_CLOCK: PageQueryClock = () => new Date();
const PAGE_SELECT = {
  id: true,
  slug: true,
  status: true,
  order: true,
  version: true,
  parentId: true,
  heroMediaId: true,
  createdAt: true,
  updatedAt: true,
  parent: {
    select: {
      translations: {
        where: {locale: "id" as const},
        select: {title: true},
      },
    },
  },
  _count: {select: {children: true}},
  translations: {
    select: {
      locale: true,
      title: true,
      content: true,
      metaTitle: true,
      metaDesc: true,
    },
    orderBy: {locale: "asc" as const},
  },
} as const;

function actorFromSession(raw: unknown, now: Date): Actor | null {
  const parsed = ActiveDatabaseSessionSchema.safeParse(raw);
  if (
    !parsed.success
    || parsed.data.expiresAt <= now
    || parsed.data.mustChangePassword
    || parsed.data.role !== "ADMIN"
  ) return null;
  return {...parsed.data, role: parsed.data.role};
}

function isAuthorized(actor: Actor) {
  return authorize({actor}, "VIEW", "CMS").allowed;
}

export type PageListLoadResult =
  | {ok: true; data: PageListResult}
  | {ok: false; code: FailureCode};

export type PageDetailLoadResult =
  | {ok: true; data: PageDetailView}
  | {ok: false; code: FailureCode};

export async function listPages(
  database: PageQueryDatabase,
  rawSession: unknown,
  rawQuery: unknown,
  clock: PageQueryClock = SYSTEM_CLOCK,
): Promise<PageListLoadResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  if (!isAuthorized(actor)) return {ok: false, code: "SESSION_INVALID"};

  const query = PageListQuerySchema.safeParse(rawQuery);
  if (!query.success) return {ok: false, code: "REQUEST_INVALID"};

  const where: Prisma.PageWhereInput = {
    ...(query.data.status === "ALL" ? {} : {status: query.data.status}),
  };

  if (query.data.search) {
    where.translations = {
      some: {
        locale: "id",
        title: {contains: query.data.search, mode: "insensitive"},
      },
    };
  }

  const skip = (query.data.page - 1) * query.data.pageSize;

  try {
    let rows;
    let total;

    if (query.data.sort === "TITLE_ASC") {
      [rows, total] = await database.$transaction(async (transaction) => {
        const identifiers = await transaction.$queryRaw<Array<{id: string}>>(Prisma.sql`
          SELECT p."id"
          FROM "Page" p
          INNER JOIN "PageTranslation" t
            ON t."pageId" = p."id" AND t."locale"::text = 'id'
          WHERE ${query.data.status === "ALL" ? Prisma.sql`TRUE` : Prisma.sql`p."status"::text = ${query.data.status}`}
          ${
            query.data.search
              ? Prisma.sql`AND t."title" ILIKE ${`%${query.data.search}%`}`
              : Prisma.empty
          }
          ORDER BY t."title" ASC, p."id" ASC
          LIMIT ${query.data.pageSize} OFFSET ${skip}
        `);
        const unordered = await transaction.page.findMany({
          where: {id: {in: identifiers.map(({id}) => id)}},
          select: PAGE_SELECT,
        });
        const byId = new Map(unordered.map((row) => [row.id, row]));
        return [
          identifiers.flatMap(({id}) => {
            const row = byId.get(id);
            return row ? [row] : [];
          }),
          await transaction.page.count({where}),
        ] as const;
      }, {isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead});
    } else {
      const orderBy: Prisma.PageOrderByWithRelationInput[] = [{updatedAt: "desc"}, {id: "asc"}];
      [rows, total] = await database.$transaction([
        database.page.findMany({
          where,
          select: PAGE_SELECT,
          orderBy,
          skip,
          take: query.data.pageSize,
        }),
        database.page.count({where}),
      ]);
    }

    const result = PageListResultSchema.safeParse({
      items: rows.map((row) => {
        const idTranslation = row.translations.find((t) => t.locale === "id");
        return {
          id: row.id,
          slug: row.slug,
          title: idTranslation?.title ?? "",
          titleLocale: "id" as const,
          availableLocales: ["id", "en", "ar"].filter((locale) =>
            row.translations.some((t) => t.locale === locale)),
          status: row.status,
          version: row.version,
          order: row.order,
          parentId: row.parentId,
          parentTitle: row.parent?.translations[0]?.title ?? null,
          hasChildren: row._count.children > 0,
          updatedAt: row.updatedAt.toISOString(),
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

export async function getPageDetail(
  database: PageQueryDatabase,
  rawSession: unknown,
  pageId: unknown,
  clock: PageQueryClock = SYSTEM_CLOCK,
): Promise<PageDetailLoadResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  if (!isAuthorized(actor)) return {ok: false, code: "SESSION_INVALID"};

  const parsedId = PageIdSchema.safeParse(pageId);
  if (!parsedId.success) return {ok: false, code: "REQUEST_INVALID"};

  try {
    const row = await database.page.findUnique({
      where: {id: parsedId.data},
      select: PAGE_SELECT,
    });

    if (!row) return {ok: false, code: "REQUEST_INVALID"};

    const idTranslation = row.translations.find((t) => t.locale === "id");
    if (!idTranslation) return {ok: false, code: "UNAVAILABLE"};

    const result = PageDetailViewSchema.safeParse({
      id: row.id,
      slug: row.slug,
      status: row.status,
      order: row.order,
      version: row.version,
      parentId: row.parentId,
      heroMediaId: row.heroMediaId,
      translations: {
        id: {
          title: idTranslation.title,
          content: idTranslation.content,
          metaTitle: idTranslation.metaTitle,
          metaDesc: idTranslation.metaDesc,
        },
        ...Object.fromEntries(
          row.translations
            .filter((t) => t.locale !== "id")
            .map(({locale, title, content, metaTitle, metaDesc}) => [
              locale,
              {title, content, metaTitle, metaDesc},
            ]),
        ),
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });

    return result.success ? {ok: true, data: result.data} : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
