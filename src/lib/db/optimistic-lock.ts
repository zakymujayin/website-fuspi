import {Prisma} from "@/generated/prisma/client";

import {
  OptimisticClaimSchema,
  OptimisticConflictSchema,
  OptimisticLockInputSchema,
  type OptimisticClaim,
  type OptimisticConflict,
  type OptimisticLockInput,
} from "@/contracts/operations";
import {createPrismaClient} from "@/lib/db/client";

export type OptimisticDatabase = ReturnType<typeof createPrismaClient>;
export type OptimisticClaimResult = OptimisticClaim | OptimisticConflict;
export type OptimisticMutationResult<T> =
  | OptimisticConflict
  | (OptimisticClaim & {value: T});

const VERSION_CONFLICT = Object.freeze(
  OptimisticConflictSchema.parse({ok: false, code: "VERSION_CONFLICT"}),
);

export async function claimOptimisticVersion(
  transaction: Prisma.TransactionClient,
  input: OptimisticLockInput,
): Promise<OptimisticClaimResult> {
  const parsed = OptimisticLockInputSchema.parse(input);
  const where = {id: parsed.id, version: parsed.expectedVersion};
  const data = {version: {increment: 1}} as const;
  let count: number;

  switch (parsed.resource) {
    case "Post":
      count = (await transaction.post.updateMany({where, data})).count;
      break;
    case "Page":
      count = (await transaction.page.updateMany({where, data})).count;
      break;
    case "Booking":
      count = (await transaction.booking.updateMany({where, data})).count;
      break;
  }

  if (count !== 1) return VERSION_CONFLICT;
  return OptimisticClaimSchema.parse({
    ok: true,
    previousVersion: parsed.expectedVersion,
    nextVersion: parsed.expectedVersion + 1,
  });
}

export async function runOptimisticMutation<T>(
  database: OptimisticDatabase,
  input: OptimisticLockInput,
  mutate: (
    transaction: Prisma.TransactionClient,
    claim: OptimisticClaim,
  ) => Promise<T>,
): Promise<OptimisticMutationResult<T>> {
  const parsed = OptimisticLockInputSchema.parse(input);
  return database.$transaction(async (transaction) => {
    const claim = await claimOptimisticVersion(transaction, parsed);
    if (!claim.ok) return claim;
    const value = await mutate(transaction, claim);
    return {...claim, value};
  });
}
