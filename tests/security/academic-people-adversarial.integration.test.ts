import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  executeAcademicPeopleCommand,
  listAcademicPeople,
  listPublicAcademicPeople,
  normalizeAcademicPeopleSearchParams,
  type AcademicPeopleDatabase,
} from "@/features/academic/people";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("academic people adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-adversarial-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const userIds: string[] = [];
  let adminId = "";
  let editorId = "";
  let petugasId = "";
  let satgasId = "";
  let existingLecturerId = "";
  let inactiveLecturerId = "";
  let privateLecturerId = "";
  let privateMediaId = "";

  function actor(userId: string, role: ActiveDatabaseSession["role"]): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-08-04T11:00:00.000Z"),
    };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}-admin@example.test`, role: "ADMIN", isActive: true}}),
      prisma.user.create({data: {name: `${marker} Editor`, email: `${marker}-editor@example.test`, role: "EDITOR", isActive: true}}),
      prisma.user.create({data: {name: `${marker} Petugas`, email: `${marker}-petugas@example.test`, role: "PETUGAS", isActive: true}}),
      prisma.user.create({data: {name: `${marker} Satgas`, email: `${marker}-satgas@example.test`, role: "SATGAS_PPKS", isActive: true}}),
    ]);
    [adminId, editorId, petugasId, satgasId] = users.map(({id}) => id);
    userIds.push(...users.map(({id}) => id));
    const digest = createHash("sha256").update(`${marker}-private`).digest("hex");
    const media = await prisma.media.create({data: {
      storageKey: `2026/08/${digest}.webp`,
      storageClass: "PRIVATE",
      checksumSha256: digest,
      originalName: `${marker}-private.webp`,
      mimeType: "image/webp",
      size: 512,
      alt: "Private synthetic portrait",
      isDecorative: false,
      width: 320,
      height: 320,
      uploaderId: adminId,
    }});
    privateMediaId = media.id;
    const [existing, inactive, privatePhoto] = await Promise.all([
      prisma.lecturer.create({data: {
        name: `${marker} Existing`, slug: `${marker}-existing`, nidn: `${marker}-existing`,
        email: `${marker}-existing@example.test`, phone: "+62 21 555 1001", isActive: true,
        translations: {create: {locale: "id", position: "Lektor", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      }}),
      prisma.lecturer.create({data: {
        name: `${marker} Inactive`, slug: `${marker}-inactive`, nidn: `${marker}-inactive`, isActive: false,
        translations: {create: {locale: "id", position: "Tidak aktif", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      }}),
      prisma.lecturer.create({data: {
        name: `${marker} Private Photo`, slug: `${marker}-private-photo`, nidn: `${marker}-private`,
        photoMediaId: privateMediaId, isActive: true,
        translations: {create: {locale: "id", position: "Lektor", status: "PUBLISHED", reviewerId: adminId, reviewedAt: now}},
      }}),
    ]);
    existingLecturerId = existing.id;
    inactiveLecturerId = inactive.id;
    privateLecturerId = privatePhoto.id;
  });

  afterAll(async () => {
    const lecturerIds = [existingLecturerId, inactiveLecturerId, privateLecturerId].filter(Boolean);
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: {in: userIds}}, {resourceId: {in: lecturerIds}}]}});
    await prisma.lecturer.deleteMany({where: {id: {in: lecturerIds}}});
    await prisma.staff.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.media.deleteMany({where: {id: privateMediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: {in: userIds}}});
    await prisma.$disconnect();
  });

  it("makes existing and missing targets indistinguishable to every non-ADMIN role", async () => {
    const sessions = [
      actor(editorId, "EDITOR"),
      actor(petugasId, "PETUGAS"),
      actor(satgasId, "SATGAS_PPKS"),
    ];
    const before = await prisma.lecturer.count();
    for (const session of sessions) {
      const existing = await executeAcademicPeopleCommand(prisma, session, {
        action: "DELETE", resource: "LECTURER", id: existingLecturerId,
      }, now);
      const missing = await executeAcademicPeopleCommand(prisma, session, {
        action: "DELETE", resource: "LECTURER", id: "missing-lecturer",
      }, now);
      expect(existing).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missing).toEqual(existing);
      expect(await listAcademicPeople(prisma, session, {
        resource: "LECTURER", page: 1, pageSize: 20,
      }, "/uploads", now)).toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(await prisma.lecturer.count()).toBe(before);
  });

  it("rejects expired, inactive, and password-change ADMIN sessions before access", async () => {
    const query = {resource: "LECTURER", page: 1, pageSize: 20};
    for (const session of [
      {...actor(adminId, "ADMIN"), expiresAt: now},
      {...actor(adminId, "ADMIN"), isActive: false},
      {...actor(adminId, "ADMIN"), mustChangePassword: true},
    ]) {
      expect(await listAcademicPeople(prisma, session, query, "/uploads", now))
        .toEqual({ok: false, code: "SESSION_INVALID"});
    }
  });

  it("rejects selector injection and private media without writing", async () => {
    expect(normalizeAcademicPeopleSearchParams(new URLSearchParams(
      "resource=LECTURER&page=1&page=2&nip=secret",
    ))).toEqual({ok: false, code: "REQUEST_INVALID"});
    const before = await Promise.all([
      prisma.staff.count(),
      prisma.activityLog.count({where: {resourceType: "Staff"}}),
    ]);
    expect(await executeAcademicPeopleCommand(prisma, actor(adminId, "ADMIN"), {
      action: "CREATE",
      resource: "STAFF",
      payload: {
        name: `${marker} Injected`, slug: `${marker}-injected`, nip: null, email: null, phone: null,
        photoMediaId: null, order: 0, isActive: true,
        translations: {id: {position: null, unit: null}},
        role: "ADMIN",
      },
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await executeAcademicPeopleCommand(prisma, actor(adminId, "ADMIN"), {
      action: "CREATE",
      resource: "STAFF",
      payload: {
        name: `${marker} Private`, slug: `${marker}-private`, nip: null, email: null, phone: null,
        photoMediaId: privateMediaId, order: 0, isActive: true,
        translations: {id: {position: null, unit: null}},
      },
    }, now)).toEqual({ok: false, code: "MEDIA_INVALID"});
    expect(await Promise.all([
      prisma.staff.count(),
      prisma.activityLog.count({where: {resourceType: "Staff"}}),
    ])).toEqual(before);
  });

  it("hides inactive records and converts private photos to null without leaking internals", async () => {
    const result = await listPublicAcademicPeople(prisma, {
      resource: "LECTURER", page: 1, pageSize: 20, search: marker, direction: "ASC",
    }, "id", "/uploads");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.map(({id}) => id)).toEqual(expect.arrayContaining([existingLecturerId, privateLecturerId]));
    expect(result.data.items.map(({id}) => id)).not.toContain(inactiveLecturerId);
    expect(result.data.items.find(({id}) => id === privateLecturerId)?.photo).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/storageKey|checksum|nip|nidn|phone/i);
  });

  it("normalizes thrown database details to a non-technical failure", async () => {
    const database = {
      $transaction: () => Promise.reject(new Error("postgresql://secret@private-host/database")),
      lecturer: {},
    } as unknown as AcademicPeopleDatabase;
    const result = await listAcademicPeople(database, actor(adminId, "ADMIN"), {
      resource: "LECTURER", page: 1, pageSize: 20,
    }, "/uploads", now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
