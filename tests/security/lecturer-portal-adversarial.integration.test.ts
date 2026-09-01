import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeLecturerPortalCommand,
  loadLecturerPortalProfile,
} from "@/features/lecturer-portal/domain";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("lecturer portal adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `portal-adversarial-${Date.now()}`;
  const userIds: string[] = [];
  const lecturerIds: string[] = [];
  const mediaIds: string[] = [];

  let userA = "";
  let userB = "";
  let adminUser = "";
  let lecturerA = "";
  let lecturerB = "";
  let educationB = "";
  let publicationB = "";
  let photoA = "";
  let cvA = "";
  let photoB = "";

  function actor(userId: string, role: ActiveDatabaseSession["role"] = "DOSEN"): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date(Date.now() + 3_600_000),
    };
  }

  function profilePayload(overrides: Record<string, unknown> = {}) {
    return {
      position: "Dosen", expertise: null, bio: null, quote: null, officeHours: null, officeLocation: null,
      phone: null, googleScholarUrl: null, sintaUrl: null, scopusUrl: null,
      linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      photoMediaId: null, cvMediaId: null,
      ...overrides,
    };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({data: {name: `${marker} A`, email: `${marker}-a@example.test`, role: "DOSEN", isActive: true}}),
      prisma.user.create({data: {name: `${marker} B`, email: `${marker}-b@example.test`, role: "DOSEN", isActive: true}}),
      prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}-admin@example.test`, role: "ADMIN", isActive: true}}),
    ]);
    [userA, userB, adminUser] = users.map(({id}) => id);
    userIds.push(...users.map(({id}) => id));

    const lecturers = await Promise.all([
      prisma.lecturer.create({data: {name: `${marker} A`, slug: `${marker}-a`, userId: userA}}),
      prisma.lecturer.create({data: {name: `${marker} B`, slug: `${marker}-b`, userId: userB}}),
    ]);
    [lecturerA, lecturerB] = lecturers.map(({id}) => id);
    lecturerIds.push(...lecturers.map(({id}) => id));

    const [edu, pub] = await Promise.all([
      prisma.lecturerEducation.create({data: {lecturerId: lecturerB, degree: "Dr.", institution: "Milik B"}}),
      prisma.lecturerPublication.create({data: {lecturerId: lecturerB, title: "Publikasi milik B", type: "JURNAL"}}),
    ]);
    educationB = edu.id;
    publicationB = pub.id;

    const media = await Promise.all([
      prisma.media.create({
        data: {
          storageKey: `2026/01/${marker}-photo-a.webp`,
          storageClass: "PUBLIC",
          checksumSha256: "a".repeat(64),
          originalName: "photo-a.webp",
          mimeType: "image/webp",
          size: 512,
          alt: "Foto A",
          isDecorative: false,
          width: 256,
          height: 256,
          uploaderId: userA,
        },
      }),
      prisma.media.create({
        data: {
          storageKey: `2026/01/${marker}-cv-a.pdf`,
          storageClass: "PUBLIC",
          checksumSha256: "b".repeat(64),
          originalName: "cv-a.pdf",
          mimeType: "application/pdf",
          size: 512,
          alt: "",
          isDecorative: false,
          uploaderId: userA,
        },
      }),
      prisma.media.create({
        data: {
          storageKey: `2026/01/${marker}-photo-b.webp`,
          storageClass: "PUBLIC",
          checksumSha256: "c".repeat(64),
          originalName: "photo-b.webp",
          mimeType: "image/webp",
          size: 512,
          alt: "Foto B",
          isDecorative: false,
          width: 256,
          height: 256,
          uploaderId: userB,
        },
      }),
    ]);
    [photoA, cvA, photoB] = media.map(({id}) => id);
    mediaIds.push(...media.map(({id}) => id));
  });

  afterAll(async () => {
    await prisma.lecturer.deleteMany({where: {id: {in: lecturerIds}}});
    await prisma.media.deleteMany({where: {id: {in: mediaIds}}});
    await prisma.user.deleteMany({where: {id: {in: userIds}}});
    await prisma.$disconnect();
  });

  it("loads only the lecturer record bound to the signed-in account", async () => {
    const loaded = await loadLecturerPortalProfile(prisma, actor(userA));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.data.id).toBe(lecturerA);
  });

  it("refuses a signed-in account that owns no lecturer record", async () => {
    const loaded = await loadLecturerPortalProfile(prisma, actor(adminUser, "ADMIN"));
    expect(loaded).toEqual({ok: false, code: "SESSION_INVALID"});
  });

  it("refuses every role other than DOSEN", async () => {
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      const result = await executeLecturerPortalCommand(prisma, actor(userA, role), {
        action: "EDUCATION_DELETE",
        id: educationB,
      });
      expect(result).toEqual({ok: false, code: "SESSION_INVALID"});
    }
  });

  it("stops lecturer A from updating an education row owned by lecturer B", async () => {
    const result = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "EDUCATION_UPDATE",
      id: educationB,
      payload: {degree: "Dicuri", field: null, institution: "Disusupi", city: null, year: null},
    });
    expect(result).toEqual({ok: false, code: "NOT_FOUND"});

    const row = await prisma.lecturerEducation.findUnique({where: {id: educationB}});
    expect(row?.institution).toBe("Milik B");
  });

  it("stops lecturer A from deleting rows owned by lecturer B", async () => {
    expect(
      await executeLecturerPortalCommand(prisma, actor(userA), {action: "EDUCATION_DELETE", id: educationB}),
    ).toEqual({ok: false, code: "NOT_FOUND"});
    expect(
      await executeLecturerPortalCommand(prisma, actor(userA), {action: "PUBLICATION_DELETE", id: publicationB}),
    ).toEqual({ok: false, code: "NOT_FOUND"});

    expect(await prisma.lecturerEducation.count({where: {id: educationB}})).toBe(1);
    expect(await prisma.lecturerPublication.count({where: {id: publicationB}})).toBe(1);
  });

  it("writes a lecturer's own rows against its own record only", async () => {
    const created = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "EDUCATION_CREATE",
      payload: {degree: "M.A.", field: null, institution: "Milik A", city: null, year: 2020},
    });
    expect(created.ok).toBe(true);

    const rows = await prisma.lecturerEducation.findMany({where: {lecturerId: lecturerA}});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.institution).toBe("Milik A");
    expect(await prisma.lecturerEducation.count({where: {lecturerId: lecturerB}})).toBe(1);
  });

  it("strips dangerous markup from a biography before it is stored", async () => {
    const result = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "PROFILE_UPDATE",
      payload: profilePayload({
        bio: "<p>Aman</p><script>alert(1)</script><img src=x onerror=alert(1)>",
      }),
    });
    expect(result.ok).toBe(true);

    const translation = await prisma.lecturerTranslation.findFirst({
      where: {lecturerId: lecturerA, locale: "id"},
      select: {bio: true},
    });
    expect(translation?.bio).toContain("Aman");
    expect(translation?.bio ?? "").not.toContain("<script");
    expect(translation?.bio ?? "").not.toContain("onerror");
  });

  it("allows a lecturer to attach only its own correctly typed profile media", async () => {
    const result = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "PROFILE_UPDATE",
      payload: profilePayload({photoMediaId: photoA, cvMediaId: cvA}),
    });
    expect(result.ok).toBe(true);

    const row = await prisma.lecturer.findUnique({where: {id: lecturerA}, select: {photoMediaId: true, cvMediaId: true}});
    expect(row).toEqual({photoMediaId: photoA, cvMediaId: cvA});
  });

  it("does not let a lecturer attach media uploaded by another account", async () => {
    const before = await prisma.lecturer.findUnique({
      where: {id: lecturerA},
      select: {photoMediaId: true, cvMediaId: true},
    });
    const result = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "PROFILE_UPDATE",
      payload: profilePayload({photoMediaId: photoB, cvMediaId: cvA}),
    });
    expect(result).toEqual({ok: false, code: "NOT_FOUND"});

    const after = await prisma.lecturer.findUnique({
      where: {id: lecturerA},
      select: {photoMediaId: true, cvMediaId: true},
    });
    expect(after).toEqual(before);
  });

  it("does not let a lecturer attach media with the wrong profile slot type", async () => {
    const before = await prisma.lecturer.findUnique({
      where: {id: lecturerA},
      select: {photoMediaId: true, cvMediaId: true},
    });
    const result = await executeLecturerPortalCommand(prisma, actor(userA), {
      action: "PROFILE_UPDATE",
      payload: profilePayload({photoMediaId: cvA, cvMediaId: photoA}),
    });
    expect(result).toEqual({ok: false, code: "VALIDATION_FAILED"});

    const after = await prisma.lecturer.findUnique({
      where: {id: lecturerA},
      select: {photoMediaId: true, cvMediaId: true},
    });
    expect(after).toEqual(before);
  });

  it("rejects an expired session before touching the database", async () => {
    const expired = {...actor(userA), expiresAt: new Date(Date.now() - 1_000)};
    const result = await executeLecturerPortalCommand(prisma, expired, {
      action: "EDUCATION_DELETE",
      id: educationB,
    });
    expect(result).toEqual({ok: false, code: "SESSION_INVALID"});
  });
});
