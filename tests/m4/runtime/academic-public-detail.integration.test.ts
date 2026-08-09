import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {getPublicAcademicDetail} from "@/features/academic/public-detail";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic public detail PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-public-detail-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let userId = "";
  let publicMediaId = "";
  let privateMediaId = "";
  let documentId = "";
  let programId = "";
  let lecturerId = "";
  let inactiveLecturerId = "";
  let draftLecturerId = "";
  let staffId = "";
  let researchId = "";
  let communityId = "";
  let unitId = "";

  beforeAll(async () => {
    await prisma.$connect();
    userId = (await prisma.user.create({data: {name: `${marker} User`, email: `${marker}@example.test`, role: "ADMIN", isActive: true}})).id;
    const digest = (value: string) => createHash("sha256").update(`${marker}-${value}`).digest("hex");
    const [publicMedia, privateMedia] = await Promise.all([
      prisma.media.create({data: {storageKey: `2026/08/${digest("public")}.webp`, storageClass: "PUBLIC", checksumSha256: digest("public"), originalName: `${marker}-public.webp`, mimeType: "image/webp", size: 512, alt: "Public portrait", isDecorative: false, width: 320, height: 320, uploaderId: userId}}),
      prisma.media.create({data: {storageKey: `2026/08/${digest("private")}.webp`, storageClass: "PRIVATE", checksumSha256: digest("private"), originalName: `${marker}-private.webp`, mimeType: "image/webp", size: 512, alt: "Private portrait", isDecorative: false, width: 320, height: 320, uploaderId: userId}}),
    ]);
    publicMediaId = publicMedia.id;
    privateMediaId = privateMedia.id;
    documentId = (await prisma.document.create({data: {
      slug: `${marker}-curriculum`, storageKey: `2026/08/${digest("document")}.pdf`, storageClass: "PUBLIC",
      mimeType: "application/pdf", size: 1024, publishedAt: now,
      translations: {create: {locale: "id", title: `${marker} Kurikulum`, status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
    }})).id;
    programId = (await prisma.studyProgram.create({data: {
      code: "AFI", slug: "aqidah-dan-filsafat-islam", degree: "S1", order: 2, isActive: true,
      email: `${marker}-afi@example.test`, phone: "+62 21 555 6001", logoMediaId: publicMediaId, curriculumDocumentId: documentId,
      translations: {create: {locale: "id", name: "Aqidah dan Filsafat Islam", description: "<p>Deskripsi prodi.</p>", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
    }})).id;
    const [lecturer, inactive, draft] = await Promise.all([
      prisma.lecturer.create({data: {name: `${marker} Lecturer`, slug: `${marker}-lecturer`, nidn: "secret-nidn", nip: "secret-nip", phone: "+62000", email: `${marker}-lecturer@example.test`, photoMediaId: privateMediaId, studyProgramId: programId, isActive: true,
        translations: {create: {locale: "id", position: "Lektor", bio: "<p>Bio.</p>", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}}}}),
      prisma.lecturer.create({data: {name: `${marker} Inactive`, slug: `${marker}-inactive`, isActive: false,
        translations: {create: {locale: "id", position: "Tidak aktif", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}}}}),
      prisma.lecturer.create({data: {name: `${marker} Draft`, slug: `${marker}-draft`, isActive: true,
        translations: {create: {locale: "id", position: "Draft", status: "DRAFT"}}}}),
    ]);
    lecturerId = lecturer.id;
    inactiveLecturerId = inactive.id;
    draftLecturerId = draft.id;
    staffId = (await prisma.staff.create({data: {name: `${marker} Staff`, slug: `${marker}-staff`, nip: "private-staff-nip", phone: "+62001", email: `${marker}-staff@example.test`, isActive: true,
      translations: {create: {locale: "id", position: "Pranata", unit: "Akademik", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}}}})).id;
    researchId = (await prisma.research.create({data: {slug: `${marker}-research`, year: 2026, documentUrl: "https://repository.example.test/item",
      translations: {create: {locale: "id", title: `${marker} Research`, abstract: "<p>Abstract.</p>", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
      lecturers: {create: [{lecturerId}, {lecturerId: inactiveLecturerId}]}}})).id;
    communityId = (await prisma.communityService.create({data: {slug: `${marker}-community`, year: 2026, location: "Serang",
      translations: {create: {locale: "id", title: `${marker} Community`, description: "<p>Activity.</p>", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}},
      lecturers: {create: [{lecturerId}, {lecturerId: inactiveLecturerId}]}}})).id;
    unitId = (await prisma.unit.create({data: {slug: `${marker}-unit`, type: "PUSAT_STUDI", email: `${marker}-unit@example.test`, phone: "+62002", externalUrl: "https://unit.example.test/home", isActive: true,
      translations: {create: {locale: "id", name: `${marker} Unit`, description: "<p>Unit.</p>", status: "PUBLISHED", reviewerId: userId, reviewedAt: now}}}})).id;
  });

  afterAll(async () => {
    await prisma.research.deleteMany({where: {id: researchId || "missing"}});
    await prisma.communityService.deleteMany({where: {id: communityId || "missing"}});
    await prisma.unit.deleteMany({where: {id: unitId || "missing"}});
    await prisma.lecturer.deleteMany({where: {id: {in: [lecturerId, inactiveLecturerId, draftLecturerId].filter(Boolean)}}});
    await prisma.staff.deleteMany({where: {id: staffId || "missing"}});
    await prisma.studyProgram.deleteMany({where: {id: programId || "missing"}});
    await prisma.document.deleteMany({where: {id: documentId || "missing"}});
    await prisma.media.deleteMany({where: {id: {in: [publicMediaId, privateMediaId].filter(Boolean)}}});
    await prisma.user.deleteMany({where: {id: userId || "missing"}});
    await prisma.$disconnect();
  });

  it("loads all six public details with Indonesian fallback", async () => {
    for (const [resource, slug] of [
      ["STUDY_PROGRAM", "aqidah-dan-filsafat-islam"], ["LECTURER", `${marker}-lecturer`],
      ["STAFF", `${marker}-staff`], ["RESEARCH", `${marker}-research`],
      ["COMMUNITY_SERVICE", `${marker}-community`], ["UNIT", `${marker}-unit`],
    ] as const) {
      const result = await getPublicAcademicDetail(prisma, {resource, slug, locale: "en"});
      expect(result.ok, resource).toBe(true);
      if (result.ok) expect(result.data.translation).toMatchObject({resolvedLocale: "id", isFallback: true});
    }
  });

  it("filters inactive related lecturers independently", async () => {
    for (const [resource, slug] of [["RESEARCH", `${marker}-research`], ["COMMUNITY_SERVICE", `${marker}-community`]] as const) {
      const result = await getPublicAcademicDetail(prisma, {resource, slug, locale: "id"});
      expect(result.ok).toBe(true);
      if (result.ok && (result.data.resource === "RESEARCH" || result.data.resource === "COMMUNITY_SERVICE")) {
        expect(result.data.lecturers.map(({id}) => id)).toEqual([lecturerId]);
      }
    }
  });

  it("makes absent, inactive, and untranslated profiles indistinguishable", async () => {
    const missing = await getPublicAcademicDetail(prisma, {resource: "LECTURER", slug: `${marker}-missing`, locale: "id"});
    const inactive = await getPublicAcademicDetail(prisma, {resource: "LECTURER", slug: `${marker}-inactive`, locale: "id"});
    const draft = await getPublicAcademicDetail(prisma, {resource: "LECTURER", slug: `${marker}-draft`, locale: "id"});
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
    expect(inactive).toEqual(missing);
    expect(draft).toEqual(missing);
  });

  it("omits private photos and all private person/unit fields", async () => {
    const lecturer = await getPublicAcademicDetail(prisma, {resource: "LECTURER", slug: `${marker}-lecturer`, locale: "id"});
    expect(lecturer.ok).toBe(true);
    if (lecturer.ok && lecturer.data.resource === "LECTURER") expect(lecturer.data.photo).toBeNull();
    const combined = JSON.stringify([
      lecturer,
      await getPublicAcademicDetail(prisma, {resource: "STAFF", slug: `${marker}-staff`, locale: "id"}),
      await getPublicAcademicDetail(prisma, {resource: "UNIT", slug: `${marker}-unit`, locale: "id"}),
    ]);
    expect(combined).not.toMatch(/nidn|nip|phone|storageKey|checksum|contentOwner|reviewer/i);
  });

  it("returns public PDF metadata without exposing its storage key", async () => {
    const result = await getPublicAcademicDetail(prisma, {resource: "STUDY_PROGRAM", slug: "aqidah-dan-filsafat-islam", locale: "id"});
    expect(result.ok).toBe(true);
    if (result.ok && result.data.resource === "STUDY_PROGRAM") expect(result.data.curriculumDocument?.id).toBe(documentId);
    expect(JSON.stringify(result)).not.toMatch(/storageKey|checksum/i);
  });
});
