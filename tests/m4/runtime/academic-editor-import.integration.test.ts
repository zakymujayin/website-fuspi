import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {executeAcademicPeopleImport, getAcademicEditorDetail} from "@/features/academic/editor-import";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic editor/import PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-editor-import-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let adminId = "";
  let programId = "";
  let mediaId = "";
  const lecturerIds: string[] = [];
  const staffIds: string[] = [];
  const contentIds: string[] = [];
  const actor = () => ({userId: adminId, role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});

  function lecturerRow(rowNumber: number) {
    return {rowNumber, resource: "LECTURER" as const, payload: {
      name: `${marker} Lecturer ${rowNumber}`, slug: `${marker}-lecturer-${rowNumber}`,
      nidn: `${marker}-nidn-${rowNumber}`, nip: `${marker}-nip-${rowNumber}`, orcid: null,
      googleScholarUrl: null, sintaUrl: null, scopusUrl: null, linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: `${marker}-${rowNumber}@example.test`, phone: "+62 21 555 5001",
      photoMediaId: mediaId, cvMediaId: null, studyProgramId: programId, order: rowNumber, isActive: true,
      translations: {
        id: {position: "Lektor", expertise: "Tafsir", bio: "<p>Bio.</p>", officeHours: null, officeLocation: null, quote: null},
        en: {position: "Lecturer", expertise: null, bio: null, officeHours: null, officeLocation: null, quote: null},
      },
    }};
  }

  function staffRow(rowNumber = 1) {
    return {rowNumber, resource: "STAFF" as const, payload: {
      name: `${marker} Staff ${rowNumber}`, slug: `${marker}-staff-${rowNumber}`,
      nip: `staff-${marker.slice(-13)}-${rowNumber}`, email: `${marker}-staff-${rowNumber}@example.test`, phone: null,
      photoMediaId: mediaId, order: rowNumber, isActive: true,
      translations: {id: {position: "Pranata", unit: "Akademik"}},
    }};
  }

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}-admin@example.test`, role: "ADMIN", isActive: true}});
    adminId = admin.id;
    const digest = createHash("sha256").update(marker).digest("hex");
    mediaId = (await prisma.media.create({data: {
      storageKey: `2026/08/${digest}.webp`, storageClass: "PUBLIC", checksumSha256: digest,
      originalName: `${marker}.webp`, mimeType: "image/webp", size: 512,
      alt: "Synthetic portrait", isDecorative: false, width: 320, height: 320, uploaderId: adminId,
    }})).id;
    programId = (await prisma.studyProgram.create({data: {
      code: "IH", slug: "ilmu-hadis", degree: "S1", order: 1, logoMediaId: mediaId, isActive: true,
      translations: {create: {locale: "id", name: "Ilmu Hadis", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
    }})).id;
  });

  afterAll(async () => {
    const ids = [...lecturerIds, ...staffIds, ...contentIds, programId].filter(Boolean);
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: adminId}, {resourceId: {in: ids}}]}});
    await prisma.contentRevision.deleteMany({where: {resourceId: {in: ids}}});
    await prisma.research.deleteMany({where: {id: {in: contentIds}}});
    await prisma.communityService.deleteMany({where: {id: {in: contentIds}}});
    await prisma.unit.deleteMany({where: {id: {in: contentIds}}});
    await prisma.lecturer.deleteMany({where: {id: {in: lecturerIds}}});
    await prisma.staff.deleteMany({where: {id: {in: staffIds}}});
    await prisma.studyProgram.deleteMany({where: {id: programId || "missing"}});
    await prisma.media.deleteMany({where: {id: mediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: adminId || "missing"}});
    await prisma.$disconnect();
  });

  it("previews every row without writing", async () => {
    const before = await prisma.lecturer.count();
    const result = await executeAcademicPeopleImport(prisma, actor(), {intent: "PREVIEW", atomic: true, rows: [lecturerRow(1), lecturerRow(2)]}, now);
    expect(result).toMatchObject({ok: true, intent: "PREVIEW", committed: false, summary: {total: 2, valid: 2, invalid: 0, created: 0}});
    expect(await prisma.lecturer.count()).toBe(before);
  });

  it("commits complete Lecturer and Staff batches with translations and audit", async () => {
    const lecturers = await executeAcademicPeopleImport(prisma, actor(), {intent: "COMMIT", atomic: true, rows: [lecturerRow(1), lecturerRow(2)]}, now);
    expect(lecturers.ok && lecturers.committed).toBe(true);
    if (!lecturers.ok || !lecturers.committed) return;
    lecturerIds.push(...lecturers.rows.map(({id}) => id).filter((id): id is string => id !== null));
    const staff = await executeAcademicPeopleImport(prisma, actor(), {intent: "COMMIT", atomic: true, rows: [staffRow()]}, now);
    expect(staff.ok && staff.committed).toBe(true);
    if (!staff.ok || !staff.committed) return;
    staffIds.push(...staff.rows.map(({id}) => id).filter((id): id is string => id !== null));
    expect(await prisma.lecturerTranslation.count({where: {lecturerId: {in: lecturerIds}}})).toBe(4);
    expect(await prisma.activityLog.count({where: {actorId: adminId, metadata: {path: ["operation"], equals: "IMPORT"}}})).toBe(3);
    const detail = await getAcademicEditorDetail(prisma, actor(), {resource: "LECTURER", id: lecturerIds[0]}, "/uploads", now);
    expect(detail.ok).toBe(true);
    if (detail.ok && detail.data.resource === "LECTURER") {
      expect(detail.data.input.nidn).toBe(`${marker}-nidn-1`);
      expect(detail.data.assets).toHaveLength(1);
      expect(JSON.stringify(detail)).not.toMatch(/storageKey|checksumSha256/i);
    }
  });

  it("loads contract-valid editor details for all six academic resources", async () => {
    const research = await prisma.research.create({data: {slug: `${marker}-research`, year: 2026,
      translations: {create: {locale: "id", title: `${marker} Research`, status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      lecturers: {create: {lecturerId: lecturerIds[0]!}}}});
    const community = await prisma.communityService.create({data: {slug: `${marker}-community`, year: 2026,
      translations: {create: {locale: "id", title: `${marker} Community`, status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      lecturers: {create: {lecturerId: lecturerIds[0]!}}}});
    const unit = await prisma.unit.create({data: {slug: `${marker}-unit`, type: "PUSAT_STUDI", isActive: true,
      translations: {create: {locale: "id", name: `${marker} Unit`, status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}}}});
    contentIds.push(research.id, community.id, unit.id);
    for (const [resource, id] of [
      ["STUDY_PROGRAM", programId], ["LECTURER", lecturerIds[0]], ["STAFF", staffIds[0]],
      ["RESEARCH", research.id], ["COMMUNITY_SERVICE", community.id], ["UNIT", unit.id],
    ] as const) {
      const result = await getAcademicEditorDetail(prisma, actor(), {resource, id}, "/uploads", now);
      expect(result.ok, `${resource} detail`).toBe(true);
    }
  });

  it("returns deterministic conflicts and commits none of a rejected batch", async () => {
    const before = await prisma.lecturer.count();
    const conflicting = lecturerRow(3);
    conflicting.payload.slug = `${marker}-lecturer-1`;
    const result = await executeAcademicPeopleImport(prisma, actor(), {intent: "COMMIT", atomic: true, rows: [conflicting, lecturerRow(4)]}, now);
    expect(result).toMatchObject({ok: true, intent: "COMMIT", committed: false, summary: {total: 2, invalid: 1, created: 0}});
    if (result.ok) expect(result.rows.map(({status}) => status)).toEqual(["INVALID", "VALID"]);
    expect(await prisma.lecturer.count()).toBe(before);
  });
});
