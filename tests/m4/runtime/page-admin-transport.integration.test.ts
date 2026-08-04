import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {createHash} from "node:crypto";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAdminPageCommand,
  getAdminPageEditor,
  listAdminPages,
} from "@/features/content/pages/admin-transport";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M4 Page admin transport on PostgreSQL", () => {
  const marker = `m4-admin-page-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const clock = () => now;
  const createdPageIds = new Set<string>();
  let prisma: ReturnType<typeof createPrismaClient>;
  let adminId: string;
  let editorId: string;
  let mediaId: string;
  let existingPageId: string;

  function actor(userId: string, role: ActiveDatabaseSession["role"]): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-08-04T11:00:00.000Z"),
    };
  }

  function translations(title: string) {
    return {
      id: {title, content: "<p>Konten Indonesia.</p>", metaTitle: null, metaDesc: null},
      en: {title: `${title} EN`, content: "<p>English content.</p>", metaTitle: null, metaDesc: null},
      ar: {title: `${title} AR`, content: "<p>محتوى عربي.</p>", metaTitle: null, metaDesc: null},
    };
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({
        data: {name: "Synthetic Page Admin", email: `${marker}-admin@example.test`, role: "ADMIN"},
      }),
      prisma.user.create({
        data: {name: "Synthetic Page Editor", email: `${marker}-editor@example.test`, role: "EDITOR"},
      }),
    ]);
    [adminId, editorId] = users.map(({id}) => id);

    const checksum = createHash("sha256").update(`${marker}-hero`).digest("hex");
    const media = await prisma.media.create({
      data: {
        storageKey: `2026/08/${checksum}.webp`,
        storageClass: "PUBLIC",
        checksumSha256: checksum,
        originalName: `${marker}-hero.webp`,
        mimeType: "image/webp",
        size: 4_096,
        alt: "Synthetic Page hero",
        isDecorative: false,
        width: 1_200,
        height: 675,
        uploaderId: adminId,
      },
    });
    mediaId = media.id;

    const existing = await prisma.page.create({
      data: {
        slug: `${marker}-existing`,
        status: "DRAFT",
        order: 1,
        heroMediaId: mediaId,
        contentOwnerId: adminId,
        translations: {create: [
          {
            locale: "id",
            title: `${marker} Existing`,
            content: "<p>Konten aman.</p>",
            status: "DRAFT",
          },
          {
            locale: "en",
            title: `${marker} Existing EN`,
            content: "<p>Safe content.</p>",
            status: "DRAFT",
          },
        ]},
      },
    });
    existingPageId = existing.id;
    createdPageIds.add(existing.id);
  });

  afterAll(async () => {
    const rows = await prisma.page.findMany({
      where: {slug: {startsWith: marker}},
      select: {id: true},
    });
    const allIds = [...new Set([...rows.map(({id}) => id), ...createdPageIds])];
    if (allIds.length > 0) {
      await prisma.activityLog.deleteMany({
        where: {resourceType: "Page", resourceId: {in: allIds}},
      });
      await prisma.contentRevision.deleteMany({
        where: {resourceType: "Page", resourceId: {in: allIds}},
      });
      await prisma.page.deleteMany({where: {id: {in: allIds}}});
    }
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.activityLog.deleteMany({where: {actorId: {in: [adminId, editorId]}}});
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("lists Page rows and returns a strict editor hero view", async () => {
    const list = await listAdminPages(prisma, actor(adminId, "ADMIN"), {
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: marker,
      sort: "UPDATED_DESC",
    }, clock);
    expect(list).toMatchObject({
      ok: true,
      data: {total: 1, items: [{id: existingPageId, availableLocales: ["id", "en"]}]},
    });

    const detail = await getAdminPageEditor(
      prisma,
      actor(adminId, "ADMIN"),
      existingPageId,
      "/uploads",
      clock,
    );
    expect(detail).toMatchObject({
      ok: true,
      data: {
        id: existingPageId,
        heroMediaId: mediaId,
        hero: {id: mediaId, url: expect.stringContaining("/uploads/")},
      },
    });
    if (!detail.ok) return;
    expect(detail.data.hero).not.toHaveProperty("storageKey");
    expect(detail.data.hero).not.toHaveProperty("storageClass");
  });

  it("executes create, update, optimistic conflict, publication, and delete", async () => {
    const created = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "CREATE",
      payload: {
        slug: `${marker}-lifecycle`,
        parentId: existingPageId,
        heroMediaId: mediaId,
        order: 2,
        translations: translations(`${marker} Lifecycle`),
        publication: {intent: "SAVE_DRAFT"},
      },
    }, clock);
    expect(created).toMatchObject({ok: true, version: 1, status: "DRAFT"});
    if (!created.ok) throw new Error("Expected transport Page creation.");
    createdPageIds.add(created.pageId);

    const updated = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "UPDATE",
      payload: {
        pageId: created.pageId,
        expectedVersion: 1,
        slug: `${marker}-lifecycle-updated`,
        parentId: existingPageId,
        heroMediaId: mediaId,
        order: 3,
        translations: translations(`${marker} Updated`),
      },
    }, clock);
    expect(updated).toMatchObject({ok: true, version: 2, status: "DRAFT"});

    const stale = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "UPDATE",
      payload: {
        pageId: created.pageId,
        expectedVersion: 1,
        slug: `${marker}-stale-overwrite`,
        parentId: null,
        heroMediaId: null,
        order: 99,
        translations: translations("Stale overwrite"),
      },
    }, clock);
    expect(stale).toEqual({ok: false, code: "VERSION_CONFLICT"});
    expect(await prisma.page.findUnique({where: {id: created.pageId}})).toMatchObject({
      slug: `${marker}-lifecycle-updated`,
      version: 2,
      order: 3,
    });

    const published = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "PUBLICATION",
      payload: {intent: "PUBLISH_NOW", pageId: created.pageId, expectedVersion: 2},
    }, clock);
    expect(published).toMatchObject({ok: true, version: 3, status: "PUBLISHED"});

    const deleted = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "DELETE",
      payload: {pageId: created.pageId, expectedVersion: 3},
    }, clock);
    expect(deleted).toMatchObject({ok: true, version: 4, status: "PUBLISHED"});
    expect(await prisma.page.findUnique({where: {id: created.pageId}})).toBeNull();
  });

  it("maps invalid parent rollback to one non-technical response", async () => {
    const before = await Promise.all([
      prisma.page.count(),
      prisma.contentRevision.count({where: {resourceType: "Page"}}),
      prisma.activityLog.count({where: {resourceType: "Page"}}),
    ]);
    const slug = `${marker}-missing-parent`;
    const result = await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), {
      action: "CREATE",
      payload: {
        slug,
        parentId: "missing-parent",
        heroMediaId: null,
        order: 4,
        translations: translations("Missing parent"),
        publication: {intent: "SAVE_DRAFT"},
      },
    }, clock);
    expect(result).toEqual({ok: false, code: "PARENT_INVALID"});
    expect(await Promise.all([
      prisma.page.count(),
      prisma.contentRevision.count({where: {resourceType: "Page"}}),
      prisma.activityLog.count({where: {resourceType: "Page"}}),
    ])).toEqual(before);
    expect(await prisma.page.findUnique({where: {slug}})).toBeNull();
  });
});
