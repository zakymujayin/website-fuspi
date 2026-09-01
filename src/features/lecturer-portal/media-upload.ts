import {
  LecturerPortalMediaUploadKindSchema,
  LecturerPortalMediaUploadResponseSchema,
  TrustedLecturerActorSchema,
  type LecturerPortalMediaUploadResponse,
} from "@/contracts/lecturer-portal";
import {StorageKeySchema} from "@/contracts/storage";
import {MediaPersistenceInvariantError, persistMediaUpload} from "@/lib/content/media-persistence";
import type {getPrismaClient} from "@/lib/db/client";
import {
  stageUpload,
  validateAndTransformUpload,
  type StorageRoots,
} from "@/lib/storage";

export type LecturerPortalMediaUploadDatabase = ReturnType<typeof getPrismaClient>;
export type LecturerPortalMediaUploadClock = () => Date;
export type LecturerPortalMediaUploadFile = Readonly<{
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}>;

const SYSTEM_CLOCK: LecturerPortalMediaUploadClock = () => new Date();

function failure(code: Extract<LecturerPortalMediaUploadResponse, {ok: false}>["code"]) {
  return LecturerPortalMediaUploadResponseSchema.parse({ok: false, code});
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

function mediaUrl(uploadBase: string, storageKey: string) {
  const parsed = StorageKeySchema.safeParse(storageKey);
  return parsed.success ? `${uploadBase}/${parsed.data}` : null;
}

export function lecturerPortalMediaUploadHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "REQUEST_INVALID" || result.code === "VALIDATION_FAILED") return 400;
  return 503;
}

export async function executeLecturerPortalMediaUpload(
  database: LecturerPortalMediaUploadDatabase,
  rawSession: unknown,
  rawKind: unknown,
  rawFile: unknown,
  storageRoots: StorageRoots,
  publicUploadBaseUrl: string,
  clock: LecturerPortalMediaUploadClock = SYSTEM_CLOCK,
): Promise<LecturerPortalMediaUploadResponse> {
  const now = clock();
  const actor = TrustedLecturerActorSchema.safeParse(rawSession);
  if (!actor.success || actor.data.expiresAt <= now) return failure("SESSION_INVALID");
  const kind = LecturerPortalMediaUploadKindSchema.safeParse(rawKind);
  const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
  if (!kind.success || !uploadBase) return failure("REQUEST_INVALID");
  if (
    typeof rawFile !== "object"
    || rawFile === null
    || Object.keys(rawFile).sort().join(",") !== "bytes,mimeType,name"
    || typeof (rawFile as {name?: unknown}).name !== "string"
    || typeof (rawFile as {mimeType?: unknown}).mimeType !== "string"
    || !((rawFile as {bytes?: unknown}).bytes instanceof Uint8Array)
  ) {
    return failure("REQUEST_INVALID");
  }
  const file = rawFile as LecturerPortalMediaUploadFile;

  let lecturer: {name: string} | null;
  try {
    lecturer = await database.lecturer.findFirst({
      where: {userId: actor.data.userId},
      select: {name: true},
    });
  } catch {
    return failure("UNAVAILABLE");
  }
  if (!lecturer) return failure("NO_LECTURER_PROFILE");

  const policy = kind.data === "PHOTO" ? "CMS_IMAGE" : "PUBLIC_PDF";
  let upload: Awaited<ReturnType<typeof validateAndTransformUpload>>;
  try {
    upload = await validateAndTransformUpload({
      bytes: file.bytes,
      originalName: file.name,
      declaredMime: file.mimeType,
      policy,
      now,
    });
  } catch {
    return failure("VALIDATION_FAILED");
  }

  let staged: Awaited<ReturnType<typeof stageUpload>>;
  try {
    staged = await stageUpload(upload, storageRoots);
  } catch {
    return failure("UPLOAD_FAILED");
  }

  try {
    const result = await persistMediaUpload(database, actor.data, {
      policy,
      storageClass: upload.storageClass,
      storageKey: upload.storageKey,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: upload.size,
      checksumSha256: upload.checksumSha256,
      width: upload.width,
      height: upload.height,
      alt: kind.data === "PHOTO" ? `Foto profil ${lecturer.name}` : "",
      isDecorative: false,
      focalX: null,
      focalY: null,
    }, staged, storageRoots, clock);

    if (!result.ok) {
      if (result.code === "VALIDATION_FAILED") return failure("VALIDATION_FAILED");
      if (result.code === "STORAGE_COMMIT_FAILED") return failure("UPLOAD_FAILED");
      return failure("UNAVAILABLE");
    }
    const url = mediaUrl(uploadBase, upload.storageKey);
    if (!url) return failure("UNAVAILABLE");
    return LecturerPortalMediaUploadResponseSchema.parse({
      ok: true,
      kind: kind.data,
      mediaId: result.mediaId,
      url,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
    });
  } catch (error) {
    if (error instanceof MediaPersistenceInvariantError) return failure("UNAVAILABLE");
    return failure("UNAVAILABLE");
  }
}
