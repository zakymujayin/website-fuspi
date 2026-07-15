import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {resolveSafeRedirect, saveRedirect} from "@/lib/redirect/registry";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("redirect registry safety on PostgreSQL", () => {
  const marker = `m2-redirect-${Date.now()}`;
  const source = (suffix: string) => `/id/${marker}-${suffix}`;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.redirect.deleteMany({where: {sourcePath: {contains: marker}}});
    await prisma.$disconnect();
  });

  it("upserts by source idempotently and resolves one safe hop", async () => {
    const legacy = source("legacy");
    await expect(saveRedirect(prisma, {
      sourcePath: legacy,
      destinationPath: source("final-a"),
    })).resolves.toMatchObject({ok: true});
    await expect(saveRedirect(prisma, {
      sourcePath: legacy,
      destinationPath: source("final-b"),
    })).resolves.toMatchObject({
      ok: true,
      redirect: {destinationPath: source("final-b"), statusCode: 301, isActive: true},
    });
    await expect(prisma.redirect.count({where: {sourcePath: legacy}})).resolves.toBe(1);
    await expect(resolveSafeRedirect(prisma, legacy)).resolves.toEqual({
      destinationPath: source("final-b"),
      statusCode: 301,
    });
    await expect(prisma.redirect.findUniqueOrThrow({where: {sourcePath: legacy}}))
      .resolves.toMatchObject({hitCount: 1});
  });

  it("rejects active chains while allowing an inactive edge", async () => {
    const intermediate = source("intermediate");
    await saveRedirect(prisma, {
      sourcePath: source("chain-origin"),
      destinationPath: intermediate,
    });
    await expect(saveRedirect(prisma, {
      sourcePath: intermediate,
      destinationPath: source("chain-final"),
    })).resolves.toEqual({ok: false, code: "REDIRECT_CHAIN"});

    const inactiveDestination = source("inactive-destination");
    await expect(saveRedirect(prisma, {
      sourcePath: source("inactive-origin"),
      destinationPath: inactiveDestination,
      isActive: false,
    })).resolves.toMatchObject({ok: true});
    await expect(saveRedirect(prisma, {
      sourcePath: inactiveDestination,
      destinationPath: source("inactive-final"),
    })).resolves.toMatchObject({ok: true});
  });

  it("serializes opposite concurrent edges so exactly one is accepted", async () => {
    const a = source("parallel-a");
    const b = source("parallel-b");
    const results = await Promise.all([
      saveRedirect(prisma, {sourcePath: a, destinationPath: b}),
      saveRedirect(prisma, {sourcePath: b, destinationPath: a}),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({code: "REDIRECT_LOOP"});
  });

  it("fails closed on a stored chain and does not increment hitCount", async () => {
    const origin = source("tampered-origin");
    const intermediate = source("tampered-intermediate");
    await prisma.redirect.createMany({data: [
      {sourcePath: origin, destinationPath: intermediate},
      {sourcePath: intermediate, destinationPath: source("tampered-final")},
    ]});
    await expect(resolveSafeRedirect(prisma, origin)).resolves.toBeNull();
    await expect(prisma.redirect.findUniqueOrThrow({where: {sourcePath: origin}}))
      .resolves.toMatchObject({hitCount: 0});
  });
});
