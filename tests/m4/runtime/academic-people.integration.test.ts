import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAcademicPeopleCommand,
  listAcademicPeople,
  listPublicAcademicPeople,
} from "@/features/academic/people";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("academic people PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-people-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  let adminId = "";
  let publicMediaId = "";
  let privateMediaId = "";
  let publicDocumentId = "";
  let privateDocumentId = "";
  let programId = "";
  let lecturerId = "";
  let secondLecturerId = "";
  let staffId = "";
  const resourceIds = new Set<string>();

  function digest(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  function actor(): ActiveDatabaseSession {
    return {
      userId: adminId,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-08-04T11:00:00.000Z"),
    };
  }

  function programPayload(options: {
    code?: "IAT" | "IH";
    logoMediaId?: string | null;
    curriculumDocumentId?: string | null;
    accreditation?: string | null;
  } = {}) {
    const code = options.code ?? "IAT";
    const identity = code === "IAT"
      ? {slug: "ilmu-al-quran-dan-tafsir", order: 0, name: "Ilmu Al-Qur’an dan Tafsir"}
      : {slug: "ilmu-hadis", order: 1, name: "Ilmu Hadis"};
    return {
      code,
      slug: identity.slug,
      degree: "S1" as const,
      accreditation: options.accreditation ?? "Unggul",
      accreditationExpiry: "2028-08-04T00:00:00.000+07:00",
      externalUrl: null,
      email: `${code.toLowerCase()}-${marker}@example.test`,
      phone: "+62 21 555 0101",
      logoMediaId: options.logoMediaId === undefined ? publicMediaId : options.logoMediaId,
      curriculumDocumentId: options.curriculumDocumentId === undefined
        ? publicDocumentId
        : options.curriculumDocumentId,
      brochureDocumentId: null,
      isActive: true,
      order: identity.order,
      contentOwnerId: adminId,
      translations: {
        id: {
          name: identity.name,
          description: `<p>${marker} deskripsi.</p>`,
          vision: null,
          mission: null,
          objectives: null,
          graduateProfile: null,
          careerProspects: null,
          learningOutcomes: null,
        },
        en: {
          name: `${identity.name} EN`,
          description: `<p>${marker} description.</p>`,
          vision: null,
          mission: null,
          objectives: null,
          graduateProfile: null,
          careerProspects: null,
          learningOutcomes: null,
        },
      },
    };
  }

  function lecturerPayload(options: {slug?: string; nidn?: string; name?: string} = {}) {
    return {
      name: options.name ?? `${marker} Lecturer One`,
      slug: options.slug ?? `${marker}-lecturer-one`,
      nidn: options.nidn ?? `${marker}-nidn-one`,
      nip: `${marker}-nip-${options.slug?.endsWith("two") ? "two" : "one"}`,
      orcid: null,
      googleScholarUrl: {kind: "EXTERNAL" as const, href: "https://scholar.google.com/example"},
      sintaUrl: null,
      email: `${marker}-lecturer@example.test`,
      phone: "+62 21 555 0202",
      photoMediaId: publicMediaId,
      studyProgramId: programId,
      order: 1,
      isActive: true,
      translations: {
        id: {position: "Lektor", expertise: "Tafsir", bio: `<p>${marker} bio.</p>`, officeHours: "Senin"},
        ar: {position: "محاضر", expertise: null, bio: null, officeHours: null},
      },
    };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.user.create({data: {
      name: `${marker} Admin`,
      email: `${marker}-admin@example.test`,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    }});
    adminId = admin.id;
    const [publicMedia, privateMedia] = await Promise.all([
      prisma.media.create({data: {
        storageKey: `2026/08/${digest(`${marker}-public`)}.webp`,
        storageClass: "PUBLIC",
        checksumSha256: "a".repeat(64),
        originalName: `${marker}-public.webp`,
        mimeType: "image/webp",
        size: 512,
        alt: "Synthetic academic portrait",
        isDecorative: false,
        width: 320,
        height: 320,
        uploaderId: adminId,
      }}),
      prisma.media.create({data: {
        storageKey: `2026/08/${digest(`${marker}-private`)}.webp`,
        storageClass: "PRIVATE",
        checksumSha256: "b".repeat(64),
        originalName: `${marker}-private.webp`,
        mimeType: "image/webp",
        size: 512,
        alt: "Synthetic private portrait",
        isDecorative: false,
        width: 320,
        height: 320,
        uploaderId: adminId,
      }}),
    ]);
    publicMediaId = publicMedia.id;
    privateMediaId = privateMedia.id;
    const [publicDocument, privateDocument] = await Promise.all([
      prisma.document.create({data: {
        slug: `${marker}-curriculum`,
        storageKey: `2026/08/${digest(`${marker}-curriculum`)}.pdf`,
        storageClass: "PUBLIC",
        mimeType: "application/pdf",
        size: 1_024,
        publishedAt: now,
        translations: {create: {locale: "id", title: `${marker} Kurikulum`, status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      }}),
      prisma.document.create({data: {
        slug: `${marker}-private-document`,
        storageKey: `2026/08/${digest(`${marker}-private-document`)}.pdf`,
        storageClass: "PRIVATE",
        mimeType: "application/pdf",
        size: 1_024,
        translations: {create: {locale: "id", title: `${marker} Private`, status: "DRAFT"}},
      }}),
    ]);
    publicDocumentId = publicDocument.id;
    privateDocumentId = privateDocument.id;
  });

  afterAll(async () => {
    const ids = [...resourceIds];
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: adminId}, {resourceId: {in: ids}}]}});
    await prisma.contentRevision.deleteMany({where: {resourceId: {in: ids}}});
    await prisma.lecturer.deleteMany({where: {id: {in: [lecturerId, secondLecturerId].filter(Boolean)}}});
    await prisma.staff.deleteMany({where: {id: staffId || "missing"}});
    await prisma.studyProgram.deleteMany({where: {id: programId || "missing"}});
    await prisma.document.deleteMany({where: {id: {in: [publicDocumentId, privateDocumentId].filter(Boolean)}}});
    await prisma.media.deleteMany({where: {id: {in: [publicMediaId, privateMediaId].filter(Boolean)}}});
    await prisma.user.deleteMany({where: {id: adminId || "missing"}});
    await prisma.$disconnect();
  });

  it("creates the canonical program atomically with audit, revision, and safe public projection", async () => {
    const created = await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE",
      resource: "STUDY_PROGRAM",
      payload: programPayload(),
    }, now);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    programId = created.id;
    resourceIds.add(created.id);
    expect(created.version).toBe(1);
    const stored = await prisma.studyProgram.findUniqueOrThrow({
      where: {id: programId},
      include: {translations: {orderBy: {locale: "asc"}}},
    });
    expect(stored.code).toBe("IAT");
    expect(stored.translations.find(({locale}) => locale === "id")?.status).toBe("PUBLISHED");
    expect(stored.translations.find(({locale}) => locale === "en")?.status).toBe("DRAFT");
    expect(await prisma.contentRevision.count({where: {resourceType: "StudyProgram", resourceId: programId}})).toBe(3);
    expect(await prisma.activityLog.count({where: {resourceType: "StudyProgram", resourceId: programId}})).toBe(1);

    const listed = await listAcademicPeople(prisma, actor(), {
      resource: "STUDY_PROGRAM", page: 1, pageSize: 20, search: "Ilmu Al-Qur’an", direction: "ASC",
    }, "/uploads", now);
    expect(listed.ok).toBe(true);
    expect(JSON.stringify(listed)).not.toMatch(/storageKey|checksumSha256|phone/i);

    const publicList = await listPublicAcademicPeople(prisma, {
      resource: "STUDY_PROGRAM", page: 1, pageSize: 20, search: "Ilmu Al-Qur’an", direction: "ASC",
    }, "en", "/uploads");
    expect(publicList.ok).toBe(true);
    if (!publicList.ok) return;
    expect(publicList.data.items).toHaveLength(1);
    expect(publicList.data.items[0]?.name).toBe("Ilmu Al-Qur’an dan Tafsir");
    expect(JSON.stringify(publicList)).not.toMatch(/phone|contentOwner|storageKey|checksum/i);
  });

  it("rejects private media/documents and identity drift before creating another program", async () => {
    const before = await Promise.all([
      prisma.studyProgram.count(),
      prisma.contentRevision.count({where: {resourceType: "StudyProgram"}}),
      prisma.activityLog.count({where: {resourceType: "StudyProgram"}}),
    ]);
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE", resource: "STUDY_PROGRAM", payload: programPayload({code: "IH", logoMediaId: privateMediaId}),
    }, now)).toEqual({ok: false, code: "MEDIA_INVALID"});
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE", resource: "STUDY_PROGRAM", payload: programPayload({code: "IH", logoMediaId: null, curriculumDocumentId: privateDocumentId}),
    }, now)).toEqual({ok: false, code: "DOCUMENT_INVALID"});
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE", resource: "STUDY_PROGRAM", payload: {...programPayload({code: "IH"}), order: 4},
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await Promise.all([
      prisma.studyProgram.count(),
      prisma.contentRevision.count({where: {resourceType: "StudyProgram"}}),
      prisma.activityLog.count({where: {resourceType: "StudyProgram"}}),
    ])).toEqual(before);
  });

  it("enforces optimistic program updates and preserves the five-program identity", async () => {
    const updated = await executeAcademicPeopleCommand(prisma, actor(), {
      action: "UPDATE", resource: "STUDY_PROGRAM",
      mutation: {id: programId, expectedVersion: 1},
      payload: programPayload({accreditation: "Baik Sekali"}),
    }, now);
    expect(updated).toEqual({ok: true, id: programId, resource: "STUDY_PROGRAM", version: 2});
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "UPDATE", resource: "STUDY_PROGRAM",
      mutation: {id: programId, expectedVersion: 1},
      payload: programPayload({accreditation: "Stale"}),
    }, now)).toEqual({ok: false, code: "VERSION_CONFLICT"});
    expect((await prisma.studyProgram.findUniqueOrThrow({where: {id: programId}})).accreditation).toBe("Baik Sekali");
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "UPDATE", resource: "STUDY_PROGRAM",
      mutation: {id: programId, expectedVersion: 2},
      payload: programPayload({code: "IH"}),
    }, now)).toEqual({ok: false, code: "IDENTITY_CONFLICT"});
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "DELETE", resource: "STUDY_PROGRAM", id: programId,
    }, now)).toEqual({ok: false, code: "IDENTITY_CONFLICT"});
  });

  it("creates lecturer and staff records while exposing only the public directory projection", async () => {
    const lecturer = await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE", resource: "LECTURER", payload: lecturerPayload(),
    }, now);
    expect(lecturer.ok).toBe(true);
    if (!lecturer.ok) return;
    lecturerId = lecturer.id;
    resourceIds.add(lecturer.id);

    const staff = await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE",
      resource: "STAFF",
      payload: {
        name: `${marker} Staff`, slug: `${marker}-staff`, nip: `${marker}-staff`,
        email: `${marker}-staff@example.test`, phone: "+62 21 555 0303", photoMediaId: publicMediaId,
        order: 2, isActive: true,
        translations: {id: {position: "Pranata", unit: "Akademik"}},
      },
    }, now);
    expect(staff.ok).toBe(true);
    if (!staff.ok) return;
    staffId = staff.id;
    resourceIds.add(staff.id);

    const publicLecturers = await listPublicAcademicPeople(prisma, {
      resource: "LECTURER", page: 1, pageSize: 20, search: marker, direction: "ASC",
    }, "ar", "/uploads");
    expect(publicLecturers.ok).toBe(true);
    if (publicLecturers.ok) {
      expect(publicLecturers.data.items[0]?.name).toBe(`${marker} Lecturer One`);
      expect(publicLecturers.data.items[0]?.studyProgram).toMatchObject({resolvedLocale: "id", isFallback: true});
      expect(JSON.stringify(publicLecturers)).not.toMatch(/nidn|nip|phone|storageKey|googleScholar|sinta/i);
    }
    const publicStaff = await listPublicAcademicPeople(prisma, {
      resource: "STAFF", page: 1, pageSize: 20, search: marker, direction: "ASC",
    }, "id", "/uploads");
    expect(publicStaff.ok && publicStaff.data.items).toHaveLength(1);
    expect(JSON.stringify(publicStaff)).not.toMatch(/nip|phone|storageKey/i);
  });

  it("rolls back parent and translation changes on a unique identity conflict", async () => {
    const second = await executeAcademicPeopleCommand(prisma, actor(), {
      action: "CREATE",
      resource: "LECTURER",
      payload: lecturerPayload({slug: `${marker}-lecturer-two`, nidn: `${marker}-nidn-two`, name: `${marker} Lecturer Two`}),
    }, now);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    secondLecturerId = second.id;
    resourceIds.add(second.id);
    const secondStored = await prisma.lecturer.findUniqueOrThrow({where: {id: secondLecturerId}});
    const beforeTranslation = await prisma.lecturerTranslation.findUniqueOrThrow({
      where: {lecturerId_locale: {lecturerId, locale: "id"}},
    });
    const conflicting = lecturerPayload({nidn: secondStored.nidn ?? undefined});
    conflicting.name = `${marker} Rolled Back`;
    conflicting.translations.id.position = "Should not persist";
    expect(await executeAcademicPeopleCommand(prisma, actor(), {
      action: "UPDATE", resource: "LECTURER", mutation: {id: lecturerId, expectedVersion: null}, payload: conflicting,
    }, now)).toEqual({ok: false, code: "IDENTITY_CONFLICT"});
    const after = await prisma.lecturer.findUniqueOrThrow({where: {id: lecturerId}});
    const afterTranslation = await prisma.lecturerTranslation.findUniqueOrThrow({
      where: {lecturerId_locale: {lecturerId, locale: "id"}},
    });
    expect(after.name).toBe(`${marker} Lecturer One`);
    expect(afterTranslation.position).toBe(beforeTranslation.position);
  });
});
