import type {Prisma} from "@/generated/prisma/client";
import {ActivityLogInputSchema, type ActivityLogInput} from "@/contracts/platform";
import {sanitizeAuditMetadata} from "@/lib/audit/sanitize";

export async function recordActivity(
  tx: Prisma.TransactionClient,
  input: ActivityLogInput,
) {
  const parsed = ActivityLogInputSchema.parse(input);

  return tx.activityLog.create({
    data: {
      actorId: parsed.actorId ?? null,
      action: parsed.action,
      resourceType: parsed.resourceType,
      resourceId: parsed.resourceId ?? null,
      metadata: parsed.metadata
        ? (sanitizeAuditMetadata(parsed.metadata) as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
