import {describe, expect, it} from "vitest";

import {TicketPrioritySchema} from "@/contracts/operations";
import {
  ComplaintCategory,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";

describe("normative ticket enum contract", () => {
  it("matches the complaint channels from docs 02 and 14 exactly", () => {
    expect(Object.values(ComplaintCategory)).toEqual([
      "AKADEMIK",
      "KEMAHASISWAAN",
      "SARANA",
      "PELECEHAN_SEKSUAL",
      "LAINNYA",
    ]);
  });

  it("keeps the SLA contract bound to the generated priority enum", () => {
    expect(Object.values(TicketPriority)).toEqual(["RENDAH", "SEDANG", "TINGGI", "URGENT"]);
    expect(TicketPrioritySchema.options).toEqual(Object.values(TicketPriority));
    expect(TicketPrioritySchema.safeParse("NORMAL").success).toBe(false);
    expect(TicketPrioritySchema.safeParse("DARURAT").success).toBe(false);
  });

  it("matches the complete ticket lifecycle without the legacy closed label", () => {
    expect(Object.values(TicketStatus)).toEqual([
      "BARU",
      "DIVERIFIKASI",
      "DIPROSES",
      "MENUNGGU_PELAPOR",
      "SELESAI",
      "DITOLAK",
    ]);
  });
});
