import {Prisma} from "@/generated/prisma/client";

import {ActiveDatabaseSessionSchema, type ActiveDatabaseSession} from "@/contracts/auth";
import {
  MediaPersistenceResultSchema,
  type MediaPersistenceResult,
} from "@/contracts/media";
import {
  AdminMediaListQuerySchema,
  AdminMediaListResultSchema,
  AdminMediaItemSchema,
  AdminMediaListSearchParamsSchema,
  AdminMediaMutationResponseSchema,
  AdminMediaTransportCommandSchema,
  AdminMediaUploadMetadataSchema,
  AdminMediaUploadResponseSchema,
  adminMediaPersistenceInvariantDisposition,
  toAdminMediaMutationResponse,
  type AdminMediaListResult,
  type AdminMediaMutationResponse,
  type AdminMediaUploadResponse,
} from "@/contracts/media-admin";
import {StorageKeySchema} from "@/contracts/storage";
import {authorize} from "@/lib/auth/runtime/authorization";
import {createPrismaClient} from "@/lib/db/client";
import {
  MediaPersistenceInvariantError,
  persistMediaUpload,
} from "@/lib/content/media-persistence";
import {
  removeCommittedFile,
  stageCommittedFileDeletion,
  stageUpload,
  validateAndTransformUpload,
  type StorageRoots,
  type StagedCommittedFileDeletion,
  type StagedUpload,
} from "@/lib/storage";

export type AdminMediaTransportDatabase = ReturnType<typeof createPrismaClient>;
export type AdminMediaTransportClock = () => Date;
export type AdminMediaUploadFile = Readonly<{
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}>;
type Actor = ActiveDatabaseSession & {role: "ADMIN" | "EDITOR"};
type LoadFailureCode = "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE";
export type AdminMediaListLoadResult =
  | {ok: true; data: AdminMediaListResult}
  | {ok: false; code: LoadFailureCode};
export type MediaInvariantReporter = (
  signal: ReturnType<typeof adminMediaPersistenceInvariantDisposition>["operationalAlert"],
) => void | Promise<void>;

const SYSTEM_CLOCK: AdminMediaTransportClock = () => new Date();
const FIXED_INVARIANT_REPORTER: MediaInvariantReporter = (signal) => {
  console.error(signal.code);
};

function actorFromSession(raw: unknown, now: Date): Actor | null {
  const parsed = ActiveDatabaseSessionSchema.safeParse(raw);
  if (
    !parsed.success
    || parsed.data.expiresAt <= now
    || parsed.data.mustChangePassword
    || (parsed.data.role !== "ADMIN" && parsed.data.role !== "EDITOR")
  ) return null;
  return {...parsed.data, role: parsed.data.role};
}

function ownershipWhere(actor: Actor): Prisma.MediaWhereInput {
  return actor.role === "ADMIN" ? {} : {uploaderId: actor.userId};
}

function normalizeUploadBase(raw: string): string | null {
  if (!raw || raw.length > 2_048 || raw.includes("\\") || /[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    return null;
  }
  try {
    const relative = raw.startsWith("/") && !raw.startsWith("//");
    const value = new URL(raw, "https://contract.invalid");
    if ((!relative && value.protocol !== "https:") || value.username || value.password || value.search || value.hash) {
      return null;
    }
    const pathname = value.pathname.replace(/\/+$/u, "");
    if (!pathname || pathname === "/") return null;
    return relative ? pathname : `${value.origin}${pathname}`;
  } catch {
    return null;
  }
}

function persistenceFailure(
  code: Extract<MediaPersistenceResult, {ok: false}>["code"],
  storageState: "NOT_STAGED" | "DISCARDED" = "NOT_STAGED",
): MediaPersistenceResult {
  return MediaPersistenceResultSchema.parse({ok: false, code, storageState});
}

function persistenceSuccess(mediaId: string): MediaPersistenceResult {
  return MediaPersistenceResultSchema.parse({
    ok: true,
    mediaId,
    storageState: "COMMITTED",
  });
}

function mutationFailure(code: Extract<AdminMediaMutationResponse, {ok: false}>["code"]) {
  return AdminMediaMutationResponseSchema.parse({ok: false, code});
}

function uploadFailure(code: Extract<AdminMediaUploadResponse, {ok: false}>["code"]) {
  return AdminMediaUploadResponseSchema.parse({ok: false, code});
}

async function reportInvariant(reporter: MediaInvariantReporter) {
  const disposition = adminMediaPersistenceInvariantDisposition();
  try {
    await reporter(disposition.operationalAlert);
  } catch {
    // The public response remains fixed even when the out-of-band reporter is unavailable.
  }
  return disposition.publicResponse;
}

export function normalizeAdminMediaSearchParams(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length !== 1) return {ok: false as const, code: "REQUEST_INVALID" as const};
    raw[key] = values[0] ?? "";
  }
  const parsed = AdminMediaListSearchParamsSchema.safeParse(raw);
  return parsed.success
    ? {ok: true as const, data: parsed.data}
    : {ok: false as const, code: "REQUEST_INVALID" as const};
}

export async function listAdminMedia(
  database: AdminMediaTransportDatabase,
  rawSession: unknown,
  rawQuery: unknown,
  publicUploadBaseUrl: string,
  clock: AdminMediaTransportClock = SYSTEM_CLOCK,
): Promise<AdminMediaListLoadResult> {
  const actor = actorFromSession(rawSession, clock());
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  if (!authorize({actor, resourceOwnerId: actor.userId}, "VIEW", "MEDIA").allowed) {
    return {ok: false, code: "SESSION_INVALID"};
  }
  const query = AdminMediaListQuerySchema.safeParse(rawQuery);
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!query.success) return {ok: false, code: "REQUEST_INVALID"};
  if (!uploadBase) return {ok: false, code: "UNAVAILABLE"};
  const where: Prisma.MediaWhereInput = {
    storageClass: "PUBLIC",
    ...ownershipWhere(actor),
    ...(query.data.kind === "IMAGE"
      ? {mimeType: "image/webp"}
      : query.data.kind === "PDF"
        ? {mimeType: "application/pdf"}
        : {mimeType: {in: ["image/webp", "application/pdf"]}}),
  };
  const skip = (query.data.page - 1) * query.data.pageSize;
  try {
    const [rows, total] = await database.$transaction([
      database.media.findMany({
        where,
        select: {
          id: true,
          storageKey: true,
          originalName: true,
          mimeType: true,
          size: true,
          alt: true,
          isDecorative: true,
          width: true,
          height: true,
          createdAt: true,
          uploader: {select: {name: true}},
        },
        orderBy: [{createdAt: "desc"}, {id: "asc"}],
        skip,
        take: query.data.pageSize,
      }),
      database.media.count({where}),
    ]);
    const items = rows.flatMap((row) => {
      const storageKey = StorageKeySchema.safeParse(row.storageKey);
      if (!storageKey.success) return [];
      const item = AdminMediaItemSchema.safeParse({
        id: row.id,
        url: `${uploadBase}/${storageKey.data}`,
        mimeType: row.mimeType,
        size: row.size,
        alt: row.alt,
        isDecorative: row.isDecorative,
        width: row.width,
        height: row.height,
        originalName: row.originalName,
        createdAt: row.createdAt.toISOString(),
        uploaderName: row.uploader?.name ?? null,
      });
      return item.success ? [item.data] : [];
    });
    const parsed = AdminMediaListResultSchema.safeParse({
      items,
      page: query.data.page,
      pageSize: query.data.pageSize,
      total,
      hasNextPage: skip + rows.length < total,
    });
    return parsed.success ? {ok: true, data: parsed.data} : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

async function hasMediaReferences(
  transaction: Prisma.TransactionClient,
  media: {
    storageKey: string;
    _count: Record<string, number>;
  },
) {
  if (Object.values(media._count).some((count) => count > 0)) return true;
  const marker = media.storageKey;
  const counts = await Promise.all([
    transaction.postTranslation.count({where: {content: {contains: marker}}}),
    transaction.pageTranslation.count({where: {content: {contains: marker}}}),
    transaction.privacyNoticeTranslation.count({where: {content: {contains: marker}}}),
    transaction.admissionInfoTranslation.count({where: {content: {contains: marker}}}),
    transaction.document.count({where: {storageKey: marker}}),
    transaction.research.count({where: {documentUrl: {contains: marker}}}),
    transaction.communityService.count({where: {documentUrl: {contains: marker}}}),
    transaction.partnership.count({where: {documentUrl: {contains: marker}}}),
  ]);
  return counts.some((count) => count > 0);
}

export async function executeAdminMediaCommand(
  database: AdminMediaTransportDatabase,
  rawSession: unknown,
  rawCommand: unknown,
  storageRoots: StorageRoots,
  clock: AdminMediaTransportClock = SYSTEM_CLOCK,
  invariantReporter: MediaInvariantReporter = FIXED_INVARIANT_REPORTER,
): Promise<AdminMediaMutationResponse> {
  const actor = actorFromSession(rawSession, clock());
  if (!actor) return mutationFailure("SESSION_INVALID");
  const command = AdminMediaTransportCommandSchema.safeParse(rawCommand);
  if (!command.success) return mutationFailure("REQUEST_INVALID");
  let stagedDeletion: StagedCommittedFileDeletion | null = null;
  try {
    const result = await database.$transaction(async (transaction) => {
      const target = await transaction.media.findFirst({
        where: {
          id: command.data.payload.mediaId,
          storageClass: "PUBLIC",
          ...ownershipWhere(actor),
        },
        select: {
          id: true,
          uploaderId: true,
          storageKey: true,
          mimeType: true,
          _count: {select: {
            postCovers: true,
            pageHeroes: true,
            lecturerPhotos: true,
            staffPhotos: true,
            programLogos: true,
            partnershipLogos: true,
            albumCovers: true,
            albumPhotos: true,
            sliderImages: true,
            sectionBackgrounds: true,
            testimonialPhotos: true,
            activityImages: true,
            deanPhotos: true,
          }},
        },
      });
      if (!target) return persistenceFailure("NOT_FOUND");
      const action = command.data.action === "DELETE" ? "DELETE" : "UPDATE";
      if (!authorize({actor, resourceOwnerId: target.uploaderId}, action, "MEDIA").allowed) {
        return persistenceFailure("NOT_FOUND");
      }
      if (command.data.action === "UPDATE_METADATA") {
        if (target.mimeType !== "image/webp") return persistenceFailure("VALIDATION_FAILED");
        const updated = await transaction.media.updateMany({
          where: {id: target.id, storageClass: "PUBLIC", mimeType: "image/webp", ...ownershipWhere(actor)},
          data: {alt: command.data.payload.alt, isDecorative: command.data.payload.isDecorative},
        });
        return updated.count === 1
          ? persistenceSuccess(target.id)
          : persistenceFailure("NOT_FOUND");
      }
      if (await hasMediaReferences(transaction, target)) {
        return persistenceFailure("MEDIA_IN_USE");
      }
      try {
        stagedDeletion = await stageCommittedFileDeletion(storageRoots, "PUBLIC", target.storageKey);
      } catch {
        throw new MediaPersistenceInvariantError();
      }
      const removed = await transaction.media.deleteMany({
        where: {id: target.id, storageClass: "PUBLIC", ...ownershipWhere(actor)},
      });
      if (removed.count !== 1) throw new MediaPersistenceInvariantError();
      return persistenceSuccess(target.id);
    });
    const deletionAfterCommit = stagedDeletion as StagedCommittedFileDeletion | null;
    if (deletionAfterCommit) {
      try {
        await deletionAfterCommit.commit();
      } catch {
        await reportInvariant(invariantReporter);
        return mutationFailure("UNAVAILABLE");
      }
    }
    return toAdminMediaMutationResponse(result);
  } catch (error) {
    const deletionAfterFailure = stagedDeletion as StagedCommittedFileDeletion | null;
    if (deletionAfterFailure) {
      try {
        await deletionAfterFailure.rollback();
      } catch {
        await reportInvariant(invariantReporter);
        return mutationFailure("UNAVAILABLE");
      }
    }
    if (error instanceof MediaPersistenceInvariantError) await reportInvariant(invariantReporter);
    return mutationFailure("UNAVAILABLE");
  }
}

async function discardAll(staged: readonly StagedUpload[]) {
  let failed = false;
  for (const upload of staged) {
    try {
      await upload.discard();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new MediaPersistenceInvariantError();
}

async function compensateCommitted(
  database: AdminMediaTransportDatabase,
  storageRoots: StorageRoots,
  actor: Actor,
  committed: readonly {mediaId: string; storageKey: string; checksumSha256: string}[],
) {
  for (const item of [...committed].reverse()) {
    try {
      await removeCommittedFile(storageRoots, "PUBLIC", item.storageKey);
      const removed = await database.media.deleteMany({
        where: {
          id: item.mediaId,
          storageKey: item.storageKey,
          checksumSha256: item.checksumSha256,
          uploaderId: actor.userId,
        },
      });
      if (removed.count !== 1) throw new MediaPersistenceInvariantError();
    } catch {
      throw new MediaPersistenceInvariantError();
    }
  }
}

export async function executeAdminMediaUpload(
  database: AdminMediaTransportDatabase,
  rawSession: unknown,
  rawMetadata: unknown,
  rawFiles: readonly AdminMediaUploadFile[],
  storageRoots: StorageRoots,
  clock: AdminMediaTransportClock = SYSTEM_CLOCK,
  invariantReporter: MediaInvariantReporter = FIXED_INVARIANT_REPORTER,
): Promise<AdminMediaUploadResponse> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (!actor) return uploadFailure("SESSION_INVALID");
  const metadata = AdminMediaUploadMetadataSchema.safeParse(rawMetadata);
  if (!metadata.success || rawFiles.length !== metadata.data.uploadCount) {
    return uploadFailure("REQUEST_INVALID");
  }
  if (rawFiles.some((file) => (
    typeof file !== "object"
    || file === null
    || Object.keys(file).sort().join(",") !== "bytes,mimeType,name"
    || typeof file.name !== "string"
    || typeof file.mimeType !== "string"
    || !(file.bytes instanceof Uint8Array)
  ))) return uploadFailure("REQUEST_INVALID");
  const validated: Array<{
    upload: Awaited<ReturnType<typeof validateAndTransformUpload>>;
    record: Record<string, unknown>;
  }> = [];
  try {
    for (let index = 0; index < rawFiles.length; index += 1) {
      const file = rawFiles[index]!;
      const intent = metadata.data.intents[index]!;
      const upload = await validateAndTransformUpload({
        bytes: file.bytes,
        originalName: file.name,
        declaredMime: file.mimeType,
        policy: metadata.data.policy,
        now,
      });
      validated.push({
        upload,
        record: {
          policy: metadata.data.policy,
          storageClass: upload.storageClass,
          storageKey: upload.storageKey,
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          size: upload.size,
          checksumSha256: upload.checksumSha256,
          width: upload.width,
          height: upload.height,
          alt: intent.alt,
          isDecorative: intent.isDecorative,
        },
      });
    }
  } catch {
    return uploadFailure("VALIDATION_FAILED");
  }

  const staged: StagedUpload[] = [];
  try {
    for (const item of validated) staged.push(await stageUpload(item.upload, storageRoots));
  } catch {
    try {
      await discardAll(staged);
    } catch {
      await reportInvariant(invariantReporter);
      return uploadFailure("UNAVAILABLE");
    }
    return uploadFailure("UPLOAD_FAILED");
  }

  const committed: Array<{mediaId: string; storageKey: string; checksumSha256: string}> = [];
  for (let index = 0; index < validated.length; index += 1) {
    try {
      const result = await persistMediaUpload(
        database,
        actor,
        validated[index]!.record,
        staged[index]!,
        storageRoots,
        clock,
      );
      if (!result.ok) {
        await discardAll(staged.slice(index + 1));
        await compensateCommitted(database, storageRoots, actor, committed);
        const response = toAdminMediaMutationResponse(result);
        return uploadFailure(response.ok ? "UNAVAILABLE" : response.code);
      }
      committed.push({
        mediaId: result.mediaId,
        storageKey: validated[index]!.upload.storageKey,
        checksumSha256: validated[index]!.upload.checksumSha256,
      });
    } catch {
      try {
        await discardAll(staged.slice(index + 1));
        await compensateCommitted(database, storageRoots, actor, committed);
      } catch {
        await reportInvariant(invariantReporter);
        return uploadFailure("UNAVAILABLE");
      }
      await reportInvariant(invariantReporter);
      return uploadFailure("UNAVAILABLE");
    }
  }
  return AdminMediaUploadResponseSchema.parse({
    ok: true,
    policy: metadata.data.policy,
    items: committed.map((item, index) => ({index, mediaId: item.mediaId})),
  });
}

export function adminMediaHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "MEDIA_IN_USE") return 409;
  if (result.code === "UPLOAD_FAILED") return 422;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
