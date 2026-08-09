import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {executePublicContentCommand} from "@/features/public-content/administration";
import {getPublicContentDetail} from "@/features/public-content/public-query";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("public content adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `m4-public-security-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let adminId = ""; let serviceId = "";
  const directIds: string[] = [];
  const admin = () => ({userId: adminId, role: "ADMIN" as const, isActive: true as const,
    mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});
  const payload = () => ({slug: `${marker}-public`, category: "UMUM" as const, link: null, icon: null,
    isActive: true, order: 0, contentOwnerId: adminId, expiresAt: null,
    translations: {id: {name: `${marker} Public`, description: null}}});

  beforeAll(async () => {
    await prisma.$connect();
    adminId = (await prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}@example.test`, role: "ADMIN", isActive: true}})).id;
    const created = await executePublicContentCommand(prisma, admin(), {action: "CREATE", resource: "SERVICE", payload: payload()}, now);
    if (!created.ok) throw new Error("Unable to create adversarial fixture.");
    serviceId = created.id;
    const fixtures = await Promise.all([
      prisma.service.create({data: {slug: `${marker}-hidden`, category: "UMUM", isActive: false,
        translations: {create: {...publishedTranslation("Hidden"), status: "PUBLISHED"}}}}),
      prisma.service.create({data: {slug: `${marker}-expired`, category: "UMUM", isActive: true, expiresAt: now,
        translations: {create: {...publishedTranslation("Expired"), status: "PUBLISHED"}}}}),
      prisma.service.create({data: {slug: `${marker}-draft`, category: "UMUM", isActive: true,
        translations: {create: {...publishedTranslation("Draft"), status: "DRAFT", reviewerId: null, reviewedAt: null}}}}),
      prisma.service.create({data: {slug: `${marker}-unsafe`, category: "UMUM", isActive: true, url: "https://127.0.0.1/private",
        translations: {create: {...publishedTranslation("Unsafe"), status: "PUBLISHED"}}}}),
    ]);
    directIds.push(...fixtures.map(({id}) => id));
  });

  function publishedTranslation(name: string) {
    return {locale: "id" as const, name, sourceVersion: 1, translatorId: adminId, reviewerId: adminId, reviewedAt: now};
  }

  afterAll(async () => {
    const ids = [serviceId, ...directIds].filter(Boolean);
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: adminId || "missing"}, {resourceId: {in: ids}}]}});
    await prisma.contentRevision.deleteMany({where: {resourceId: {in: ids}}});
    await prisma.service.deleteMany({where: {id: {in: ids}}});
    await prisma.user.deleteMany({where: {id: adminId || "missing"}});
    await prisma.$disconnect();
  });

  it("makes existing and missing targets identical to every non-ADMIN role before database work", async () => {
    const before = await prisma.activityLog.count({where: {resourceId: serviceId}});
    for (const role of ["EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      const actor = {...admin(), role};
      const existing = await executePublicContentCommand(prisma, actor, {action: "DELETE", resource: "SERVICE", id: serviceId, expectedVersion: 1}, now);
      const missing = await executePublicContentCommand(prisma, actor, {action: "DELETE", resource: "SERVICE", id: "missing-service", expectedVersion: 1}, now);
      expect(existing, role).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missing, role).toEqual(existing);
    }
    expect(await prisma.service.count({where: {id: serviceId}})).toBe(1);
    expect(await prisma.activityLog.count({where: {resourceId: serviceId}})).toBe(before);
  });

  it("rejects selector injection without changing parent, translations, revisions, or audit", async () => {
    const before = await Promise.all([
      prisma.service.count({where: {id: serviceId}}), prisma.serviceTranslation.count({where: {serviceId}}),
      prisma.contentRevision.count({where: {resourceId: serviceId}}), prisma.activityLog.count({where: {resourceId: serviceId}}),
    ]);
    expect(await executePublicContentCommand(prisma, admin(), {
      action: "UPDATE", resource: "SERVICE", mutation: {id: serviceId, expectedVersion: 1, where: {id: {not: serviceId}}}, payload: payload(),
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await Promise.all([
      prisma.service.count({where: {id: serviceId}}), prisma.serviceTranslation.count({where: {serviceId}}),
      prisma.contentRevision.count({where: {resourceId: serviceId}}), prisma.activityLog.count({where: {resourceId: serviceId}}),
    ])).toEqual(before);
  });

  it("makes missing, hidden, expired, untranslated, and unsafe records indistinguishable", async () => {
    const slugs = ["missing", "hidden", "expired", "draft", "unsafe"].map((suffix) => `${marker}-${suffix}`);
    const results = [];
    for (const slug of slugs) results.push(await getPublicContentDetail(prisma, {resource: "SERVICE", slug, locale: "id"}, now));
    expect(results).toEqual(results.map(() => ({ok: false, code: "NOT_FOUND"})));
    expect(JSON.stringify(results)).not.toMatch(/127\.0\.0\.1|private|owner|storage/i);
  });
});
