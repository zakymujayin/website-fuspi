import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  getPublicAcademicDetail,
  type AcademicPublicDetailDatabase,
} from "@/features/academic/public-detail";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic public detail adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-public-detail-adversarial-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let userId = "";
  let safeUnitId = "";
  let unsafeUnitId = "";

  beforeAll(async () => {
    await prisma.$connect();
    userId = (await prisma.user.create({data: {
      name: `${marker} Reviewer`, email: `${marker}@example.test`, role: "ADMIN", isActive: true,
    }})).id;
    safeUnitId = (await prisma.unit.create({data: {
      slug: `${marker}-safe`, type: "PUSAT_STUDI", email: `${marker}-unit@example.test`,
      phone: "+62 21 555 7777", externalUrl: "https://unit.example.test/public", isActive: true,
      translations: {create: {locale: "id", name: `${marker} Safe`, status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
    }})).id;
    unsafeUnitId = (await prisma.unit.create({data: {
      slug: `${marker}-unsafe`, type: "PUSAT_STUDI", externalUrl: "https://127.0.0.1/private", isActive: true,
      translations: {create: {locale: "id", name: `${marker} Unsafe`, status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
    }})).id;
  });

  afterAll(async () => {
    await prisma.unit.deleteMany({where: {id: {in: [safeUnitId, unsafeUnitId].filter(Boolean)}}});
    await prisma.user.deleteMany({where: {id: userId || "missing"}});
    await prisma.$disconnect();
  });

  it("rejects selector injection without reading or changing public rows", async () => {
    const before = await prisma.unit.count({where: {id: {in: [safeUnitId, unsafeUnitId]}}});
    expect(await getPublicAcademicDetail(prisma, {
      resource: "UNIT", slug: `${marker}-safe`, locale: "id", where: {phone: {not: null}},
    })).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(await prisma.unit.count({where: {id: {in: [safeUnitId, unsafeUnitId]}}})).toBe(before);
  });

  it("makes unsafe legacy URLs indistinguishable from missing records", async () => {
    const unsafe = await getPublicAcademicDetail(prisma, {resource: "UNIT", slug: `${marker}-unsafe`, locale: "id"});
    const missing = await getPublicAcademicDetail(prisma, {resource: "UNIT", slug: `${marker}-missing`, locale: "id"});
    expect(unsafe).toEqual({ok: false, code: "NOT_FOUND"});
    expect(missing).toEqual(unsafe);
  });

  it("does not expose private unit or workflow fields", async () => {
    const result = await getPublicAcademicDetail(prisma, {resource: "UNIT", slug: `${marker}-safe`, locale: "id"});
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/phone|reviewer|reviewedAt|contentOwner|storageKey|checksum/i);
  });

  it("normalizes database failures without returning technical details", async () => {
    const database = {unit: {findFirst: () => Promise.reject(new Error("postgresql://secret@host/database"))}} as unknown as AcademicPublicDetailDatabase;
    const result = await getPublicAcademicDetail(database, {resource: "UNIT", slug: `${marker}-safe`, locale: "id"});
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
