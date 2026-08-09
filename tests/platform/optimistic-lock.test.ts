import {describe, expect, it, vi} from "vitest";

import type {Prisma} from "@/generated/prisma/client";

import {OptimisticLockInputSchema} from "@/contracts/operations";
import {claimOptimisticVersion} from "@/lib/db/optimistic-lock";

function fakeTransaction(count: number) {
  const updateMany = vi.fn().mockResolvedValue({count});
  const transaction = {
    post: {updateMany},
    page: {updateMany},
    booking: {updateMany},
  } as unknown as Prisma.TransactionClient;
  return {transaction, updateMany};
}

describe("optimistic locking contract", () => {
  it("rejects unknown resources and versions that cannot be incremented safely", () => {
    expect(OptimisticLockInputSchema.safeParse({
      resource: "Ticket",
      id: "record-1",
      expectedVersion: 1,
    }).success).toBe(false);
    expect(OptimisticLockInputSchema.safeParse({
      resource: "Post",
      id: "record-1",
      expectedVersion: 2_147_483_647,
    }).success).toBe(false);
  });

  it.each(["Post", "Page", "Booking"] as const)(
    "claims %s through id+version and increments exactly once",
    async (resource) => {
      const {transaction, updateMany} = fakeTransaction(1);
      await expect(claimOptimisticVersion(transaction, {
        resource,
        id: " record-1 ",
        expectedVersion: 7,
      })).resolves.toEqual({ok: true, previousVersion: 7, nextVersion: 8});
      expect(updateMany).toHaveBeenCalledWith({
        where: {id: "record-1", version: 7},
        data: {version: {increment: 1}},
      });
    },
  );

  it("returns the same bounded result when no row matches", async () => {
    const {transaction} = fakeTransaction(0);
    await expect(claimOptimisticVersion(transaction, {
      resource: "Post",
      id: "missing-or-stale",
      expectedVersion: 1,
    })).resolves.toEqual({ok: false, code: "VERSION_CONFLICT"});
  });
});
