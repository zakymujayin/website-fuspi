import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  addPublicReply,
  getPublicTicket,
  submitPublicTicket,
  ticketWorkflowHttpStatus,
} from "@/features/tickets/workflow";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

const TRACKING_SECRET = "test-tracking-secret-minimum-32-characters!!";
const IP_SECRET = "test-ip-secret-minimum-32-characters-long!!";

suite("public complaint flow on PostgreSQL", () => {
  const prisma = createPrismaClient();
  const created: string[] = [];

  let ticketNumber = "";
  let token = "";

  beforeAll(async () => {
    await prisma.$connect();
    const result = await submitPublicTicket(
      prisma,
      {category: "SARANA", subject: "Proyektor mati", description: "Proyektor ruang 2.3 tidak menyala sejak Senin."},
      "203.0.113.10",
      IP_SECRET,
      TRACKING_SECRET,
    );
    if (!result.ok) throw new Error(`submit failed: ${result.code}`);
    ticketNumber = result.data.ticketNumber;
    token = result.data.trackingToken;
    created.push(ticketNumber);
  });

  afterAll(async () => {
    const ids = (await prisma.ticket.findMany({
      where: {ticketNumber: {in: created}},
      select: {id: true},
    })).map(({id}) => id);
    if (ids.length) {
      await prisma.ticketAccessLog.deleteMany({where: {ticketId: {in: ids}}});
      await prisma.ticketReply.deleteMany({where: {ticketId: {in: ids}}});
      await prisma.ticketHistory.deleteMany({where: {ticketId: {in: ids}}});
      await prisma.ticket.deleteMany({where: {id: {in: ids}}});
    }
    await prisma.$disconnect();
  });

  it("issues a canonical tracking token and a ticket number", () => {
    expect(ticketNumber).toMatch(/^FUSPI-\d{4}-\d{4,}$/u);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  });

  it("returns the ticket only for the matching token", async () => {
    const found = await getPublicTicket(prisma, ticketNumber, token, TRACKING_SECRET);
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.data.subject).toBe("Proyektor mati");
  });

  /* Regression: a well-formed but non-canonical base64url token used to throw
     inside the digest helper. The exception surfaced as UNAVAILABLE, so a wrong
     tracking code answered 503 "service unavailable" instead of 404 "not found",
     which both misleads the reporter and leaks that the number itself exists. */
  it("answers NOT_FOUND, never UNAVAILABLE, for a wrong but well-formed token", async () => {
    for (const wrong of ["x".repeat(43), "A".repeat(43), "-".repeat(43), "_".repeat(43)]) {
      const result = await getPublicTicket(prisma, ticketNumber, wrong, TRACKING_SECRET);
      expect(result).toEqual({ok: false, code: "NOT_FOUND"});
      expect(ticketWorkflowHttpStatus(result)).toBe(404);
    }
  });

  it("rejects a malformed token as an invalid request without touching the row", async () => {
    const result = await getPublicTicket(prisma, ticketNumber, "terlalu-pendek", TRACKING_SECRET);
    expect(result).toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("hides a ticket from a different secret", async () => {
    const result = await getPublicTicket(prisma, ticketNumber, token, "another-secret-minimum-32-characters-ok!!");
    expect(result).toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("refuses an unknown ticket number without revealing the difference", async () => {
    const unknown = await getPublicTicket(prisma, "FUSPI-2099-9999", token, TRACKING_SECRET);
    expect(unknown).toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("accepts a reply on the right token and shows it back", async () => {
    const replied = await addPublicReply(prisma, ticketNumber, token, "Sudah dilaporkan ke bagian sarana.", TRACKING_SECRET);
    expect(replied.ok).toBe(true);
    if (!replied.ok) return;
    expect(replied.data.replies.map(({body}) => body)).toContain("Sudah dilaporkan ke bagian sarana.");
  });

  it("refuses a reply on a wrong token", async () => {
    const result = await addPublicReply(prisma, ticketNumber, "x".repeat(43), "Percobaan.", TRACKING_SECRET);
    expect(result).toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("never accepts a PPKS report through the public complaint entry point", async () => {
    const result = await submitPublicTicket(
      prisma,
      {category: "PELECEHAN_SEKSUAL", subject: "Laporan", description: "Isi laporan yang panjangnya cukup."},
      "203.0.113.11",
      IP_SECRET,
      TRACKING_SECRET,
    );
    expect(result).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(await prisma.ticket.count({where: {category: "PELECEHAN_SEKSUAL", subjectCiphertext: "Laporan"}})).toBe(0);
  });
});
