import {randomInt, randomUUID} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";

import {Prisma} from "@/generated/prisma/client";

import {
  AnnualSequenceAllocationSchema,
  AnnualSequenceInputSchema,
  type AnnualSequenceAllocation,
  type AnnualSequenceInput,
  type AnnualSequenceKind,
} from "@/contracts/operations";
import {createPrismaClient} from "@/lib/db/client";

const MAX_ALLOCATION_ATTEMPTS = 5;
const RETRYABLE_CODES = new Set(["P2034", "40001", "40P01"]);
const localCounterQueues = new Map<string, Promise<void>>();

export type AnnualSequenceDatabase = ReturnType<typeof createPrismaClient>;

export function getJakartaYear(instant: Date) {
  const parsed = AnnualSequenceInputSchema.shape.occurredAt.parse(instant);
  const local = new Date(parsed.getTime() + 7 * 60 * 60_000);
  return local.getUTCFullYear();
}

export function formatAnnualReference(
  kind: AnnualSequenceKind,
  year: number,
  value: number,
) {
  const parsed = AnnualSequenceAllocationSchema.omit({reference: true}).parse({
    kind,
    year,
    value,
  });
  const prefix = parsed.kind === "TICKET" ? "FUSPI" : "PJM";
  return `${prefix}-${parsed.year}-${String(parsed.value).padStart(4, "0")}`;
}

function containsRetryableCode(error: unknown, depth = 0): boolean {
  if (depth > 4 || typeof error !== "object" || error === null) return false;
  const candidate = error as {code?: unknown; cause?: unknown; meta?: unknown};
  if (typeof candidate.code === "string" && RETRYABLE_CODES.has(candidate.code)) return true;
  return containsRetryableCode(candidate.cause, depth + 1)
    || containsRetryableCode(candidate.meta, depth + 1);
}

export function isRetryableAnnualSequenceError(error: unknown) {
  return containsRetryableCode(error);
}

async function withLocalCounterQueue<T>(key: string, operation: () => Promise<T>) {
  const previous = localCounterQueues.get(key) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  localCounterQueues.set(key, tail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (localCounterQueues.get(key) === tail) localCounterQueues.delete(key);
  }
}

export async function allocateAnnualSequence(
  database: AnnualSequenceDatabase,
  input: AnnualSequenceInput,
): Promise<AnnualSequenceAllocation> {
  const parsed = AnnualSequenceInputSchema.parse(input);
  const year = getJakartaYear(parsed.occurredAt);

  return withLocalCounterQueue(`${parsed.kind}:${year}`, async () => {
    for (let attempt = 1; attempt <= MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
      try {
        const rows = await database.$transaction(
          (transaction) => transaction.$queryRaw<Array<{value: number}>>(Prisma.sql`
            INSERT INTO "AnnualSequence" ("id", "kind", "year", "value", "updatedAt")
            VALUES (
              ${randomUUID()},
              ${parsed.kind}::"SequenceKind",
              ${year},
              1,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("kind", "year")
            DO UPDATE SET
              "value" = "AnnualSequence"."value" + 1,
              "updatedAt" = CURRENT_TIMESTAMP
            RETURNING "value"
          `),
          {isolationLevel: Prisma.TransactionIsolationLevel.Serializable},
        );
        const value = rows[0]?.value;
        return AnnualSequenceAllocationSchema.parse({
          kind: parsed.kind,
          year,
          value,
          reference: formatAnnualReference(parsed.kind, year, value),
        });
      } catch (error) {
        if (attempt === MAX_ALLOCATION_ATTEMPTS || !isRetryableAnnualSequenceError(error)) {
          throw error;
        }
        const backoffMs = 5 * 2 ** (attempt - 1) + randomInt(0, 6);
        await delay(backoffMs);
      }
    }

    throw new Error("Annual sequence allocation exhausted its retry boundary.");
  });
}
