import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {
  claimOptimisticVersion,
  runOptimisticMutation,
} from "@/lib/db/optimistic-lock";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("optimistic locking on PostgreSQL", () => {
  const marker = `m2-lock-${Date.now()}`;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.post.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  async function createPost(suffix: string) {
    return prisma.post.create({data: {slug: `${marker}-${suffix}`}});
  }

  it("allows exactly one of two parallel claims for the same version", async () => {
    const post = await createPost("parallel");
    const claim = () => prisma.$transaction((transaction) =>
      claimOptimisticVersion(transaction, {
        resource: "Post",
        id: post.id,
        expectedVersion: 1,
      }));
    const results = await Promise.all([claim(), claim()]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      {ok: false, code: "VERSION_CONFLICT"},
    ]);
    await expect(prisma.post.findUniqueOrThrow({where: {id: post.id}}))
      .resolves.toMatchObject({version: 2});
  });

  it("does not distinguish stale and missing records or call mutation on conflict", async () => {
    const post = await createPost("bounded-conflict");
    const mutate = vi.fn();
    const stale = await runOptimisticMutation(prisma, {
      resource: "Post",
      id: post.id,
      expectedVersion: 2,
    }, mutate);
    const missing = await runOptimisticMutation(prisma, {
      resource: "Post",
      id: `${marker}-missing`,
      expectedVersion: 1,
    }, mutate);

    expect(stale).toEqual({ok: false, code: "VERSION_CONFLICT"});
    expect(missing).toEqual(stale);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("commits the version and translation mutation atomically", async () => {
    const post = await createPost("commit");
    const result = await runOptimisticMutation(prisma, {
      resource: "Post",
      id: post.id,
      expectedVersion: 1,
    }, async (transaction, claim) => {
      await transaction.postTranslation.create({
        data: {
          postId: post.id,
          locale: "id",
          title: "Konten sintetis",
          content: "Konten aman",
          sourceVersion: claim.nextVersion,
        },
      });
      return {savedLocale: "id" as const};
    });

    expect(result).toEqual({
      ok: true,
      previousVersion: 1,
      nextVersion: 2,
      value: {savedLocale: "id"},
    });
    await expect(prisma.post.findUniqueOrThrow({
      where: {id: post.id},
      include: {translations: true},
    })).resolves.toMatchObject({
      version: 2,
      translations: [{locale: "id", sourceVersion: 2}],
    });
  });

  it("rolls back both the version claim and downstream writes on failure", async () => {
    const post = await createPost("rollback");
    await expect(runOptimisticMutation(prisma, {
      resource: "Post",
      id: post.id,
      expectedVersion: 1,
    }, async (transaction) => {
      await transaction.postTranslation.create({
        data: {
          postId: post.id,
          locale: "id",
          title: "Harus rollback",
          content: "Harus rollback",
        },
      });
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");

    await expect(prisma.post.findUniqueOrThrow({
      where: {id: post.id},
      include: {translations: true},
    })).resolves.toMatchObject({version: 1, translations: []});
  });
});
