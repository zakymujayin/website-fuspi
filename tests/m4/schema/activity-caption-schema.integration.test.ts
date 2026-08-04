import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("ActivityImage caption on PostgreSQL", () => {
  const prisma = createPrismaClient();
  const marker = `m4-activity-caption-${Date.now()}`;
  let userId = ""; let mediaId = ""; let activityId = "";

  beforeAll(async () => {
    await prisma.$connect();
    userId = (await prisma.user.create({data: {name: marker, email: `${marker}@example.test`, role: "ADMIN", isActive: true}})).id;
    const digest = createHash("sha256").update(marker).digest("hex");
    mediaId = (await prisma.media.create({data: {storageKey: `2026/08/${digest}.webp`, storageClass: "PUBLIC", checksumSha256: digest, originalName: `${marker}.webp`, mimeType: "image/webp", size: 100, alt: "Activity", isDecorative: false, width: 100, height: 100, uploaderId: userId}})).id;
    activityId = (await prisma.studentActivity.create({data: {slug: `${marker}-activity`}})).id;
  });

  afterAll(async () => {
    await prisma.studentActivity.deleteMany({where: {id: activityId || "missing"}});
    await prisma.media.deleteMany({where: {id: mediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: userId || "missing"}});
    await prisma.$disconnect();
  });

  it("round-trips an optional activity image caption", async () => {
    const row = await prisma.activityImage.create({data: {studentActivityId: activityId, mediaId, caption: `${marker} Caption`, order: 0}});
    expect(row.caption).toBe(`${marker} Caption`);
    await prisma.activityImage.delete({where: {id: row.id}});
  });
});
