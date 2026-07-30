import {randomUUID} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {Role} from "@/generated/prisma/enums";

import {createTicketQueryBoundary} from "@/features/tickets/query-isolation";
import {createPrismaClient} from "@/lib/db/client";
import {validateDatabaseSession} from "@/lib/auth/runtime/session";
import {
  createTrackingTokenDigest,
} from "@/lib/security/tracking-token";
import {
  sealPpksReplyBody,
  sealPpksTicketField,
} from "@/lib/tickets/protected-fields";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M4 PPKS query isolation on PostgreSQL", () => {
  const marker = `m4-ppks-${Date.now()}`;
  const now = new Date("2026-07-30T06:00:00.000Z");
  const expires = new Date("2026-07-30T14:00:00.000Z");
  const key = Buffer.alloc(32, 23);
  const trackingHmacSecret = "m4-ticket-query-isolation-test-secret-000000000000";
  const sequence = String(Date.now()).slice(-7);
  const ticketNumbers = {
    generalA: `FUSPI-2026-${sequence}1`,
    generalB: `FUSPI-2026-${sequence}2`,
    ppksA: `FUSPI-2026-${sequence}3`,
    ppksB: `FUSPI-2026-${sequence}4`,
  };
  const trackingTokens = {
    general: Buffer.alloc(32, 31).toString("base64url"),
    ppks: Buffer.alloc(32, 47).toString("base64url"),
  };
  const ids = {
    generalA: randomUUID(),
    generalB: randomUUID(),
    ppksA: randomUUID(),
    ppksB: randomUUID(),
    reply: randomUUID(),
    attachment: randomUUID(),
  };
  const secrets = {
    subject: `${marker}-subjek-rahasia`,
    description: `${marker}-uraian-rahasia`,
    identity: `${marker}-identitas-rahasia`,
    resolution: `${marker}-resolusi-rahasia`,
    reply: `${marker}-balasan-rahasia`,
    filename: `${marker}-bukti-rahasia.pdf`,
  };

  let prisma: ReturnType<typeof createPrismaClient>;
  const sessions = new Map<Role, Awaited<ReturnType<typeof validateDatabaseSession>>>();
  const userIds = new Map<Role, string>();
  let boundary: ReturnType<typeof createTicketQueryBoundary>;
  let resolverCalls = 0;

  function session(role: Role) {
    const value = sessions.get(role);
    if (!value) throw new Error(`Missing synthetic ${role} session.`);
    return value;
  }

  function assertNoProtectedKeys(value: unknown) {
    const protectedKey = /(ciphertext|nonce|tag|keyversion|storagekey|trackingtokenhash|(?:^|_)token(?:$|_))/iu;
    const visit = (candidate: unknown) => {
      if (!candidate || typeof candidate !== "object") return;
      if (Array.isArray(candidate)) {
        for (const item of candidate) visit(item);
        return;
      }
      for (const [keyName, child] of Object.entries(candidate)) {
        expect(keyName).not.toMatch(protectedKey);
        visit(child);
      }
    };
    visit(value);
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();

    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      const user = await prisma.user.create({
        data: {
          name: `${marker}-${role}`,
          email: `${marker}-${role.toLowerCase()}@example.test`,
          role,
          isActive: true,
        },
      });
      const token = `${marker}-${role}-session`;
      await prisma.session.create({
        data: {sessionToken: token, userId: user.id, expires},
      });
      userIds.set(role, user.id);
      sessions.set(role, await validateDatabaseSession(prisma, token, now));
    }

    await prisma.ticket.createMany({
      data: [
        {
          id: ids.generalA,
          ticketNumber: ticketNumbers.generalA,
          trackingTokenHash: createTrackingTokenDigest(
            trackingTokens.general,
            trackingHmacSecret,
            "TICKET",
          ),
          category: "AKADEMIK",
          priority: "SEDANG",
          status: "DIPROSES",
          subjectCiphertext: `${marker}-subjek-umum-a`,
          descriptionCiphertext: `${marker}-uraian-umum-a`,
          reporterIdentityCiphertext: `${marker}-pelapor-umum-a`,
          resolutionCiphertext: null,
        },
        {
          id: ids.generalB,
          ticketNumber: ticketNumbers.generalB,
          trackingTokenHash: createTrackingTokenDigest(
            Buffer.alloc(32, 32).toString("base64url"),
            trackingHmacSecret,
            "TICKET",
          ),
          category: "SARANA",
          priority: "RENDAH",
          status: "BARU",
          subjectCiphertext: `${marker}-subjek-umum-b`,
          descriptionCiphertext: `${marker}-uraian-umum-b`,
          reporterIdentityCiphertext: null,
          resolutionCiphertext: null,
        },
        {
          id: ids.ppksA,
          ticketNumber: ticketNumbers.ppksA,
          trackingTokenHash: createTrackingTokenDigest(
            trackingTokens.ppks,
            trackingHmacSecret,
            "TICKET",
          ),
          category: "PELECEHAN_SEKSUAL",
          priority: "TINGGI",
          status: "DIPROSES",
          subjectCiphertext: sealPpksTicketField(
            secrets.subject,
            ids.ppksA,
            "subject",
            {key, keyVersion: 1},
          ),
          descriptionCiphertext: sealPpksTicketField(
            secrets.description,
            ids.ppksA,
            "description",
            {key, keyVersion: 1},
          ),
          reporterIdentityCiphertext: sealPpksTicketField(
            secrets.identity,
            ids.ppksA,
            "reporterIdentity",
            {key, keyVersion: 1},
          ),
          resolutionCiphertext: sealPpksTicketField(
            secrets.resolution,
            ids.ppksA,
            "resolution",
            {key, keyVersion: 1},
          ),
        },
        {
          id: ids.ppksB,
          ticketNumber: ticketNumbers.ppksB,
          trackingTokenHash: createTrackingTokenDigest(
            Buffer.alloc(32, 48).toString("base64url"),
            trackingHmacSecret,
            "TICKET",
          ),
          category: "PELECEHAN_SEKSUAL",
          priority: "URGENT",
          status: "BARU",
          subjectCiphertext: null,
          descriptionCiphertext: sealPpksTicketField(
            `${marker}-uraian-rahasia-b`,
            ids.ppksB,
            "description",
            {key, keyVersion: 1},
          ),
          reporterIdentityCiphertext: null,
          resolutionCiphertext: null,
        },
      ],
    });

    await prisma.ticketReply.create({
      data: {
        id: ids.reply,
        ticketId: ids.ppksA,
        authorId: userIds.get("SATGAS_PPKS"),
        bodyCiphertext: sealPpksReplyBody(
          secrets.reply,
          ids.reply,
          {key, keyVersion: 1},
        ),
      },
    });
    await prisma.ticketAttachment.create({
      data: {
        id: ids.attachment,
        ticketId: ids.ppksA,
        storageKey: `2026/07/${ids.attachment}.pdf`,
        storageClass: "PPKS_PRIVATE",
        originalName: secrets.filename,
        mimeType: "application/pdf",
        size: 1_024,
        checksumSha256: "a".repeat(64),
        encryptionNonce: Buffer.alloc(12, 2).toString("base64url"),
        encryptionTag: Buffer.alloc(16, 3).toString("base64url"),
        keyVersion: 1,
      },
    });

    boundary = createTicketQueryBoundary({
      database: prisma,
      resolveKey(version) {
        resolverCalls += 1;
        return version === 1 ? key : undefined;
      },
      trackingHmacSecret,
      clock: () => now,
    });
  });

  afterAll(async () => {
    await prisma.ticketAccessLog.deleteMany({
      where: {ticketId: {in: Object.values(ids)}},
    });
    await prisma.ticketAttachment.deleteMany({
      where: {ticketId: {in: [ids.ppksA, ids.ppksB]}},
    });
    await prisma.ticketReply.deleteMany({
      where: {ticketId: {in: [ids.ppksA, ids.ppksB]}},
    });
    await prisma.ticket.deleteMany({
      where: {id: {in: [ids.generalA, ids.generalB, ids.ppksA, ids.ppksB]}},
    });
    await prisma.session.deleteMany({
      where: {userId: {in: [...userIds.values()]}},
    });
    await prisma.user.deleteMany({
      where: {id: {in: [...userIds.values()]}},
    });
    await prisma.$disconnect();
  });

  it("enforces role and record scope for list and direct-ID detail", async () => {
    const adminList = await boundary.list(session("ADMIN"), {});
    const petugasList = await boundary.list(session("PETUGAS"), {});
    const satgasList = await boundary.list(session("SATGAS_PPKS"), {});
    const editorList = await boundary.list(session("EDITOR"), {});

    expect(adminList).toMatchObject({
      ok: true,
      data: {items: expect.arrayContaining([
        expect.objectContaining({id: ids.generalA}),
        expect.objectContaining({id: ids.generalB}),
      ])},
    });
    expect(petugasList).toEqual(adminList);
    expect(satgasList).toMatchObject({
      ok: true,
      data: {items: expect.arrayContaining([
        expect.objectContaining({id: ids.ppksA}),
        expect.objectContaining({id: ids.ppksB}),
      ])},
    });
    expect(editorList).toEqual({ok: false, code: "NOT_FOUND"});
    assertNoProtectedKeys(adminList);
    assertNoProtectedKeys(satgasList);

    const adminGeneral = await boundary.detail(session("ADMIN"), {id: ids.generalA});
    expect(adminGeneral).toMatchObject({
      ok: true,
      data: {
        id: ids.generalA,
        description: `${marker}-uraian-umum-a`,
      },
    });
    assertNoProtectedKeys(adminGeneral);

    for (const role of ["ADMIN", "PETUGAS", "EDITOR"] as const) {
      const forbidden = await boundary.detail(session(role), {id: ids.ppksA});
      const nonexistent = await boundary.detail(session(role), {id: randomUUID()});
      expect(forbidden).toEqual({ok: false, code: "NOT_FOUND"});
      expect(forbidden).toEqual(nonexistent);
      expect(JSON.stringify(forbidden)).not.toContain(marker);
    }

    const satgasGeneral = await boundary.detail(
      session("SATGAS_PPKS"),
      {id: ids.generalA},
    );
    const satgasMissing = await boundary.detail(
      session("SATGAS_PPKS"),
      {id: randomUUID()},
    );
    expect(satgasGeneral).toEqual(satgasMissing);
    expect(satgasGeneral).toEqual({ok: false, code: "NOT_FOUND"});

    const satgasPpks = await boundary.detail(
      session("SATGAS_PPKS"),
      {id: ids.ppksA},
    );
    expect(satgasPpks).toMatchObject({
      ok: true,
      data: {
        id: ids.ppksA,
        subject: secrets.subject,
        description: secrets.description,
        reporterIdentity: secrets.identity,
        resolution: secrets.resolution,
        replies: [expect.objectContaining({body: secrets.reply})],
        attachments: [expect.objectContaining({originalName: secrets.filename})],
      },
    });
    assertNoProtectedKeys(satgasPpks);
  });

  it("isolates count, aggregate, search, export, and tracking projections", async () => {
    expect(await boundary.count(session("ADMIN"), {})).toEqual({
      ok: true,
      data: {count: 2},
    });
    expect(await boundary.count(session("PETUGAS"), {})).toEqual({
      ok: true,
      data: {count: 2},
    });
    expect(await boundary.count(session("SATGAS_PPKS"), {})).toEqual({
      ok: true,
      data: {count: 2},
    });
    expect(await boundary.count(session("EDITOR"), {})).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });

    const adminAggregate = await boundary.ppksAggregate(session("ADMIN"));
    expect(adminAggregate).toEqual({
      ok: true,
      data: {
        total: 2,
        active: 2,
        byStatus: {
          BARU: 1,
          DIVERIFIKASI: 0,
          DIPROSES: 1,
          MENUNGGU_PELAPOR: 0,
          SELESAI: 0,
          DITOLAK: 0,
        },
      },
    });
    assertNoProtectedKeys(adminAggregate);
    expect(JSON.stringify(adminAggregate)).not.toContain(ids.ppksA);
    expect(JSON.stringify(adminAggregate)).not.toContain(ticketNumbers.ppksA);
    expect(await boundary.ppksAggregate(session("EDITOR"))).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });

    const adminPpksSearch = await boundary.search(session("ADMIN"), {
      term: ticketNumbers.ppksA.slice(-5),
    });
    expect(adminPpksSearch).toEqual({
      ok: true,
      data: {items: [], page: 1, pageSize: 25},
    });
    const satgasPpksSearch = await boundary.search(session("SATGAS_PPKS"), {
      term: ticketNumbers.ppksA.slice(-5),
    });
    expect(satgasPpksSearch).toMatchObject({
      ok: true,
      data: {items: [expect.objectContaining({id: ids.ppksA})]},
    });

    const adminExport = await boundary.export(session("ADMIN"), {});
    expect(adminExport).toMatchObject({
      ok: true,
      data: {items: expect.arrayContaining([
        expect.objectContaining({id: ids.generalA}),
        expect.objectContaining({id: ids.generalB}),
      ])},
    });
    expect(JSON.stringify(adminExport)).not.toContain(secrets.description);
    assertNoProtectedKeys(adminExport);

    const satgasExport = await boundary.export(session("SATGAS_PPKS"), {});
    expect(satgasExport).toMatchObject({
      ok: true,
      data: {items: expect.arrayContaining([
        expect.objectContaining({
          id: ids.ppksA,
          description: secrets.description,
        }),
        expect.objectContaining({id: ids.ppksB}),
      ])},
    });
    assertNoProtectedKeys(satgasExport);

    expect(await boundary.tracking({
      ticketNumber: ticketNumbers.generalA,
      token: trackingTokens.general,
    })).toMatchObject({
      ok: true,
      data: {
        ticketNumber: ticketNumbers.generalA,
        status: "DIPROSES",
      },
    });
    const ppksTracking = await boundary.tracking({
      ticketNumber: ticketNumbers.ppksA,
      token: trackingTokens.ppks,
    });
    const missingTracking = await boundary.tracking({
      ticketNumber: `FUSPI-2026-${sequence}9`,
      token: trackingTokens.ppks,
    });
    expect(ppksTracking).toEqual({ok: false, code: "NOT_FOUND"});
    expect(ppksTracking).toEqual(missingTracking);
  });

  it("records complete allowed and denied PPKS access without false success", async () => {
    const denied = await prisma.ticketAccessLog.findMany({
      where: {
        ticketId: ids.ppksA,
        allowed: false,
        reasonCode: "ACCESS_DENIED",
        userId: {
          in: [
            userIds.get("ADMIN")!,
            userIds.get("PETUGAS")!,
            userIds.get("EDITOR")!,
          ],
        },
      },
    });
    expect(denied).toHaveLength(3);
    expect(denied.every(({allowed, reasonCode, action}) =>
      !allowed && reasonCode === "ACCESS_DENIED" && action === "VIEW"
    )).toBe(true);

    const satgasLogs = await prisma.ticketAccessLog.findMany({
      where: {
        ticketId: {in: [ids.ppksA, ids.ppksB]},
        userId: userIds.get("SATGAS_PPKS"),
      },
    });
    expect(satgasLogs.some(({allowed, action}) =>
      allowed && action === "VIEW"
    )).toBe(true);
    expect(satgasLogs.some(({allowed, action}) =>
      allowed && action === "EXPORT"
    )).toBe(true);
    expect(satgasLogs.every(({allowed}) => allowed)).toBe(true);

    const aggregateLogs = await prisma.ticketAccessLog.count({
      where: {
        ticketId: {in: [ids.ppksA, ids.ppksB]},
        userId: userIds.get("ADMIN"),
        allowed: true,
        action: "VIEW",
      },
    });
    expect(aggregateLogs).toBe(2);
  });

  it("never resolves a key before authorization and fails closed on tamper", async () => {
    const original = (await prisma.ticket.findUniqueOrThrow({
      where: {id: ids.ppksA},
      select: {descriptionCiphertext: true},
    })).descriptionCiphertext;
    await prisma.ticket.update({
      where: {id: ids.ppksA},
      data: {descriptionCiphertext: "{\"ciphertext\":\"tampered\"}"},
    });

    try {
      resolverCalls = 0;
      const denied = await boundary.detail(session("ADMIN"), {id: ids.ppksA});
      expect(denied).toEqual({ok: false, code: "NOT_FOUND"});
      expect(resolverCalls).toBe(0);

      const allowed = await boundary.detail(
        session("SATGAS_PPKS"),
        {id: ids.ppksA},
      );
      expect(allowed).toEqual({ok: false, code: "UNAVAILABLE"});
      expect(resolverCalls).toBeGreaterThan(0);
      const audit = await prisma.ticketAccessLog.findFirst({
        where: {
          ticketId: ids.ppksA,
          userId: userIds.get("SATGAS_PPKS"),
          allowed: true,
          action: "VIEW",
        },
        orderBy: {createdAt: "desc"},
      });
      expect(audit).not.toBeNull();
    } finally {
      await prisma.ticket.update({
        where: {id: ids.ppksA},
        data: {descriptionCiphertext: original},
      });
    }
  });

  it("rejects expired, inactive, and malformed sessions with the same safe shape", async () => {
    const expired = {
      ok: true,
      session: {
        userId: userIds.get("SATGAS_PPKS"),
        role: "SATGAS_PPKS",
        isActive: true,
        mustChangePassword: false,
        expiresAt: new Date(now.getTime() - 1),
      },
    };
    const malformed = {
      ok: true,
      session: {
        userId: userIds.get("SATGAS_PPKS"),
        role: "ADMIN",
        isActive: false,
        mustChangePassword: false,
        expiresAt: expires,
      },
    };
    const missing = {ok: false, code: "SESSION_INVALID"};

    for (const invalid of [expired, malformed, missing]) {
      expect(await boundary.detail(invalid, {id: ids.ppksA})).toEqual({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await boundary.list(invalid, {})).toEqual({
        ok: false,
        code: "NOT_FOUND",
      });
    }

    await prisma.user.update({
      where: {id: userIds.get("SATGAS_PPKS")},
      data: {isActive: false},
    });
    try {
      expect(await boundary.detail(
        session("SATGAS_PPKS"),
        {id: ids.ppksA},
      )).toEqual({ok: false, code: "NOT_FOUND"});
    } finally {
      await prisma.user.update({
        where: {id: userIds.get("SATGAS_PPKS")},
        data: {isActive: true},
      });
    }
  });
});
