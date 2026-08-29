import {randomUUID} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createTicketQueryBoundary} from "@/features/tickets/query-isolation";
import {
  getPublicTicket,
  listStaffTickets,
  submitPpksReport,
  submitPublicTicket,
} from "@/features/tickets/workflow";
import {createPrismaClient} from "@/lib/db/client";
import {createPpksKeyResolver, getPpksSealingKey} from "@/lib/tickets/ppks-encryption";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

const TRACKING_SECRET = "ppks-intake-tracking-secret-min-32-chars!!";
const IP_SECRET = "ppks-intake-ip-secret-minimum-32-characters!!";
const KEY_ENV = {PPKS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64")};

const DESCRIPTION = "Kejadian berlangsung di ruang laboratorium pada sore hari.";
const IDENTITY = "Pelapor: mahasiswa semester 5, kontak melalui surel kampus.";

suite("PPKS intake adversarial PostgreSQL boundary", () => {
  const prisma = createPrismaClient();
  const marker = `ppks-intake-${Date.now()}`;
  const sealingKey = getPpksSealingKey(KEY_ENV);
  const resolveKey = createPpksKeyResolver(KEY_ENV);
  const boundary = createTicketQueryBoundary({
    database: prisma,
    resolveKey,
    trackingHmacSecret: TRACKING_SECRET,
  });

  const userIds: string[] = [];
  const ticketNumbers: string[] = [];
  let satgasSession = "";
  let adminSession = "";
  let ppksTicketId = "";
  let ppksNumber = "";
  let ppksToken = "";

  async function signIn(role: "SATGAS_PPKS" | "ADMIN") {
    const user = await prisma.user.create({
      data: {name: `${marker} ${role}`, email: `${marker}-${role}@example.test`, role, isActive: true},
    });
    userIds.push(user.id);
    const sessionToken = randomUUID();
    await prisma.session.create({
      data: {sessionToken, userId: user.id, expires: new Date(Date.now() + 3_600_000)},
    });
    return sessionToken;
  }

  beforeAll(async () => {
    await prisma.$connect();
    satgasSession = await signIn("SATGAS_PPKS");
    adminSession = await signIn("ADMIN");

    const result = await submitPpksReport(
      prisma,
      {subject: "Laporan kekerasan seksual", description: DESCRIPTION, reporterIdentity: IDENTITY},
      "198.51.100.7",
      IP_SECRET,
      TRACKING_SECRET,
      sealingKey,
    );
    if (!result.ok) throw new Error(`intake failed: ${result.code}`);
    ppksNumber = result.data.ticketNumber;
    ppksToken = result.data.trackingToken;
    ticketNumbers.push(ppksNumber);
    ppksTicketId = (await prisma.ticket.findUniqueOrThrow({
      where: {ticketNumber: ppksNumber}, select: {id: true},
    })).id;
  });

  afterAll(async () => {
    const ids = (await prisma.ticket.findMany({
      where: {ticketNumber: {in: ticketNumbers}}, select: {id: true},
    })).map(({id}) => id);
    if (ids.length) {
      await prisma.ticketAccessLog.deleteMany({where: {ticketId: {in: ids}}});
      await prisma.ticketHistory.deleteMany({where: {ticketId: {in: ids}}});
      await prisma.ticket.deleteMany({where: {id: {in: ids}}});
    }
    await prisma.session.deleteMany({where: {userId: {in: userIds}}});
    await prisma.user.deleteMany({where: {id: {in: userIds}}});
    await prisma.$disconnect();
  });

  it("stores the report under the PPKS category", async () => {
    const row = await prisma.ticket.findUniqueOrThrow({
      where: {id: ppksTicketId},
      select: {category: true, priority: true, keyVersion: true},
    });
    expect(row.category).toBe("PELECEHAN_SEKSUAL");
    expect(row.priority).toBe("TINGGI");
    expect(row.keyVersion).toBe(1);
  });

  /* The point of the whole subsystem: someone reading the table directly, with a
     database dump or a stray query, must not learn what was reported. */
  it("keeps every sensitive field unreadable at rest", async () => {
    const row = await prisma.ticket.findUniqueOrThrow({
      where: {id: ppksTicketId},
      select: {subjectCiphertext: true, descriptionCiphertext: true, reporterIdentityCiphertext: true},
    });
    const stored = JSON.stringify(row);
    expect(stored).not.toContain(DESCRIPTION);
    expect(stored).not.toContain(IDENTITY);
    expect(stored).not.toContain("Laporan kekerasan seksual");
    expect(stored).not.toContain("laboratorium");
    expect(row.descriptionCiphertext).toMatch(/^\{/u);
  });

  it("opens the report for SATGAS_PPKS and returns exactly what was filed", async () => {
    const detail = await boundary.detail({sessionToken: satgasSession}, {id: ppksTicketId});
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.data.description).toBe(DESCRIPTION);
    expect(detail.data.reporterIdentity).toBe(IDENTITY);
  });

  it("records an access log entry when SATGAS_PPKS opens it", async () => {
    const before = await prisma.ticketAccessLog.count({where: {ticketId: ppksTicketId}});
    await boundary.detail({sessionToken: satgasSession}, {id: ppksTicketId});
    expect(await prisma.ticketAccessLog.count({where: {ticketId: ppksTicketId}})).toBeGreaterThan(before);
  });

  it("hides the report from ADMIN, which may not read PPKS detail", async () => {
    const detail = await boundary.detail({sessionToken: adminSession}, {id: ppksTicketId});
    expect(detail.ok).toBe(false);
    if (!detail.ok) expect(detail.code).toBe("NOT_FOUND");
  });

  it("keeps the report out of the general staff list", async () => {
    const listed = await listStaffTickets(prisma, {
      userId: userIds[1], role: "ADMIN", isActive: true,
      mustChangePassword: false, expiresAt: new Date(Date.now() + 3_600_000),
    }, {});
    if (listed.ok) {
      expect(listed.data.items.some((t: {ticketNumber: string}) => t.ticketNumber === ppksNumber)).toBe(false);
    }
  });

  /* `getPublicTicket` returns decrypted-by-nobody content columns, so it must
     stay closed to PPKS. Status tracking is a different, contentless view. */
  it("refuses the content-bearing public endpoint even with the right token", async () => {
    expect(await getPublicTicket(prisma, ppksNumber, ppksToken, TRACKING_SECRET))
      .toEqual({ok: false, code: "NOT_FOUND"});
  });

  /* docs/14 B and D2: an anonymous reporter has no email, so the token is the
     only way to learn the report is being handled. */
  it("lets the reporter follow the status with their token", async () => {
    const tracked = await boundary.tracking({ticketNumber: ppksNumber, token: ppksToken});
    expect(tracked.ok).toBe(true);
    if (!tracked.ok) return;
    expect(tracked.data.ticketNumber).toBe(ppksNumber);
    expect(tracked.data.status).toBe("BARU");
    expect(tracked.data.priority).toBe("TINGGI");
  });

  it("exposes no content, identity, or attachment through tracking", async () => {
    const tracked = await boundary.tracking({ticketNumber: ppksNumber, token: ppksToken});
    expect(tracked.ok).toBe(true);
    if (!tracked.ok) return;
    const serialised = JSON.stringify(tracked.data);
    expect(serialised).not.toContain(DESCRIPTION);
    expect(serialised).not.toContain(IDENTITY);
    expect(Object.keys(tracked.data).sort())
      .toEqual(["priority", "status", "ticketNumber", "updatedAt"]);
  });

  it("refuses tracking with a wrong token", async () => {
    expect(await boundary.tracking({ticketNumber: ppksNumber, token: "x".repeat(43)}))
      .toMatchObject({ok: false, code: "NOT_FOUND"});
  });

  /* docs/14 D2: an immediate safety threat does not wait for triage. */
  it("escalates a report flagged as an immediate danger to URGENT", async () => {
    const result = await submitPpksReport(
      prisma,
      {description: "Ancaman sedang berlangsung dan pelapor merasa tidak aman.", immediateDanger: true},
      "198.51.100.21", IP_SECRET, TRACKING_SECRET, sealingKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    ticketNumbers.push(result.data.ticketNumber);
    const row = await prisma.ticket.findUniqueOrThrow({
      where: {ticketNumber: result.data.ticketNumber}, select: {priority: true},
    });
    expect(row.priority).toBe("URGENT");
  });

  /* docs/14 D2: reporting as a witness must be possible, and who reported is
     itself sensitive, so it lives inside the encrypted envelope. */
  it("accepts a witness report and keeps that fact encrypted", async () => {
    const result = await submitPpksReport(
      prisma,
      {description: "Melaporkan kejadian yang saya saksikan di koridor kampus.", reporterRole: "SAKSI"},
      "198.51.100.22", IP_SECRET, TRACKING_SECRET, sealingKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    ticketNumbers.push(result.data.ticketNumber);
    const row = await prisma.ticket.findUniqueOrThrow({
      where: {ticketNumber: result.data.ticketNumber},
      select: {id: true, reporterIdentityCiphertext: true},
    });
    expect(row.reporterIdentityCiphertext).not.toBeNull();
    expect(JSON.stringify(row)).not.toContain("Saksi");

    const detail = await boundary.detail({sessionToken: satgasSession}, {id: row.id});
    expect(detail.ok).toBe(true);
    if (detail.ok) expect(detail.data.reporterIdentity).toContain("Saksi");
  });

  it("still refuses a PPKS category through the general intake", async () => {
    const result = await submitPublicTicket(
      prisma,
      {category: "PELECEHAN_SEKSUAL", subject: "x", description: "isi laporan yang cukup panjang"},
      "198.51.100.8", IP_SECRET, TRACKING_SECRET,
    );
    expect(result).toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("accepts an anonymous report with no identity at all", async () => {
    const result = await submitPpksReport(
      prisma,
      {description: "Laporan tanpa identitas pelapor, cukup panjang untuk lolos validasi."},
      "198.51.100.9", IP_SECRET, TRACKING_SECRET, sealingKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    ticketNumbers.push(result.data.ticketNumber);
    const row = await prisma.ticket.findUniqueOrThrow({
      where: {ticketNumber: result.data.ticketNumber},
      select: {reporterIdentityCiphertext: true, subjectCiphertext: true},
    });
    expect(row.reporterIdentityCiphertext).toBeNull();
    expect(row.subjectCiphertext).toBeNull();
  });

  it("rejects an unusable key without writing anything", async () => {
    const before = await prisma.ticket.count();
    const result = await submitPpksReport(
      prisma,
      {description: "Laporan yang tidak boleh tersimpan karena kunci rusak."},
      "198.51.100.10", IP_SECRET, TRACKING_SECRET,
      {key: new Uint8Array(8), keyVersion: 1},
    );
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(await prisma.ticket.count()).toBe(before);
  });

  it("cannot be opened by a key version that was never issued", async () => {
    const foreign = createPpksKeyResolver({
      PPKS_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    });
    const other = createTicketQueryBoundary({
      database: prisma, resolveKey: foreign, trackingHmacSecret: TRACKING_SECRET,
    });
    const detail = await other.detail({sessionToken: satgasSession}, {id: ppksTicketId});
    expect(detail.ok).toBe(false);
  });
});
