/**
 * @vitest-environment node
 */

import {createHash} from "node:crypto";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAdminMediaCommand,
  executeAdminMediaUpload,
  listAdminMedia,
} from "@/lib/content/media-admin-transport";
import {createPrismaClient} from "@/lib/db/client";
import {parseStorageRoots} from "@/lib/storage";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("M3 Media admin transport on PostgreSQL and filesystem", () => {
  const marker = `m3-media-admin-${Date.now()}`;
  const now = new Date("2026-07-22T01:00:00.000Z");
  let prisma: ReturnType<typeof createPrismaClient>;
  let editorId: string;
  let otherId: string;
  let base: string;
  let roots: ReturnType<typeof parseStorageRoots>;

  function actor(userId = editorId, role: "ADMIN" | "EDITOR" = "EDITOR"): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-22T09:00:00.000Z"),
    };
  }

  async function createMedia(ownerId: string, suffix: string) {
    const checksum = createHash("sha256").update(`${marker}-${suffix}`).digest("hex");
    const storageKey = `2026/07/${checksum}.webp`;
    const row = await prisma.media.create({data: {
      storageKey,
      storageClass: "PUBLIC",
      checksumSha256: checksum,
      originalName: `${marker}-${suffix}.png`,
      mimeType: "image/webp",
      size: 16,
      alt: `Media ${suffix}`,
      isDecorative: false,
      width: 16,
      height: 16,
      uploaderId: ownerId,
      createdAt: now,
    }});
    const destination = path.join(roots.PUBLIC, storageKey);
    await mkdir(path.dirname(destination), {recursive: true});
    await writeFile(destination, `file-${suffix}`);
    return {...row, destination};
  }

  async function pngFixture() {
    return sharp({
      create: {width: 2, height: 2, channels: 3, background: "#4169e1"},
    }).png().toBuffer();
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({data: {name: "Editor Media", email: `${marker}-editor@example.test`, role: "EDITOR"}}),
      prisma.user.create({data: {name: "Editor Lain", email: `${marker}-other@example.test`, role: "EDITOR"}}),
    ]);
    editorId = users[0]!.id;
    otherId = users[1]!.id;
    base = await mkdtemp(path.join(os.tmpdir(), "fuspi-media-admin-"));
    roots = parseStorageRoots({
      PUBLIC: path.join(base, "public"),
      PRIVATE: path.join(base, "private"),
      PPKS_PRIVATE: path.join(base, "ppks"),
    });
    await Promise.all(Object.values(roots).map((root) => mkdir(root, {recursive: true})));
  });

  afterAll(async () => {
    await prisma.post.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
    await rm(base, {recursive: true, force: true});
  });

  it("scopes picker/update/delete and blocks referenced Media", async () => {
    const owned = await createMedia(editorId, "owned");
    const other = await createMedia(otherId, "other");
    const referenced = await createMedia(editorId, "referenced");
    await prisma.post.create({data: {
      slug: `${marker}-post`,
      authorId: editorId,
      contentOwnerId: editorId,
      coverMediaId: referenced.id,
      translations: {create: {locale: "id", title: "Fixture", content: "<p>Fixture</p>"}},
    }});

    const editorList = await listAdminMedia(
      prisma, actor(), {page: 1, pageSize: 24, kind: "IMAGE"}, "/uploads", () => now,
    );
    expect(editorList.ok && editorList.data.items.map((item) => item.id))
      .toEqual(expect.arrayContaining([owned.id, referenced.id]));
    expect(editorList.ok && editorList.data.items.some((item) => item.id === other.id)).toBe(false);

    await expect(executeAdminMediaCommand(prisma, actor(), {
      action: "UPDATE_METADATA",
      payload: {mediaId: other.id, alt: "Serangan", isDecorative: false},
    }, roots, () => now)).resolves.toEqual({ok: false, code: "NOT_FOUND"});
    await expect(executeAdminMediaCommand(prisma, actor(), {
      action: "DELETE", payload: {mediaId: referenced.id},
    }, roots, () => now)).resolves.toEqual({ok: false, code: "MEDIA_IN_USE"});
    await expect(readFile(referenced.destination)).resolves.toBeDefined();

    await expect(executeAdminMediaCommand(prisma, actor(), {
      action: "DELETE", payload: {mediaId: owned.id},
    }, roots, () => now)).resolves.toEqual({ok: true, mediaId: owned.id});
    await expect(prisma.media.findUnique({where: {id: owned.id}})).resolves.toBeNull();
    await expect(readFile(owned.destination)).rejects.toMatchObject({code: "ENOENT"});
  });

  it("uploads a validated image and returns only the frozen batch response", async () => {
    const png = await pngFixture();
    const result = await executeAdminMediaUpload(prisma, actor(), {
      policy: "CMS_IMAGE",
      uploadCount: 1,
      intents: [{policy: "CMS_IMAGE", alt: "Fixture FUSPI", isDecorative: false}],
    }, [{name: `${marker}-upload.png`, mimeType: "image/png", bytes: png}], roots, () => now);
    expect(result).toMatchObject({ok: true, policy: "CMS_IMAGE", items: [{index: 0}]});
    if (!result.ok) throw new Error("Expected upload success.");
    const stored = await prisma.media.findUniqueOrThrow({where: {id: result.items[0]!.mediaId}});
    expect(stored.uploaderId).toBe(editorId);
    await expect(readFile(path.join(roots.PUBLIC, stored.storageKey))).resolves.toBeDefined();
  });

  it("commits the 20-image boundary and exactly one public PDF", async () => {
    const png = await pngFixture();
    const imageResult = await executeAdminMediaUpload(prisma, actor(), {
      policy: "CMS_IMAGE",
      uploadCount: 20,
      intents: Array.from({length: 20}, (_, index) => ({
        policy: "CMS_IMAGE",
        alt: `Fixture batch ${index + 1}`,
        isDecorative: false,
      })),
    }, Array.from({length: 20}, (_, index) => ({
      name: `${marker}-batch-${index + 1}.png`,
      mimeType: "image/png",
      bytes: png,
    })), roots, () => now);
    expect(imageResult.ok && imageResult.items).toHaveLength(20);

    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
    const pdfResult = await executeAdminMediaUpload(prisma, actor(), {
      policy: "PUBLIC_PDF",
      uploadCount: 1,
      intents: [{policy: "PUBLIC_PDF", alt: "", isDecorative: false}],
    }, [{name: `${marker}-document.pdf`, mimeType: "application/pdf", bytes: pdf}], roots, () => now);
    expect(pdfResult).toMatchObject({ok: true, policy: "PUBLIC_PDF", items: [{index: 0}]});
  });

  it("compensates an earlier commit when a later batch item fails", async () => {
    const png = await pngFixture();
    let transactionCalls = 0;
    const failing = {
      media: prisma.media,
      $transaction: async (input: unknown) => {
        transactionCalls += 1;
        if (transactionCalls === 2) throw new Error("synthetic second item failure");
        return prisma.$transaction(input as never);
      },
    } as unknown as typeof prisma;
    const result = await executeAdminMediaUpload(failing, actor(), {
      policy: "CMS_IMAGE",
      uploadCount: 2,
      intents: [
        {policy: "CMS_IMAGE", alt: "Compensate one", isDecorative: false},
        {policy: "CMS_IMAGE", alt: "Compensate two", isDecorative: false},
      ],
    }, [
      {name: `${marker}-compensate-one.png`, mimeType: "image/png", bytes: png},
      {name: `${marker}-compensate-two.png`, mimeType: "image/png", bytes: png},
    ], roots, () => now, () => undefined);
    expect(result.ok).toBe(false);
    await expect(prisma.media.count({
      where: {originalName: {startsWith: `${marker}-compensate`}},
    })).resolves.toBe(0);
  });
});
