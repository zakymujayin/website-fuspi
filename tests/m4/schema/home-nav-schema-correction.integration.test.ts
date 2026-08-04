import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("Home/Nav schema correction on PostgreSQL", () => {
  const prisma = createPrismaClient();
  const marker = `m4-home-schema-${Date.now()}`;
  let userId = ""; let mediaId = ""; let pageId = ""; let menuId = ""; let statisticId = ""; let settingId = "";

  beforeAll(async () => {
    await prisma.$connect();
    userId = (await prisma.user.create({data: {name: marker, email: `${marker}@example.test`, role: "ADMIN", isActive: true}})).id;
    const digest = createHash("sha256").update(marker).digest("hex");
    mediaId = (await prisma.media.create({data: {storageKey: `2026/08/${digest}.webp`, storageClass: "PUBLIC",
      checksumSha256: digest, originalName: `${marker}.webp`, mimeType: "image/webp", size: 100,
      alt: "Poster", isDecorative: false, width: 100, height: 100, uploaderId: userId}})).id;
    pageId = (await prisma.page.create({data: {slug: `${marker}-page`}})).id;
  });

  afterAll(async () => {
    await prisma.menuItem.deleteMany({where: {id: menuId || "missing"}});
    await prisma.siteSetting.deleteMany({where: {id: settingId || "missing"}});
    await prisma.statistic.deleteMany({where: {id: statisticId || "missing"}});
    await prisma.page.deleteMany({where: {id: pageId || "missing"}});
    await prisma.media.deleteMany({where: {id: mediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: userId || "missing"}});
    await prisma.$disconnect();
  });

  it("round-trips statistic suffix and video poster metadata", async () => {
    const statistic = await prisma.statistic.create({data: {value: "1250", suffix: "+", isVisible: false}});
    statisticId = statistic.id;
    expect(statistic.suffix).toBe("+");
    const setting = await prisma.siteSetting.create({data: {id: marker, videoUrl: "https://video.example.test/watch", videoPosterMediaId: mediaId}});
    settingId = setting.id;
    expect((await prisma.siteSetting.findUniqueOrThrow({where: {id: settingId}, include: {videoPoster: true}})).videoPoster?.id).toBe(mediaId);
  });

  it("accepts both new enum values without creating public content", async () => {
    const rows = await prisma.$queryRaw<Array<{intro: string; service: string}>>`
      SELECT 'INTRO'::"HomeSectionKey"::text AS intro, 'SERVICE'::"HomeSectionKey"::text AS service
    `;
    expect(rows).toEqual([{intro: "INTRO", service: "SERVICE"}]);
  });

  it("prevents deleting a Page while a MenuItem references it", async () => {
    menuId = (await prisma.menuItem.create({data: {location: "HEADER", pageId, isVisible: false}})).id;
    await expect(prisma.page.delete({where: {id: pageId}})).rejects.toMatchObject({code: "P2003"});
    expect(await prisma.page.count({where: {id: pageId}})).toBe(1);
    await prisma.menuItem.delete({where: {id: menuId}}); menuId = "";
  });
});
