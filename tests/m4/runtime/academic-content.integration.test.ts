import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  executeAcademicContentCommand,
  listAcademicContent,
  listPublicAcademicContent,
} from "@/features/academic/content";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic content PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-content-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let adminId = "";
  let lecturerOne = "";
  let lecturerTwo = "";
  let researchId = "";
  let communityId = "";
  let unitId = "";
  const actor = () => ({userId: adminId, role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}-admin@example.test`, role: "ADMIN", isActive: true}});
    adminId = admin.id;
    const lecturers = await Promise.all([
      prisma.lecturer.create({data: {name: `${marker} One`, slug: `${marker}-one`, isActive: true, translations: {create: {locale: "id", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}}}}),
      prisma.lecturer.create({data: {name: `${marker} Two`, slug: `${marker}-two`, isActive: true, translations: {create: {locale: "id", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}}}}),
    ]);
    [lecturerOne, lecturerTwo] = lecturers.map(({id}) => id);
  });

  afterAll(async () => {
    const ids = [researchId, communityId, unitId].filter(Boolean);
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: adminId}, {resourceId: {in: ids}}]}});
    await prisma.contentRevision.deleteMany({where: {resourceId: {in: ids}}});
    await prisma.research.deleteMany({where: {id: researchId || "missing"}});
    await prisma.communityService.deleteMany({where: {id: communityId || "missing"}});
    await prisma.unit.deleteMany({where: {id: unitId || "missing"}});
    await prisma.lecturer.deleteMany({where: {id: {in: [lecturerOne, lecturerTwo].filter(Boolean)}}});
    await prisma.user.deleteMany({where: {id: adminId || "missing"}});
    await prisma.$disconnect();
  });

  it("creates research and replaces lecturer relations atomically", async () => {
    const created = await executeAcademicContentCommand(prisma, actor(), {
      action: "CREATE", resource: "RESEARCH", payload: {
        slug: `${marker}-research`, year: 2026,
        documentUrl: {kind: "EXTERNAL", href: "https://repository.example.test/research"},
        lecturerIds: [lecturerOne],
        translations: {id: {title: `${marker} Penelitian`, abstract: "<p>Abstrak.</p>"}, en: {title: `${marker} Research`, abstract: null}},
      },
    }, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    researchId = created.id;
    expect(await prisma.lecturerResearch.findMany({where: {researchId}, select: {lecturerId: true}})).toEqual([{lecturerId: lecturerOne}]);
    const updated = await executeAcademicContentCommand(prisma, actor(), {
      action: "UPDATE", resource: "RESEARCH", mutation: {id: researchId, expectedVersion: null}, payload: {
        slug: `${marker}-research`, year: 2027, documentUrl: null, lecturerIds: [lecturerTwo],
        translations: {id: {title: `${marker} Penelitian Baru`, abstract: null}},
      },
    }, now);
    expect(updated.ok).toBe(true);
    expect(await prisma.lecturerResearch.findMany({where: {researchId}, select: {lecturerId: true}})).toEqual([{lecturerId: lecturerTwo}]);
    expect((await prisma.research.findUniqueOrThrow({where: {id: researchId}})).year).toBe(2027);
  });

  it("rolls back a relation replacement when any lecturer is missing", async () => {
    const before = await prisma.research.findUniqueOrThrow({where: {id: researchId}, include: {lecturers: true, translations: true}});
    expect(await executeAcademicContentCommand(prisma, actor(), {
      action: "UPDATE", resource: "RESEARCH", mutation: {id: researchId, expectedVersion: null}, payload: {
        slug: `${marker}-changed`, year: 2028, documentUrl: null, lecturerIds: [lecturerOne, "missing-lecturer"],
        translations: {id: {title: "Should roll back", abstract: null}},
      },
    }, now)).toEqual({ok: false, code: "RELATION_INVALID"});
    const after = await prisma.research.findUniqueOrThrow({where: {id: researchId}, include: {lecturers: true, translations: true}});
    expect(after.slug).toBe(before.slug);
    expect(after.year).toBe(before.year);
    expect(after.lecturers).toEqual(before.lecturers);
  });

  it("creates community service and exposes only published ID fallback", async () => {
    const created = await executeAcademicContentCommand(prisma, actor(), {
      action: "CREATE", resource: "COMMUNITY_SERVICE", payload: {
        slug: `${marker}-community`, year: 2026, location: "Serang", documentUrl: null,
        lecturerIds: [lecturerOne, lecturerTwo],
        translations: {id: {title: `${marker} Pengabdian`, description: "<p>Kegiatan.</p>"}, ar: {title: "خدمة المجتمع", description: null}},
      },
    }, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    communityId = created.id;
    const publicResult = await listPublicAcademicContent(prisma, {resource: "COMMUNITY_SERVICE", page: 1, pageSize: 20, search: marker, direction: "ASC"}, "ar");
    expect(publicResult.ok).toBe(true);
    if (publicResult.ok) {
      expect(publicResult.data.items).toHaveLength(1);
      expect(publicResult.data.items[0]?.name).toBe(`${marker} Pengabdian`);
      expect(JSON.stringify(publicResult)).not.toMatch(/documentUrl|lecturerId|phone|storage/i);
    }
  });

  it("applies optimistic Unit revisions and active-only public visibility", async () => {
    const payload = {slug: `${marker}-unit`, type: "PUSAT_STUDI" as const, email: `${marker}-unit@example.test`, phone: "+62 21 555 4001",
      externalUrl: {kind: "EXTERNAL" as const, href: "https://unit.example.test/home"}, isActive: true, contentOwnerId: adminId,
      translations: {id: {name: `${marker} Unit`, description: "<p>Unit.</p>"}, en: {name: `${marker} Unit EN`, description: null}}};
    const created = await executeAcademicContentCommand(prisma, actor(), {action: "CREATE", resource: "UNIT", payload}, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    unitId = created.id;
    expect(await prisma.contentRevision.count({where: {resourceType: "Unit", resourceId: unitId}})).toBe(3);
    expect(await executeAcademicContentCommand(prisma, actor(), {action: "UPDATE", resource: "UNIT", mutation: {id: unitId, expectedVersion: 99}, payload}, now))
      .toEqual({ok: false, code: "VERSION_CONFLICT"});
    const updated = await executeAcademicContentCommand(prisma, actor(), {action: "UPDATE", resource: "UNIT", mutation: {id: unitId, expectedVersion: 1}, payload: {...payload, isActive: false}}, now);
    expect(updated).toEqual({ok: true, id: unitId, resource: "UNIT", version: 2});
    const publicResult = await listPublicAcademicContent(prisma, {resource: "UNIT", page: 1, pageSize: 20, search: marker}, "id");
    expect(publicResult.ok && publicResult.data.items).toHaveLength(0);
    const adminResult = await listAcademicContent(prisma, actor(), {resource: "UNIT", page: 1, pageSize: 20, search: marker, active: "INACTIVE"}, now);
    expect(adminResult.ok && adminResult.data.items).toHaveLength(1);
  });
});
