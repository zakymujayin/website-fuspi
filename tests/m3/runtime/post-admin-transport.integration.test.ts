import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAdminPostCommand,
  getAdminPostEditor,
  listAdminPosts,
} from "@/lib/content/post-admin-transport";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M3 Post admin transport on PostgreSQL", () => {
  const marker = `m3-admin-post-${Date.now()}`;
  const now = new Date("2026-07-21T08:00:00.000Z");
  const clock = () => now;
  let prisma: ReturnType<typeof createPrismaClient>;
  let adminId: string;
  let editorId: string;
  let otherEditorId: string;
  let ownedId: string;
  let otherId: string;
  let wrongTypeId: string;

  function actor(userId: string, role: "ADMIN" | "EDITOR"): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-21T16:00:00.000Z"),
    };
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({data: {name: "Synthetic Admin", email: `${marker}-admin@example.test`, role: "ADMIN"}}),
      prisma.user.create({data: {name: "Synthetic Editor", email: `${marker}-editor@example.test`, role: "EDITOR"}}),
      prisma.user.create({data: {name: "Synthetic Other", email: `${marker}-other@example.test`, role: "EDITOR"}}),
    ]);
    [adminId, editorId, otherEditorId] = users.map(({id}) => id);

    const makePost = (slug: string, ownerId: string, type: "BERITA" | "INFORMASI") =>
      prisma.post.create({
        data: {
          slug,
          type,
          status: "DRAFT",
          authorId: ownerId,
          contentOwnerId: ownerId,
          translations: {create: {
            locale: "id",
            title: `Judul ${slug}`,
            excerpt: null,
            content: "<p>Konten sintetis.</p>",
            status: "DRAFT",
          }},
        },
      });
    const posts = await Promise.all([
      makePost(`${marker}-owned`, editorId, "BERITA"),
      makePost(`${marker}-other`, otherEditorId, "BERITA"),
      makePost(`${marker}-wrong-type`, editorId, "INFORMASI"),
    ]);
    [ownedId, otherId, wrongTypeId] = posts.map(({id}) => id);
  });

  afterAll(async () => {
    const userIds = [adminId, editorId, otherEditorId].filter(Boolean);
    const posts = await prisma.post.findMany({
      where: {slug: {startsWith: marker}},
      select: {id: true},
    });
    const postIds = [...posts.map(({id}) => id), ownedId, otherId, wrongTypeId].filter(Boolean);
    await prisma.contentRevision.deleteMany({where: {resourceType: "Post", resourceId: {in: postIds}}});
    await prisma.activityLog.deleteMany({where: {resourceType: "Post", resourceId: {in: postIds}}});
    await prisma.post.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.user.deleteMany({where: {id: {in: userIds}}});
    await prisma.$disconnect();
  });

  it("scopes EDITOR list/detail to owned Berita while ADMIN can see both Berita", async () => {
    const query = {page: 1, pageSize: 20, status: "ALL", search: marker, sort: "UPDATED_DESC"};
    const editorList = await listAdminPosts(prisma, actor(editorId, "EDITOR"), query, clock);
    expect(editorList.ok && editorList.data.items.map(({id}) => id)).toEqual([ownedId]);

    const adminList = await listAdminPosts(prisma, actor(adminId, "ADMIN"), query, clock);
    expect(adminList.ok && new Set(adminList.data.items.map(({id}) => id))).toEqual(
      new Set([ownedId, otherId]),
    );
    const titleSorted = await listAdminPosts(prisma, actor(adminId, "ADMIN"), {
      ...query,
      sort: "TITLE_ASC",
    }, clock);
    expect(titleSorted.ok && titleSorted.data.items.map(({id}) => id)).toEqual([otherId, ownedId]);

    const own = await getAdminPostEditor(prisma, actor(editorId, "EDITOR"), ownedId, "/uploads", clock);
    expect(own).toMatchObject({ok: true, data: {id: ownedId, type: "BERITA"}});
    const crossOwner = await getAdminPostEditor(
      prisma, actor(editorId, "EDITOR"), otherId, "/uploads", clock,
    );
    const wrongType = await getAdminPostEditor(
      prisma, actor(editorId, "EDITOR"), wrongTypeId, "/uploads", clock,
    );
    const missing = await getAdminPostEditor(
      prisma, actor(editorId, "EDITOR"), "missing-post", "/uploads", clock,
    );
    expect(crossOwner).toEqual({ok: false, code: "NOT_FOUND"});
    expect(wrongType).toEqual(crossOwner);
    expect(missing).toEqual(crossOwner);
  });

  it("returns a strict safe cover view for a cover-bearing post, without storage internals", async () => {
    // Regression: safeCover previously spread the whole Media row (including storageKey/storageClass)
    // into the strict PublicMediaViewSchema, which rejected the extra keys — so every cover-bearing
    // post failed the editor view and getAdminPostEditor returned NOT_FOUND.
    const {createHash} = await import("node:crypto");
    const checksum = createHash("sha256").update(`${marker}-cover`).digest("hex");
    const media = await prisma.media.create({
      data: {
        storageKey: `2026/07/${checksum}.webp`,
        storageClass: "PUBLIC",
        checksumSha256: checksum,
        originalName: `${marker}-cover.png`,
        mimeType: "image/webp",
        size: 100,
        alt: "Cover accessible text",
        isDecorative: false,
        width: 640,
        height: 480,
        uploaderId: editorId,
      },
    });
    const covered = await prisma.post.create({
      data: {
        slug: `${marker}-covered`,
        type: "BERITA",
        status: "DRAFT",
        authorId: editorId,
        contentOwnerId: editorId,
        coverMediaId: media.id,
        translations: {create: {
          locale: "id",
          title: "Judul bersampul",
          excerpt: null,
          content: "<p>Konten.</p>",
          status: "DRAFT",
        }},
      },
    });

    const view = await getAdminPostEditor(prisma, actor(editorId, "EDITOR"), covered.id, "/uploads", clock);
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.data.coverMediaId).toBe(media.id);
    expect(view.data.cover).not.toBeNull();
    expect(view.data.cover?.id).toBe(media.id);
    expect(view.data.cover?.url).toBe(`/uploads/2026/07/${checksum}.webp`);
    // The safe view must not expose storage internals.
    expect(view.data.cover).not.toHaveProperty("storageKey");
    expect(view.data.cover).not.toHaveProperty("storageClass");

    await prisma.post.deleteMany({where: {id: covered.id}});
    await prisma.media.deleteMany({where: {id: media.id}});
  });

  it("deletes only an owned Berita with optimistic version and records an audit event", async () => {
    const denied = await executeAdminPostCommand(prisma, actor(editorId, "EDITOR"), {
      action: "DELETE",
      payload: {postId: otherId, expectedVersion: 1},
    }, clock);
    expect(denied).toEqual({ok: false, code: "NOT_FOUND"});
    expect(await prisma.post.findUnique({where: {id: otherId}})).not.toBeNull();

    const deleted = await executeAdminPostCommand(prisma, actor(editorId, "EDITOR"), {
      action: "DELETE",
      payload: {postId: ownedId, expectedVersion: 1},
    }, clock);
    expect(deleted).toMatchObject({ok: true, postId: ownedId, version: 2});
    expect(await prisma.post.findUnique({where: {id: ownedId}})).toBeNull();
    expect(await prisma.activityLog.findFirst({
      where: {resourceType: "Post", resourceId: ownedId, actorId: editorId},
    })).toMatchObject({action: "UPDATE", metadata: {operation: "DELETE", version: 2}});
  });
});
