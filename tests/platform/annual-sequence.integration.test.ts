import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {allocateAnnualSequence} from "@/lib/sequence/annual";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("annual sequence concurrency on PostgreSQL", () => {
  const years = [2094, 2095, 2096, 2097];
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    await prisma.annualSequence.deleteMany({where: {year: {in: years}}});
  });

  afterAll(async () => {
    await prisma.annualSequence.deleteMany({where: {year: {in: years}}});
    await prisma.$disconnect();
  });

  it("allocates 20 unique gap-free values for one counter", async () => {
    const occurredAt = new Date("2094-03-01T03:00:00.000Z");
    const allocated = await Promise.all(
      Array.from({length: 20}, () => allocateAnnualSequence(prisma, {
        kind: "TICKET",
        occurredAt,
      })),
    );

    expect(new Set(allocated.map((item) => item.reference))).toHaveLength(20);
    expect(allocated.map((item) => item.value).sort((a, b) => a - b))
      .toEqual(Array.from({length: 20}, (_, index) => index + 1));
    expect(allocated.every((item) => item.reference.startsWith("FUSPI-2094-")))
      .toBe(true);
  });

  it("keeps ticket and booking counters independent under parallel load", async () => {
    const occurredAt = new Date("2095-06-01T03:00:00.000Z");
    const [tickets, bookings] = await Promise.all([
      Promise.all(Array.from({length: 10}, () => allocateAnnualSequence(prisma, {
        kind: "TICKET",
        occurredAt,
      }))),
      Promise.all(Array.from({length: 10}, () => allocateAnnualSequence(prisma, {
        kind: "BOOKING",
        occurredAt,
      }))),
    ]);

    expect(tickets.map((item) => item.value).sort((a, b) => a - b))
      .toEqual(Array.from({length: 10}, (_, index) => index + 1));
    expect(bookings.map((item) => item.value).sort((a, b) => a - b))
      .toEqual(Array.from({length: 10}, (_, index) => index + 1));
    expect(tickets.every((item) => item.reference.startsWith("FUSPI-"))).toBe(true);
    expect(bookings.every((item) => item.reference.startsWith("PJM-"))).toBe(true);
  });

  it("starts a new Jakarta calendar year at one without changing the old counter", async () => {
    const oldYear = await allocateAnnualSequence(prisma, {
      kind: "TICKET",
      occurredAt: new Date("2096-12-31T16:59:59.000Z"),
    });
    const newYear = await allocateAnnualSequence(prisma, {
      kind: "TICKET",
      occurredAt: new Date("2096-12-31T17:00:00.000Z"),
    });

    expect(oldYear).toMatchObject({year: 2096, value: 1, reference: "FUSPI-2096-0001"});
    expect(newYear).toMatchObject({year: 2097, value: 1, reference: "FUSPI-2097-0001"});
    await expect(prisma.annualSequence.findUniqueOrThrow({
      where: {kind_year: {kind: "TICKET", year: 2096}},
    })).resolves.toMatchObject({value: 1});
  });
});
