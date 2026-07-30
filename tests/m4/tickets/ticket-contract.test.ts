import {describe, expect, it} from "vitest";

import {
  PpksTicketDetailSchema,
  TicketCollectionQuerySchema,
  TicketDetailResultSchema,
  TicketTrackingProbeSchema,
} from "@/contracts/ticket";
import {
  openPpksReplyBody,
  openPpksTicketField,
  sealPpksReplyBody,
  sealPpksTicketField,
} from "@/lib/tickets/protected-fields";

describe("M4 ticket query contracts", () => {
  it("rejects unknown input keys and malformed tracking probes", () => {
    expect(TicketCollectionQuerySchema.safeParse({
      page: 1,
      pageSize: 25,
      category: "PELECEHAN_SEKSUAL",
    }).success).toBe(false);
    expect(TicketTrackingProbeSchema.safeParse({
      ticketNumber: "FUSPI-2026-0001",
      token: "raw-token",
    }).success).toBe(false);
    expect(TicketTrackingProbeSchema.safeParse({
      ticketNumber: "FUSPI-2026-0001",
      token: Buffer.alloc(32, 1).toString("base64url"),
      redirect: "https://example.test",
    }).success).toBe(false);
  });

  it("rejects protected storage fields from every public detail shape", () => {
    const base = {
      id: "ticket-1",
      ticketNumber: "FUSPI-2026-0001",
      category: "PELECEHAN_SEKSUAL" as const,
      priority: "TINGGI" as const,
      status: "BARU" as const,
      assigneeId: null,
      responseDueAt: null,
      resolutionDueAt: null,
      createdAt: new Date("2026-07-30T00:00:00.000Z"),
      updatedAt: new Date("2026-07-30T00:00:00.000Z"),
      subject: "Subjek terlindungi",
      description: "Uraian terlindungi",
      reporterIdentity: null,
      resolution: null,
      replies: [],
      attachments: [],
    };
    for (const protectedField of [
      "subjectCiphertext",
      "encryptionNonce",
      "encryptionTag",
      "keyVersion",
      "storageKey",
      "trackingTokenHash",
      "token",
    ]) {
      expect(PpksTicketDetailSchema.safeParse({
        ...base,
        [protectedField]: "forbidden",
      }).success).toBe(false);
      expect(TicketDetailResultSchema.safeParse({
        ok: true,
        data: {
          ...base,
          [protectedField]: "forbidden",
        },
      }).success).toBe(false);
    }
  });

  it("uses independent authenticated envelopes for each PPKS field and reply", () => {
    const key = Buffer.alloc(32, 7);
    const resolveKey = (version: number) => version === 4 ? key : undefined;
    const ticketId = "ticket-protected";
    const replyId = "reply-protected";
    const subject = sealPpksTicketField(
      "Subjek sintetis",
      ticketId,
      "subject",
      {key, keyVersion: 4},
    );
    const description = sealPpksTicketField(
      "Uraian sintetis",
      ticketId,
      "description",
      {key, keyVersion: 4},
    );
    const reply = sealPpksReplyBody(
      "Balasan sintetis",
      replyId,
      {key, keyVersion: 4},
    );

    expect(subject).not.toBe(description);
    expect(openPpksTicketField(
      subject,
      ticketId,
      "subject",
      resolveKey,
    )).toBe("Subjek sintetis");
    expect(openPpksTicketField(
      description,
      ticketId,
      "description",
      resolveKey,
    )).toBe("Uraian sintetis");
    expect(openPpksReplyBody(reply, replyId, resolveKey)).toBe("Balasan sintetis");
    expect(() => openPpksTicketField(
      subject,
      ticketId,
      "description",
      resolveKey,
    )).toThrow("Unable to process protected data.");
  });
});
