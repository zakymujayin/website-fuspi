import {compare, hash} from "bcryptjs";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {
  executeAdminUserCommand,
  executeTaxonomyCommand,
  listAdminUsers,
  listTaxonomies,
} from "@/features/admin/foundation";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const describeDatabase = runDatabaseTests ? describe : describe.skip;

describeDatabase("ADMIN foundation PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-admin-foundation-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let adminId = "";
  let editorId = "";
  const actor = () => ({userId: adminId, role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")});

  beforeAll(async () => {
    const passwordHash = await hash(`${marker}-password`, 12);
    const admin = await prisma.user.create({data: {name: `${marker} admin`, email: `${marker}-admin@example.com`, passwordHash, role: "ADMIN", isActive: true, mustChangePassword: false}});
    adminId = admin.id;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({where: {email: {contains: marker}}, select: {id: true}});
    const userIds = users.map(({id}) => id);
    const categories = await prisma.category.findMany({where: {slug: {startsWith: marker}}, select: {id: true}});
    const categoryIds = categories.map(({id}) => id);
    const posts = await prisma.post.findMany({where: {slug: {startsWith: marker}}, select: {id: true}});
    const postIds = posts.map(({id}) => id);
    await prisma.$transaction([
      prisma.activityLog.deleteMany({where: {OR: [{actorId: {in: userIds}}, {resourceId: {in: [...userIds, ...categoryIds]}}]}}),
      prisma.contentRevision.deleteMany({where: {resourceId: {in: postIds}}}),
      prisma.postTranslation.deleteMany({where: {postId: {in: postIds}}}),
      prisma.post.deleteMany({where: {id: {in: postIds}}}),
      prisma.category.deleteMany({where: {id: {in: categoryIds}}}),
      prisma.tag.deleteMany({where: {slug: {startsWith: marker}}}),
      prisma.session.deleteMany({where: {userId: {in: userIds}}}),
      prisma.user.deleteMany({where: {id: {in: userIds}}}),
    ]);
    await prisma.$disconnect();
  });

  it("creates a hashed User, lists it safely, enforces concurrency, and revokes sessions", async () => {
    const password = "unique-editor-password-2026";
    const created = await executeAdminUserCommand(prisma, actor(), {action: "CREATE", payload: {name: `${marker} editor`, email: `${marker}-editor@example.com`, initialPassword: password, confirmPassword: password, role: "EDITOR", isActive: true}}, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    editorId = created.user.id;
    expect(JSON.stringify(created)).not.toContain("passwordHash");
    const stored = await prisma.user.findUniqueOrThrow({where: {id: editorId}, select: {passwordHash: true, mustChangePassword: true, updatedAt: true}});
    expect(await compare(password, stored.passwordHash ?? "")).toBe(true);
    expect(stored.passwordHash).not.toBe(password);
    expect(stored.mustChangePassword).toBe(true);

    await prisma.session.create({data: {sessionToken: `${marker}-session`, userId: editorId, expires: new Date("2026-08-05T03:00:00.000Z")}});
    const updated = await executeAdminUserCommand(prisma, actor(), {action: "UPDATE", payload: {userId: editorId, expectedUpdatedAt: stored.updatedAt.toISOString(), name: `${marker} petugas`, email: `${marker}-editor@example.com`, role: "PETUGAS", isActive: true}}, now);
    expect(updated.ok).toBe(true);
    expect(await prisma.session.count({where: {userId: editorId}})).toBe(0);
    const stale = await executeAdminUserCommand(prisma, actor(), {action: "UPDATE", payload: {userId: editorId, expectedUpdatedAt: stored.updatedAt.toISOString(), name: "stale", email: `${marker}-editor@example.com`, role: "EDITOR", isActive: true}}, now);
    expect(stale).toEqual({ok: false, code: "VERSION_CONFLICT"});

    const listed = await listAdminUsers(prisma, actor(), {page: 1, pageSize: 20, search: marker, direction: "ASC", role: "ALL", active: "ALL"}, now);
    expect(listed.ok).toBe(true);
    expect(JSON.stringify(listed)).not.toContain("passwordHash");
  });

  it("prevents the acting ADMIN from demoting or deactivating itself", async () => {
    const admin = await prisma.user.findUniqueOrThrow({where: {id: adminId}, select: {updatedAt: true, name: true, email: true}});
    const result = await executeAdminUserCommand(prisma, actor(), {action: "UPDATE", payload: {userId: adminId, expectedUpdatedAt: admin.updatedAt.toISOString(), name: admin.name, email: admin.email, role: "EDITOR", isActive: false}}, now);
    expect(result).toEqual({ok: false, code: "SELF_LOCKOUT"});
    expect(await prisma.user.findUniqueOrThrow({where: {id: adminId}, select: {role: true, isActive: true}})).toEqual({role: "ADMIN", isActive: true});
  });

  it("mutates taxonomy translations atomically and rejects referenced deletion", async () => {
    const slug = `${marker}-category`;
    const created = await executeTaxonomyCommand(prisma, actor(), {action: "CREATE", payload: {kind: "CATEGORY", slug, translations: {id: {name: `${marker} kategori`}, en: {name: `${marker} category`}}}}, now);
    expect(created.ok).toBe(true);
    if (!created.ok || !created.taxonomy) return;
    const categoryId = created.taxonomy.id;
    const updated = await executeTaxonomyCommand(prisma, actor(), {action: "UPDATE", payload: {taxonomyId: categoryId, kind: "CATEGORY", slug, translations: {id: {name: `${marker} kategori baru`}, ar: {name: "فئة"}}}}, now);
    expect(updated.ok).toBe(true);
    const locales = await prisma.categoryTranslation.findMany({where: {categoryId}, select: {locale: true}});
    expect(new Set(locales.map(({locale}) => locale))).toEqual(new Set(["id", "ar"]));

    await prisma.post.create({data: {type: "BERITA", slug: `${marker}-post`, categoryId, authorId: adminId, translations: {create: {locale: "id", title: `${marker} post`, content: "<p>synthetic</p>"}}}});
    expect(await executeTaxonomyCommand(prisma, actor(), {action: "DELETE", payload: {taxonomyId: categoryId, kind: "CATEGORY"}}, now)).toEqual({ok: false, code: "IN_USE"});
    const listed = await listTaxonomies(prisma, actor(), {page: 1, pageSize: 20, search: marker, direction: "ASC", kind: "CATEGORY"}, now);
    expect(listed.ok).toBe(true);
    if (listed.ok) expect(listed.data.items[0]?.usageCount).toBe(1);
  });
});
