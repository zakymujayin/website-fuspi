import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAdminPageCommand,
  getAdminPageEditor,
  listAdminPages,
  normalizeAdminPageSearchParams,
  type AdminPageTransportDatabase,
} from "@/features/content/pages/admin-transport";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M4 Page admin transport adversarial PostgreSQL boundary", () => {
  const marker = `m4-page-adversarial-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const clock = () => now;
  let prisma: ReturnType<typeof createPrismaClient>;
  let adminId: string;
  let editorId: string;
  let petugasId: string;
  let satgasId: string;
  let existingPageId: string;
  let privatePageId: string;

  function actor(userId: string, role: ActiveDatabaseSession["role"]): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-08-04T11:00:00.000Z"),
    };
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({data: {
        name: "Synthetic Boundary Admin",
        email: `${marker}-admin@example.test`,
        role: "ADMIN",
      }}),
      prisma.user.create({data: {
        name: "Synthetic Boundary Editor",
        email: `${marker}-editor@example.test`,
        role: "EDITOR",
      }}),
      prisma.user.create({data: {
        name: "Synthetic Boundary Petugas",
        email: `${marker}-petugas@example.test`,
        role: "PETUGAS",
      }}),
      prisma.user.create({data: {
        name: "Synthetic Boundary Satgas",
        email: `${marker}-satgas@example.test`,
        role: "SATGAS_PPKS",
      }}),
    ]);
    [adminId, editorId, petugasId, satgasId] = users.map(({id}) => id);

    const privateMedia = await prisma.media.create({data: {
      storageKey: `${marker}-private-${"f".repeat(32)}.webp`,
      storageClass: "PRIVATE",
      checksumSha256: "f".repeat(64),
      originalName: `${marker}-private.webp`,
      mimeType: "image/webp",
      size: 512,
      alt: "Private synthetic media",
      isDecorative: false,
      width: 100,
      height: 100,
      uploaderId: adminId,
    }});

    const pages = await Promise.all([
      prisma.page.create({data: {
        slug: `${marker}-existing`,
        status: "DRAFT",
        contentOwnerId: adminId,
        translations: {create: {
          locale: "id",
          title: `${marker} Existing`,
          content: "<p>Synthetic content.</p>",
          status: "DRAFT",
        }},
      }}),
      prisma.page.create({data: {
        slug: `${marker}-private-hero`,
        status: "DRAFT",
        contentOwnerId: adminId,
        heroMediaId: privateMedia.id,
        translations: {create: {
          locale: "id",
          title: `${marker} Private hero`,
          content: "<p>Synthetic content.</p>",
          status: "DRAFT",
        }},
      }}),
    ]);
    [existingPageId, privatePageId] = pages.map(({id}) => id);
  });

  afterAll(async () => {
    const pages = await prisma.page.findMany({
      where: {slug: {startsWith: marker}},
      select: {id: true},
    });
    const ids = [...new Set([...pages.map(({id}) => id), existingPageId, privatePageId])]
      .filter(Boolean);
    await prisma.activityLog.deleteMany({where: {resourceType: "Page", resourceId: {in: ids}}});
    await prisma.contentRevision.deleteMany({where: {resourceType: "Page", resourceId: {in: ids}}});
    await prisma.page.deleteMany({where: {id: {in: ids}}});
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.activityLog.deleteMany({
      where: {actorId: {in: [adminId, editorId, petugasId, satgasId]}},
    });
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("makes existing and missing Page targets indistinguishable to every non-ADMIN role", async () => {
    const sessions = [
      actor(editorId, "EDITOR"),
      actor(petugasId, "PETUGAS"),
      actor(satgasId, "SATGAS_PPKS"),
    ];
    const before = await prisma.page.count();

    for (const session of sessions) {
      const existing = await getAdminPageEditor(prisma, session, existingPageId, "/uploads", clock);
      const missing = await getAdminPageEditor(prisma, session, "missing-page", "/uploads", clock);
      expect(existing).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missing).toEqual(existing);

      const existingDelete = await executeAdminPageCommand(prisma, session, {
        action: "DELETE",
        payload: {pageId: existingPageId, expectedVersion: 1},
      }, clock);
      const missingDelete = await executeAdminPageCommand(prisma, session, {
        action: "DELETE",
        payload: {pageId: "missing-page", expectedVersion: 1},
      }, clock);
      expect(existingDelete).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missingDelete).toEqual(existingDelete);
    }

    expect(await prisma.page.count()).toBe(before);
    expect(await prisma.page.findUnique({where: {id: existingPageId}})).not.toBeNull();
  });

  it("rejects expired, inactive, and password-change ADMIN sessions before Page access", async () => {
    const query = {page: 1, pageSize: 20, status: "ALL", search: marker, sort: "UPDATED_DESC"};
    for (const session of [
      {...actor(adminId, "ADMIN"), expiresAt: now},
      {...actor(adminId, "ADMIN"), isActive: false},
      {...actor(adminId, "ADMIN"), mustChangePassword: true},
    ]) {
      expect(await listAdminPages(prisma, session, query, clock)).toEqual({
        ok: false,
        code: "SESSION_INVALID",
      });
      expect(await getAdminPageEditor(prisma, session, existingPageId, "/uploads", clock)).toEqual({
        ok: false,
        code: "SESSION_INVALID",
      });
    }
  });

  it("rejects hostile list and command injection without writing", async () => {
    expect(normalizeAdminPageSearchParams(
      new URLSearchParams("page=1&page=2&contentOwnerId=attacker"),
    )).toEqual({ok: false, code: "REQUEST_INVALID"});

    const before = await Promise.all([
      prisma.page.count(),
      prisma.contentRevision.count({where: {resourceType: "Page"}}),
      prisma.activityLog.count({where: {resourceType: "Page"}}),
    ]);
    for (const command of [
      {
        action: "DELETE",
        payload: {pageId: existingPageId, expectedVersion: 1, force: true},
      },
      {
        action: "PUBLICATION",
        payload: {
          intent: "SCHEDULE",
          pageId: existingPageId,
          expectedVersion: 1,
          publishedAt: "2026-08-05T03:00:00.000Z",
        },
      },
      {
        action: "UPDATE",
        payload: {
          pageId: existingPageId,
          expectedVersion: 1,
          slug: `${marker}-injected`,
          parentId: null,
          heroMediaId: null,
          order: 1,
          translations: {id: {title: "Injected", content: "<p>Injected.</p>"}},
          contentOwnerId: editorId,
          status: "PUBLISHED",
        },
      },
    ]) {
      expect(await executeAdminPageCommand(prisma, actor(adminId, "ADMIN"), command, clock))
        .toEqual({ok: false, code: "REQUEST_INVALID"});
    }
    expect(await Promise.all([
      prisma.page.count(),
      prisma.contentRevision.count({where: {resourceType: "Page"}}),
      prisma.activityLog.count({where: {resourceType: "Page"}}),
    ])).toEqual(before);
  });

  it("never exposes a private hero or a thrown database detail", async () => {
    const privateHero = await getAdminPageEditor(
      prisma,
      actor(adminId, "ADMIN"),
      privatePageId,
      "/uploads",
      clock,
    );
    expect(privateHero).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(privateHero)).not.toMatch(/storage|private|checksum|path/i);

    const throwingDatabase = {
      page: {findUnique: () => Promise.reject(new Error("postgresql://secret@host/database"))},
    } as unknown as AdminPageTransportDatabase;
    const failure = await getAdminPageEditor(
      throwingDatabase,
      actor(adminId, "ADMIN"),
      existingPageId,
      "/uploads",
      clock,
    );
    expect(failure).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(failure)).not.toContain("postgresql");
  });
});
