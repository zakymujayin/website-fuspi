import {compare} from "bcryptjs";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {provisionLecturerAccounts} from "@/features/academic/lecturer-account-provisioning";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("lecturer account provisioning adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `provision-${Date.now()}`;
  const lecturerIds: string[] = [];
  const userIds: string[] = [];

  let adminId = "";
  let withEmail = "";
  let withoutEmail = "";
  let alreadyLinked = "";
  let emailTaken = "";

  function actor(userId: string, role: ActiveDatabaseSession["role"] = "ADMIN"): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date(Date.now() + 3_600_000),
    };
  }

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.user.create({
      data: {name: `${marker} Admin`, email: `${marker}-admin@example.test`, role: "ADMIN", isActive: true},
    });
    adminId = admin.id;
    userIds.push(admin.id);

    const linkedUser = await prisma.user.create({
      data: {name: `${marker} Linked`, email: `${marker}-linked@example.test`, role: "DOSEN", isActive: true},
    });
    userIds.push(linkedUser.id);

    const clash = await prisma.user.create({
      data: {name: `${marker} Clash`, email: `${marker}-clash@example.test`, role: "EDITOR", isActive: true},
    });
    userIds.push(clash.id);

    const lecturers = await Promise.all([
      prisma.lecturer.create({data: {name: `${marker} Punya Email`, slug: `${marker}-a`, email: `${marker}-a@example.test`}}),
      prisma.lecturer.create({data: {name: `${marker} Tanpa Email`, slug: `${marker}-b`, email: null}}),
      prisma.lecturer.create({data: {name: `${marker} Sudah Tertaut`, slug: `${marker}-c`, email: `${marker}-c@example.test`, userId: linkedUser.id}}),
      prisma.lecturer.create({data: {name: `${marker} Email Bentrok`, slug: `${marker}-d`, email: `${marker}-clash@example.test`}}),
    ]);
    [withEmail, withoutEmail, alreadyLinked, emailTaken] = lecturers.map(({id}) => id);
    lecturerIds.push(...lecturers.map(({id}) => id));
  });

  afterAll(async () => {
    const created = await prisma.lecturer.findMany({
      where: {id: {in: lecturerIds}},
      select: {userId: true},
    });
    await prisma.lecturer.deleteMany({where: {id: {in: lecturerIds}}});
    const all = [...userIds, ...created.flatMap(({userId}) => (userId ? [userId] : []))];
    await prisma.user.deleteMany({where: {id: {in: all}}});
    await prisma.$disconnect();
  });

  it("refuses every role other than ADMIN", async () => {
    for (const role of ["EDITOR", "PETUGAS", "SATGAS_PPKS", "DOSEN"] as const) {
      const result = await provisionLecturerAccounts(prisma, actor(adminId, role), [withEmail]);
      expect(result).toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(await prisma.lecturer.findUnique({where: {id: withEmail}, select: {userId: true}}))
      .toEqual({userId: null});
  });

  it("refuses an expired admin session and an empty batch", async () => {
    const expired = {...actor(adminId), expiresAt: new Date(Date.now() - 1_000)};
    expect(await provisionLecturerAccounts(prisma, expired, [withEmail]))
      .toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await provisionLecturerAccounts(prisma, actor(adminId), []))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("creates a linked DOSEN account that must rotate its password", async () => {
    const result = await provisionLecturerAccounts(prisma, actor(adminId), [withEmail]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toHaveLength(1);

    const account = result.created[0]!;
    const lecturer = await prisma.lecturer.findUnique({
      where: {id: withEmail},
      select: {userId: true, user: {select: {role: true, mustChangePassword: true, isActive: true, passwordHash: true}}},
    });
    expect(lecturer?.userId).not.toBeNull();
    expect(lecturer?.user?.role).toBe("DOSEN");
    expect(lecturer?.user?.mustChangePassword).toBe(true);
    expect(lecturer?.user?.isActive).toBe(true);

    /* Only the hash reaches the database, and the returned secret is the one
       that opens it. */
    expect(lecturer?.user?.passwordHash).not.toBe(account.temporaryPassword);
    expect(await compare(account.temporaryPassword, lecturer!.user!.passwordHash!)).toBe(true);
    expect(account.temporaryPassword).toHaveLength(16);
  });

  it("never issues the same password twice", async () => {
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const lecturer = await prisma.lecturer.create({
        data: {name: `${marker} R${attempt}`, slug: `${marker}-r${attempt}`, email: `${marker}-r${attempt}@example.test`},
      });
      lecturerIds.push(lecturer.id);
      const result = await provisionLecturerAccounts(prisma, actor(adminId), [lecturer.id]);
      if (result.ok) seen.add(result.created[0]!.temporaryPassword);
    }
    expect(seen.size).toBe(6);
  });

  it("skips a lecturer that already has an account, has no email, or whose email is taken", async () => {
    const result = await provisionLecturerAccounts(prisma, actor(adminId), [
      withoutEmail,
      alreadyLinked,
      emailTaken,
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toHaveLength(0);
    expect(result.skippedMissingEmail).toBe(1);
    expect(result.skippedExistingAccount).toBe(1);
    expect(result.skippedEmailTaken).toBe(1);

    /* The clashing address must still belong to its original EDITOR. */
    const clash = await prisma.user.findUnique({
      where: {email: `${marker}-clash@example.test`},
      select: {role: true},
    });
    expect(clash?.role).toBe("EDITOR");
  });

  it("is idempotent when the same lecturer is submitted twice", async () => {
    const again = await provisionLecturerAccounts(prisma, actor(adminId), [withEmail]);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.created).toHaveLength(0);
    expect(again.skippedExistingAccount).toBe(1);
  });
});
