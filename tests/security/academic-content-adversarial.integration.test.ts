import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  executeAcademicContentCommand,
  listAcademicContent,
  normalizeAcademicContentSearchParams,
  type AcademicContentDatabase,
} from "@/features/academic/content";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic content adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-content-adversarial-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const users: Array<{id: string; role: "ADMIN" | "EDITOR" | "PETUGAS" | "SATGAS_PPKS"}> = [];
  let researchId = "";
  const actor = (user: typeof users[number]) => ({userId: user.id, role: user.role, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});

  beforeAll(async () => {
    await prisma.$connect();
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      const user = await prisma.user.create({data: {name: `${marker} ${role}`, email: `${marker}-${role.toLowerCase()}@example.test`, role, isActive: true}});
      users.push({id: user.id, role});
    }
    researchId = (await prisma.research.create({data: {
      slug: `${marker}-research`, year: 2026,
      translations: {create: {locale: "id", title: `${marker} Research`, status: "PUBLISHED", reviewerId: users[0]!.id, reviewedAt: now}},
    }})).id;
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: {in: users.map(({id}) => id)}}, {resourceId: researchId}]}});
    await prisma.research.deleteMany({where: {id: researchId || "missing"}});
    await prisma.user.deleteMany({where: {id: {in: users.map(({id}) => id)}}});
    await prisma.$disconnect();
  });

  it("makes existing and missing records indistinguishable to non-ADMIN roles", async () => {
    for (const user of users.filter(({role}) => role !== "ADMIN")) {
      const existing = await executeAcademicContentCommand(prisma, actor(user), {action: "DELETE", resource: "RESEARCH", id: researchId}, now);
      const missing = await executeAcademicContentCommand(prisma, actor(user), {action: "DELETE", resource: "RESEARCH", id: "missing-research"}, now);
      expect(existing).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missing).toEqual(existing);
    }
    expect(await prisma.research.findUnique({where: {id: researchId}})).not.toBeNull();
  });

  it("rejects query/command injection without changing rows", async () => {
    expect(normalizeAcademicContentSearchParams(new URLSearchParams("resource=RESEARCH&page=1&page=2&where[year]=2026")))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
    const before = await Promise.all([prisma.research.count(), prisma.activityLog.count({where: {resourceType: "Research"}})]);
    expect(await executeAcademicContentCommand(prisma, actor(users[0]!), {
      action: "UPDATE", resource: "RESEARCH", mutation: {id: researchId, expectedVersion: null}, payload: {
        slug: `${marker}-injected`, year: 2026, documentUrl: null, lecturerIds: [],
        translations: {id: {title: "Injected", abstract: null}}, where: {id: {not: researchId}},
      },
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await Promise.all([prisma.research.count(), prisma.activityLog.count({where: {resourceType: "Research"}})])).toEqual(before);
  });

  it("normalizes thrown database details and invalid ADMIN states", async () => {
    const admin = actor(users[0]!);
    for (const invalid of [{...admin, expiresAt: now}, {...admin, isActive: false}, {...admin, mustChangePassword: true}]) {
      expect(await listAcademicContent(prisma, invalid, {resource: "RESEARCH"}, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    }
    const database = {$transaction: () => Promise.reject(new Error("postgresql://secret@host/database")), research: {}} as unknown as AcademicContentDatabase;
    const result = await listAcademicContent(database, admin, {resource: "RESEARCH"}, now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
