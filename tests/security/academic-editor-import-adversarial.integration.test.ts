import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  executeAcademicPeopleImport,
  getAcademicEditorDetail,
  type AcademicEditorImportDatabase,
} from "@/features/academic/editor-import";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("academic editor/import adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `m4-academic-editor-import-adversarial-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const users: Array<{id: string; role: "ADMIN" | "EDITOR" | "PETUGAS" | "SATGAS_PPKS"}> = [];
  let staffId = "";
  let privateMediaId = "";
  const actor = (user: typeof users[number]) => ({userId: user.id, role: user.role, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});

  function staffRequest(photoMediaId: string | null = null) {
    return {intent: "PREVIEW" as const, atomic: true as const, rows: [{rowNumber: 1, resource: "STAFF" as const, payload: {
      name: `${marker} Imported`, slug: `${marker}-imported`, nip: null, email: null, phone: null,
      photoMediaId, order: 0, isActive: true, translations: {id: {position: null, unit: null}},
    }}]};
  }

  beforeAll(async () => {
    await prisma.$connect();
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      const row = await prisma.user.create({data: {name: `${marker} ${role}`, email: `${marker}-${role.toLowerCase()}@example.test`, role, isActive: true}});
      users.push({id: row.id, role});
    }
    staffId = (await prisma.staff.create({data: {name: `${marker} Existing`, slug: `${marker}-existing`, isActive: true,
      translations: {create: {locale: "id", position: "Pranata", status: "PUBLISHED", reviewerId: users[0]!.id, reviewedAt: now}}}})).id;
    const digest = createHash("sha256").update(marker).digest("hex");
    privateMediaId = (await prisma.media.create({data: {
      storageKey: `2026/08/${digest}.webp`, storageClass: "PRIVATE", checksumSha256: digest,
      originalName: `${marker}.webp`, mimeType: "image/webp", size: 512, alt: "Private",
      isDecorative: false, width: 320, height: 320, uploaderId: users[0]!.id,
    }})).id;
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany({where: {actorId: {in: users.map(({id}) => id)}}});
    await prisma.staff.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.media.deleteMany({where: {id: privateMediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: {in: users.map(({id}) => id)}}});
    await prisma.$disconnect();
  });

  it("makes existing and missing editor targets indistinguishable to non-ADMIN roles", async () => {
    for (const user of users.filter(({role}) => role !== "ADMIN")) {
      const existing = await getAcademicEditorDetail(prisma, actor(user), {resource: "STAFF", id: staffId}, "/uploads", now);
      const missing = await getAcademicEditorDetail(prisma, actor(user), {resource: "STAFF", id: "missing-staff"}, "/uploads", now);
      expect(existing).toEqual({ok: false, code: "SESSION_INVALID"});
      expect(missing).toEqual(existing);
    }
  });

  it("rejects non-ADMIN imports before any existence check or write", async () => {
    const before = await prisma.staff.count();
    for (const user of users.filter(({role}) => role !== "ADMIN")) {
      expect(await executeAcademicPeopleImport(prisma, actor(user), staffRequest(), now)).toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(await prisma.staff.count()).toBe(before);
  });

  it("rejects private media and hostile selectors without writes or storage disclosure", async () => {
    const before = await prisma.staff.count();
    const privateResult = await executeAcademicPeopleImport(prisma, actor(users[0]!), staffRequest(privateMediaId), now);
    expect(privateResult).toMatchObject({ok: true, committed: false, rows: [{status: "INVALID", code: "MEDIA_INVALID"}]});
    expect(JSON.stringify(privateResult)).not.toMatch(/storageKey|checksum|PRIVATE/i);
    const hostile = {...staffRequest(), where: {nip: {not: null}}};
    expect(await executeAcademicPeopleImport(prisma, actor(users[0]!), hostile, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await prisma.staff.count()).toBe(before);
  });

  it("normalizes thrown database details to UNAVAILABLE", async () => {
    const database = {staff: {findUnique: () => Promise.reject(new Error("postgresql://secret@host/db"))}} as unknown as AcademicEditorImportDatabase;
    const result = await getAcademicEditorDetail(database, actor(users[0]!), {resource: "STAFF", id: staffId}, "/uploads", now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
