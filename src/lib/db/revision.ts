import type {Prisma} from "@/generated/prisma/client";
import {
  ContentRevisionInputSchema,
  type ContentRevisionInput,
} from "@/contracts/platform";

const REVISION_RESOURCE_TYPES = new Set([
  "Post",
  "Page",
  "StudyProgram",
  "Service",
  "Unit",
  "Partnership",
  "Scholarship",
  "Achievement",
  "StudentActivity",
  "Document",
  "Album",
  "Faq",
  "Testimonial",
  "Event",
  "Room",
  "MenuItem",
  "HomeSection",
  "SiteSetting",
  "SiteAlert",
]);

const FORBIDDEN_SNAPSHOT_KEY =
  /(password|token|secret|session|ciphertext|nonce|encryptiontag|privatekey|reporter|identity|ppks|attachment|storagekey)/i;

function findForbiddenKey(value: unknown, path = "snapshot"): string | null {
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = findForbiddenKey(child, `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_SNAPSHOT_KEY.test(key)) return `${path}.${key}`;
      const found = findForbiddenKey(child, `${path}.${key}`);
      if (found) return found;
    }
  }

  return null;
}

export function prepareRevision(input: ContentRevisionInput) {
  const parsed = ContentRevisionInputSchema.parse(input);
  if (!REVISION_RESOURCE_TYPES.has(parsed.resourceType)) {
    throw new Error(`Revision is not permitted for ${parsed.resourceType}.`);
  }

  let snapshot: Record<string, unknown>;
  try {
    const encoded = JSON.stringify(parsed.snapshot);
    if (Buffer.byteLength(encoded, "utf8") > 1_048_576) {
      throw new Error("Revision snapshot exceeds 1 MiB.");
    }
    snapshot = JSON.parse(encoded) as Record<string, unknown>;
  } catch (error) {
    throw new Error("Revision snapshot must be JSON serializable.", {cause: error});
  }

  const forbiddenPath = findForbiddenKey(snapshot);
  if (forbiddenPath) {
    throw new Error(`Revision snapshot contains forbidden data at ${forbiddenPath}.`);
  }

  return {
    resourceType: parsed.resourceType,
    resourceId: parsed.resourceId,
    locale: parsed.locale ?? null,
    scopeKey: parsed.locale ?? "root",
    version: parsed.version,
    snapshotJson: snapshot as Prisma.InputJsonValue,
    changeSummary: parsed.changeSummary ?? null,
    actorId: parsed.actorId ?? null,
  };
}

export async function createContentRevision(
  tx: Prisma.TransactionClient,
  input: ContentRevisionInput,
) {
  return tx.contentRevision.create({data: prepareRevision(input)});
}
