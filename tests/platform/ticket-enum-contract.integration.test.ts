import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("normative ticket enums on PostgreSQL", () => {
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function enumLabels(typeName: string) {
    const rows = await prisma.$queryRaw<Array<{enumlabel: string}>>`
      SELECT enum_value.enumlabel
      FROM pg_type AS enum_type
      JOIN pg_enum AS enum_value ON enum_type.oid = enum_value.enumtypid
      WHERE enum_type.typname = ${typeName}
      ORDER BY enum_value.enumsortorder
    `;
    return rows.map((row) => row.enumlabel);
  }

  it("has exact complaint, priority, and status labels in the database catalog", async () => {
    await expect(enumLabels("ComplaintCategory")).resolves.toEqual([
      "AKADEMIK",
      "KEMAHASISWAAN",
      "SARANA",
      "PELECEHAN_SEKSUAL",
      "LAINNYA",
    ]);
    await expect(enumLabels("TicketPriority")).resolves.toEqual([
      "RENDAH",
      "SEDANG",
      "TINGGI",
      "URGENT",
    ]);
    await expect(enumLabels("TicketStatus")).resolves.toEqual([
      "BARU",
      "DIVERIFIKASI",
      "DIPROSES",
      "MENUNGGU_PELAPOR",
      "SELESAI",
      "DITOLAK",
    ]);
  });

  it("defaults new Ticket priorities to SEDANG", async () => {
    const rows = await prisma.$queryRaw<Array<{column_default: string | null}>>`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Ticket'
        AND column_name = 'priority'
    `;
    expect(rows).toEqual([{column_default: "'SEDANG'::\"TicketPriority\""}]);
  });
});
