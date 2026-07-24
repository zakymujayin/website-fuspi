/**
 * @vitest-environment node
 */

import {createHash} from "node:crypto";
import {mkdir, mkdtemp, readFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {persistMediaUpload} from "@/lib/content/media-persistence";
import {createPrismaClient} from "@/lib/db/client";
import {parseStorageRoots, stageUpload} from "@/lib/storage";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("M3 Media persistence on PostgreSQL and filesystem", () => {
  const marker = `m3-media-${Date.now()}`;
  const now = new Date("2026-07-17T01:00:00.000Z");
  let prisma: ReturnType<typeof createPrismaClient>;
  let userId: string;
  let base: string;
  let roots: ReturnType<typeof parseStorageRoots>;

  function actor(): ActiveDatabaseSession {
    return {
      userId,
      role: "EDITOR",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-17T09:00:00.000Z"),
    };
  }

  function upload(seed: string) {
    const bytes = Buffer.from(`synthetic-${marker}-${seed}`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    return {
      policy: "CMS_IMAGE" as const,
      validated: {
        storageClass: "PUBLIC" as const,
        storageKey: `2026/07/${checksum}.webp`,
        originalName: `${marker}-${seed}.webp`,
        mimeType: "image/webp" as const,
        size: bytes.byteLength,
        checksumSha256: checksum,
        width: 16,
        height: 16,
        bytes,
      },
      record: {
        policy: "CMS_IMAGE" as const,
        storageClass: "PUBLIC" as const,
        storageKey: `2026/07/${checksum}.webp`,
        originalName: `${marker}-${seed}.webp`,
        mimeType: "image/webp" as const,
        size: bytes.byteLength,
        checksumSha256: checksum,
        width: 16,
        height: 16,
        alt: "Fixture Media FUSPI",
        isDecorative: false,
      },
    };
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    userId = (await prisma.user.create({
      data: {
        name: "M3 Media Editor",
        email: `${marker}@example.test`,
        role: "EDITOR",
      },
    })).id;
    base = await mkdtemp(path.join(os.tmpdir(), "fuspi-m3-media-"));
    roots = parseStorageRoots({
      PUBLIC: path.join(base, "public"),
      PRIVATE: path.join(base, "private"),
      PPKS_PRIVATE: path.join(base, "ppks"),
    });
    await Promise.all(Object.values(roots).map((root) => mkdir(root, {recursive: true})));
  });

  afterAll(async () => {
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
    await rm(base, {recursive: true, force: true});
  });

  it("commits the file and Media row with the session-derived uploader", async () => {
    const candidate = upload("success");
    const staged = await stageUpload(candidate.validated, roots);
    const result = await persistMediaUpload(
      prisma, actor(), candidate.record, staged, roots, () => now,
    );
    expect(result).toMatchObject({ok: true, storageState: "COMMITTED"});
    if (!result.ok) throw new Error("Expected committed Media.");
    const stored = await prisma.media.findUniqueOrThrow({where: {id: result.mediaId}});
    expect(stored).toMatchObject({
      storageKey: candidate.record.storageKey,
      uploaderId: userId,
      createdAt: now,
    });
    await expect(readFile(
      path.join(roots.PUBLIC, candidate.record.storageKey),
    )).resolves.toEqual(Buffer.from(candidate.validated.bytes));
  });

  it("duplicate database keys discard staging without overwriting the committed file", async () => {
    const candidate = upload("duplicate");
    const first = await stageUpload(candidate.validated, roots);
    const firstResult = await persistMediaUpload(
      prisma, actor(), candidate.record, first, roots, () => now,
    );
    expect(firstResult.ok).toBe(true);
    const destination = path.join(roots.PUBLIC, candidate.record.storageKey);
    const original = await readFile(destination);

    const second = await stageUpload(candidate.validated, roots);
    const secondResult = await persistMediaUpload(
      prisma, actor(), candidate.record, second, roots, () => now,
    );
    expect(secondResult).toEqual({
      ok: false,
      code: "DATABASE_WRITE_FAILED",
      storageState: "DISCARDED",
    });
    await expect(readFile(destination)).resolves.toEqual(original);
    await expect(prisma.media.count({
      where: {storageKey: candidate.record.storageKey},
    })).resolves.toBe(1);
  });
});
