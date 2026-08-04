import {hash} from "bcryptjs";

import {
  AdminUserCommandSchema,
  AdminUserListQuerySchema,
  AdminUserListResultSchema,
  AdminUserMutationResultSchema,
  AdminUserSummarySchema,
  TaxonomyCommandSchema,
  TaxonomyListQuerySchema,
  TaxonomyListResultSchema,
  TaxonomyMutationResultSchema,
  TaxonomySummarySchema,
  TrustedAdminFoundationActorSchema,
  type AdminUserMutationResult,
  type TaxonomyKind,
  type TaxonomyMutationResult,
} from "@/contracts/admin-foundation";
import type {ActiveDatabaseSession} from "@/contracts/auth";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

export type AdminFoundationDatabase = ReturnType<typeof createPrismaClient>;

const COMMON_PASSWORDS = new Set([
  "password1234",
  "password12345",
  "admin12345678",
  "administrator123",
  "qwerty123456",
  "qwertyuiop123",
  "123456789012",
  "1234567890123456",
  "indonesia123",
  "sayang123456",
  "bismillah123",
  "fuspi12345678",
]);

function actorOrFailure(rawActor: ActiveDatabaseSession | null, now = new Date()) {
  const parsed = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return parsed.success && parsed.data.expiresAt > now ? parsed.data : null;
}

function userView(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return AdminUserSummarySchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
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

export async function listAdminUsers(
  prisma: AdminFoundationDatabase,
  rawActor: ActiveDatabaseSession | null,
  rawQuery: unknown,
  now = new Date(),
) {
  const actor = actorOrFailure(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  const query = AdminUserListQuerySchema.safeParse(rawQuery);
  if (!query.success) return {ok: false as const, code: "REQUEST_INVALID" as const};

  const where: Prisma.UserWhereInput = {
    ...(query.data.role === "ALL" ? {} : {role: query.data.role}),
    ...(query.data.active === "ALL" ? {} : {isActive: query.data.active === "ACTIVE"}),
    ...(query.data.search === "" ? {} : {
      OR: [
        {name: {contains: query.data.search, mode: "insensitive"}},
        {email: {contains: query.data.search, mode: "insensitive"}},
      ],
    }),
  };

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{name: query.data.direction.toLowerCase() as "asc" | "desc"}, {id: "asc"}],
        skip: (query.data.page - 1) * query.data.pageSize,
        take: query.data.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({where}),
    ]);
    return {
      ok: true as const,
      data: AdminUserListResultSchema.parse({
        items: rows.map(userView),
        page: pageMetadata(query.data.page, query.data.pageSize, total),
      }),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

function passwordIsAllowed(password: string, email: string) {
  const normalized = password.toLowerCase();
  return normalized !== email.toLowerCase() && !COMMON_PASSWORDS.has(normalized);
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === code;
}

export async function executeAdminUserCommand(
  prisma: AdminFoundationDatabase,
  rawActor: ActiveDatabaseSession | null,
  rawCommand: unknown,
  now = new Date(),
): Promise<AdminUserMutationResult> {
  const actor = actorOrFailure(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const command = AdminUserCommandSchema.safeParse(rawCommand);
  if (!command.success) return {ok: false, code: "VALIDATION_FAILED"};

  try {
    if (command.data.action === "CREATE") {
      const payload = command.data.payload;
      if (!passwordIsAllowed(payload.initialPassword, payload.email)) {
        return {ok: false, code: "VALIDATION_FAILED"};
      }
      const passwordHash = await hash(payload.initialPassword, 12);
      return await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: payload.name,
            email: payload.email,
            passwordHash,
            role: payload.role,
            isActive: payload.isActive,
            mustChangePassword: true,
          },
          select: {
            id: true, name: true, email: true, role: true, isActive: true,
            mustChangePassword: true, createdAt: true, updatedAt: true,
          },
        });
        await tx.activityLog.create({
          data: {actorId: actor.userId, action: "CREATE", resourceType: "User", resourceId: created.id},
        });
        return AdminUserMutationResultSchema.parse({ok: true, user: userView(created)});
      });
    }

    const payload = command.data.payload;
    return await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: {id: payload.userId},
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          mustChangePassword: true, createdAt: true, updatedAt: true,
        },
      });
      if (!current) return {ok: false, code: "NOT_FOUND"} as const;
      if (current.updatedAt.getTime() !== new Date(payload.expectedUpdatedAt).getTime()) {
        return {ok: false, code: "VERSION_CONFLICT"} as const;
      }
      const removesAdmin = current.role === "ADMIN" && current.isActive
        && (payload.role !== "ADMIN" || !payload.isActive);
      if (current.id === actor.userId && removesAdmin) {
        return {ok: false, code: "SELF_LOCKOUT"} as const;
      }
      if (removesAdmin && await tx.user.count({where: {role: "ADMIN", isActive: true}}) <= 1) {
        return {ok: false, code: "LAST_ADMIN"} as const;
      }

      const updated = await tx.user.update({
        where: {id: current.id},
        data: {name: payload.name, email: payload.email, role: payload.role, isActive: payload.isActive},
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          mustChangePassword: true, createdAt: true, updatedAt: true,
        },
      });
      if (current.role !== payload.role || current.isActive !== payload.isActive) {
        await tx.session.deleteMany({where: {userId: current.id}});
      }
      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: current.role === payload.role ? "UPDATE" : "CHANGE_ROLE",
          resourceType: "User",
          resourceId: current.id,
        },
      });
      return AdminUserMutationResultSchema.parse({ok: true, user: userView(updated)});
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "EMAIL_CONFLICT"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

type TaxonomyIndexRow = {id: string; kind: TaxonomyKind};

function taxonomyView(
  kind: TaxonomyKind,
  row: {
    id: string;
    slug: string;
    translations: Array<{
      locale: "id" | "en" | "ar";
      name: string;
      status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "STALE";
      sourceVersion: number;
      translatorId: string | null;
      reviewerId: string | null;
      reviewedAt: Date | null;
    }>;
    _count: {posts: number};
  },
) {
  const translations = Object.fromEntries(row.translations.map((translation) => [
    translation.locale,
    {
      name: translation.name,
      workflow: {
        locale: translation.locale,
        status: translation.status,
        sourceVersion: translation.sourceVersion,
        translatorId: translation.translatorId,
        reviewerId: translation.reviewerId,
        reviewedAt: translation.reviewedAt?.toISOString() ?? null,
      },
    },
  ]));
  return TaxonomySummarySchema.parse({
    id: row.id,
    kind,
    slug: row.slug,
    translations: {id: translations.id, en: translations.en ?? null, ar: translations.ar ?? null},
    usageCount: row._count.posts,
  });
}

export async function listTaxonomies(
  prisma: AdminFoundationDatabase,
  rawActor: ActiveDatabaseSession | null,
  rawQuery: unknown,
  now = new Date(),
) {
  const actor = actorOrFailure(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  const query = TaxonomyListQuerySchema.safeParse(rawQuery);
  if (!query.success) return {ok: false as const, code: "REQUEST_INVALID" as const};

  const search = `%${query.data.search}%`;
  const categoryFilter = query.data.kind === "TAG" ? PrismaNamespace.sql`FALSE` : PrismaNamespace.sql`TRUE`;
  const tagFilter = query.data.kind === "CATEGORY" ? PrismaNamespace.sql`FALSE` : PrismaNamespace.sql`TRUE`;
  const direction = query.data.direction === "ASC" ? PrismaNamespace.sql`ASC` : PrismaNamespace.sql`DESC`;
  const offset = (query.data.page - 1) * query.data.pageSize;

  try {
    const base = PrismaNamespace.sql`
      SELECT c."id", 'CATEGORY'::text AS "kind", c."slug"
      FROM "Category" c
      WHERE ${categoryFilter} AND (${query.data.search === ""} OR c."slug" ILIKE ${search}
        OR EXISTS (SELECT 1 FROM "CategoryTranslation" ct WHERE ct."categoryId" = c."id" AND ct."name" ILIKE ${search}))
      UNION ALL
      SELECT t."id", 'TAG'::text AS "kind", t."slug"
      FROM "Tag" t
      WHERE ${tagFilter} AND (${query.data.search === ""} OR t."slug" ILIKE ${search}
        OR EXISTS (SELECT 1 FROM "TagTranslation" tt WHERE tt."tagId" = t."id" AND tt."name" ILIKE ${search}))`;
    const [indexRows, countRows] = await prisma.$transaction([
      prisma.$queryRaw<Array<TaxonomyIndexRow & {slug: string}>>(PrismaNamespace.sql`
        SELECT q."id", q."kind", q."slug" FROM (${base}) q
        ORDER BY q."slug" ${direction}, q."id" ASC LIMIT ${query.data.pageSize} OFFSET ${offset}`),
      prisma.$queryRaw<Array<{total: bigint}>>(PrismaNamespace.sql`SELECT COUNT(*)::bigint AS "total" FROM (${base}) q`),
    ]);
    const categoryIds = indexRows.filter((row) => row.kind === "CATEGORY").map((row) => row.id);
    const tagIds = indexRows.filter((row) => row.kind === "TAG").map((row) => row.id);
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        where: {id: {in: categoryIds}},
        include: {translations: true, _count: {select: {posts: true}}},
      }),
      prisma.tag.findMany({
        where: {id: {in: tagIds}},
        include: {translations: true, _count: {select: {posts: true}}},
      }),
    ]);
    const views = new Map<string, ReturnType<typeof taxonomyView>>();
    for (const row of categories) views.set(`CATEGORY:${row.id}`, taxonomyView("CATEGORY", row));
    for (const row of tags) views.set(`TAG:${row.id}`, taxonomyView("TAG", row));
    const total = Number(countRows[0]?.total ?? 0n);
    return {
      ok: true as const,
      data: TaxonomyListResultSchema.parse({
        items: indexRows.map((row) => views.get(`${row.kind}:${row.id}`)),
        page: pageMetadata(query.data.page, query.data.pageSize, total),
      }),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

function translationRows(
  translations: {id: {name: string}; en?: {name: string}; ar?: {name: string}},
  actorId: string,
) {
  return Object.entries(translations).map(([locale, value]) => ({
    locale: locale as "id" | "en" | "ar",
    name: value.name,
    status: "DRAFT" as const,
    sourceVersion: 1,
    translatorId: actorId,
  }));
}

export async function executeTaxonomyCommand(
  prisma: AdminFoundationDatabase,
  rawActor: ActiveDatabaseSession | null,
  rawCommand: unknown,
  now = new Date(),
): Promise<TaxonomyMutationResult> {
  const actor = actorOrFailure(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const command = TaxonomyCommandSchema.safeParse(rawCommand);
  if (!command.success) return {ok: false, code: "VALIDATION_FAILED"};
  const data = command.data;

  try {
    return await prisma.$transaction(async (tx) => {
      if (data.action === "DELETE") {
        const payload = data.payload;
        const current = payload.kind === "CATEGORY"
          ? await tx.category.findUnique({where: {id: payload.taxonomyId}, include: {_count: {select: {posts: true}}}})
          : await tx.tag.findUnique({where: {id: payload.taxonomyId}, include: {_count: {select: {posts: true}}}});
        if (!current) return {ok: false, code: "NOT_FOUND"} as const;
        if (current._count.posts > 0) return {ok: false, code: "IN_USE"} as const;
        if (payload.kind === "CATEGORY") await tx.category.delete({where: {id: current.id}});
        else await tx.tag.delete({where: {id: current.id}});
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: payload.kind === "CATEGORY" ? "Category" : "Tag", resourceId: current.id}});
        return TaxonomyMutationResultSchema.parse({ok: true, taxonomy: null});
      }

      const payload = data.payload;
      const translations = translationRows(payload.translations, actor.userId);
      let id: string;
      if (data.action === "CREATE") {
        if (payload.kind === "CATEGORY") {
          id = (await tx.category.create({data: {slug: payload.slug, translations: {create: translations}}, select: {id: true}})).id;
        } else {
          id = (await tx.tag.create({data: {slug: payload.slug, translations: {create: translations}}, select: {id: true}})).id;
        }
      } else {
        if (data.action !== "UPDATE") return {ok: false, code: "VALIDATION_FAILED"} as const;
        const updatePayload = data.payload;
        const exists = updatePayload.kind === "CATEGORY"
          ? await tx.category.findUnique({where: {id: updatePayload.taxonomyId}, select: {id: true}})
          : await tx.tag.findUnique({where: {id: updatePayload.taxonomyId}, select: {id: true}});
        if (!exists) return {ok: false, code: "NOT_FOUND"} as const;
        id = exists.id;
        const locales = translations.map(({locale}) => locale);
        if (payload.kind === "CATEGORY") {
          await tx.category.update({where: {id}, data: {slug: payload.slug}});
          await tx.categoryTranslation.deleteMany({where: {categoryId: id, locale: {notIn: locales}}});
          for (const translation of translations) await tx.categoryTranslation.upsert({where: {categoryId_locale: {categoryId: id, locale: translation.locale}}, create: {categoryId: id, ...translation}, update: translation});
        } else {
          await tx.tag.update({where: {id}, data: {slug: payload.slug}});
          await tx.tagTranslation.deleteMany({where: {tagId: id, locale: {notIn: locales}}});
          for (const translation of translations) await tx.tagTranslation.upsert({where: {tagId_locale: {tagId: id, locale: translation.locale}}, create: {tagId: id, ...translation}, update: translation});
        }
      }
      const row = payload.kind === "CATEGORY"
        ? await tx.category.findUniqueOrThrow({where: {id}, include: {translations: true, _count: {select: {posts: true}}}})
        : await tx.tag.findUniqueOrThrow({where: {id}, include: {translations: true, _count: {select: {posts: true}}}});
      await tx.activityLog.create({data: {actorId: actor.userId, action: data.action === "CREATE" ? "CREATE" : "UPDATE", resourceType: payload.kind === "CATEGORY" ? "Category" : "Tag", resourceId: id}});
      return TaxonomyMutationResultSchema.parse({ok: true, taxonomy: taxonomyView(payload.kind, row)});
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"};
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function adminFoundationHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["EMAIL_CONFLICT", "VERSION_CONFLICT", "SELF_LOCKOUT", "LAST_ADMIN", "SLUG_CONFLICT", "IN_USE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
