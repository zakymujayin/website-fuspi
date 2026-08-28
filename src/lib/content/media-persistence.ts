import {
  ActiveDatabaseSessionSchema,
  type ActiveDatabaseSession,
} from "@/contracts/auth";
import {
  MediaPersistenceResultSchema,
  MediaValidatedRecordInputSchema,
  type MediaMutationFailureCode,
  type MediaPersistenceResult,
} from "@/contracts/media";
import {authorize} from "@/lib/auth/runtime/authorization";
import {createPrismaClient} from "@/lib/db/client";
import {removeCommittedFile} from "@/lib/storage/committed-file";
import type {StorageRoots} from "@/lib/storage/paths";
import type {StagedUpload} from "@/lib/storage/staged-file";

export type MediaPersistenceDatabase = ReturnType<typeof createPrismaClient>;
export type MediaPersistenceClock = () => Date;

type MediaActor = ActiveDatabaseSession & {role: "ADMIN" | "EDITOR"};
type MediaFailure = Extract<MediaPersistenceResult, {ok: false}>;

const SYSTEM_CLOCK: MediaPersistenceClock = () => new Date();

export class MediaPersistenceInvariantError extends Error {
  constructor() {
    super("Media persistence cleanup requires operator attention.");
    this.name = "MediaPersistenceInvariantError";
  }
}

function failure(
  code: MediaMutationFailureCode,
  storageState: "NOT_STAGED" | "DISCARDED",
): MediaFailure {
  return MediaPersistenceResultSchema.parse({
    ok: false,
    code,
    storageState,
  }) as MediaFailure;
}

function actorFromSession(rawSession: unknown, now: Date): MediaActor | MediaFailure {
  const parsed = ActiveDatabaseSessionSchema.safeParse(rawSession);
  if (!parsed.success || parsed.data.expiresAt.getTime() <= now.getTime()) {
    return failure("UNAUTHENTICATED", "NOT_STAGED");
  }
  if (parsed.data.role !== "ADMIN" && parsed.data.role !== "EDITOR") {
    return failure("FORBIDDEN", "NOT_STAGED");
  }
  const actor = {...parsed.data, role: parsed.data.role};
  if (!authorize({actor, resourceOwnerId: actor.userId}, "CREATE", "MEDIA").allowed) {
    return failure("FORBIDDEN", "NOT_STAGED");
  }
  return actor;
}

function isFailure(
  value: MediaActor | MediaFailure,
): value is MediaFailure {
  return "ok" in value && value.ok === false;
}

async function discardOrThrow(staged: StagedUpload): Promise<void> {
  try {
    await staged.discard();
  } catch {
    throw new MediaPersistenceInvariantError();
  }
}

export async function persistMediaUpload(
  database: MediaPersistenceDatabase,
  rawSession: unknown,
  rawRecord: unknown,
  staged: StagedUpload,
  storageRoots: StorageRoots,
  clock: MediaPersistenceClock = SYSTEM_CLOCK,
): Promise<MediaPersistenceResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) {
    await discardOrThrow(staged);
    return failure(actor.code, "DISCARDED");
  }

  const record = MediaValidatedRecordInputSchema.safeParse(rawRecord);
  if (
    !record.success
    || staged.storageKey !== record.data.storageKey
    || staged.checksumSha256 !== record.data.checksumSha256
  ) {
    await discardOrThrow(staged);
    return failure("VALIDATION_FAILED", "DISCARDED");
  }

  let commitAttempted = false;
  let fileCommitted = false;
  try {
    const media = await database.$transaction(async (transaction) => {
      const created = await transaction.media.create({
        data: {
          storageKey: record.data.storageKey,
          storageClass: record.data.storageClass,
          checksumSha256: record.data.checksumSha256,
          originalName: record.data.originalName,
          mimeType: record.data.mimeType,
          size: record.data.size,
          alt: record.data.alt,
          isDecorative: record.data.isDecorative,
          width: record.data.width,
          height: record.data.height,
          focalX: record.data.focalX,
          focalY: record.data.focalY,
          uploaderId: actor.userId,
          createdAt: now,
        },
        select: {id: true},
      });
      commitAttempted = true;
      await staged.commit();
      fileCommitted = true;
      return created;
    });
    return MediaPersistenceResultSchema.parse({
      ok: true,
      mediaId: media.id,
      storageState: "COMMITTED",
    });
  } catch {
    if (fileCommitted) {
      try {
        await removeCommittedFile(
          storageRoots,
          record.data.storageClass,
          record.data.storageKey,
        );
        await database.media.deleteMany({
          where: {
            storageKey: record.data.storageKey,
            checksumSha256: record.data.checksumSha256,
            uploaderId: actor.userId,
          },
        });
      } catch {
        throw new MediaPersistenceInvariantError();
      }
      return failure("DATABASE_WRITE_FAILED", "DISCARDED");
    }
    await discardOrThrow(staged);
    return failure(
      commitAttempted ? "STORAGE_COMMIT_FAILED" : "DATABASE_WRITE_FAILED",
      "DISCARDED",
    );
  }
}
