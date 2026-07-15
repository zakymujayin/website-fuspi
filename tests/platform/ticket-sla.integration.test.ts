import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {loadActiveHolidayDateKeys} from "@/lib/sla/ticket";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("ticket SLA Holiday source on PostgreSQL", () => {
  const marker = `m2-sla-${Date.now()}`;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    await prisma.holiday.createMany({
      data: [
        {date: new Date("2098-05-01T00:00:00.000Z"), name: `${marker}-active-a`},
        {date: new Date("2098-05-02T00:00:00.000Z"), name: `${marker}-inactive`, isActive: false},
        {date: new Date("2098-05-03T00:00:00.000Z"), name: `${marker}-active-b`},
        {date: new Date("2098-06-01T00:00:00.000Z"), name: `${marker}-outside`},
      ],
    });
  });

  afterAll(async () => {
    await prisma.holiday.deleteMany({where: {name: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("loads only active date-only rows in the inclusive range", async () => {
    await expect(loadActiveHolidayDateKeys(prisma, {
      from: "2098-05-01",
      through: "2098-05-03",
    })).resolves.toEqual(["2098-05-01", "2098-05-03"]);
  });
});
