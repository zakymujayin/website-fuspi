import {createHash, randomBytes} from "node:crypto";
import {chmod, link, lstat, mkdir, open, readFile, realpath, unlink} from "node:fs/promises";
import path from "node:path";
import {z} from "zod";

import {
  AnyStorageKeySchema,
  EncryptedPpksStorageKeySchema,
  Sha256ChecksumSchema,
  StorageClassSchema,
  StorageKeySchema,
  ValidatedUploadSchema,
  type ValidatedUpload,
} from "@/contracts/storage";
import {storageBoundaryError} from "@/lib/storage/error";
import {resolveStoragePath, type StorageRoots} from "@/lib/storage/paths";

type StagedState = "STAGED" | "COMMITTED" | "DISCARDED";
export type StagedUpload = {
  readonly storageKey: string;
  readonly checksumSha256: string;
  commit(): Promise<void>;
  discard(): Promise<void>;
};

const StagedBytesSchema = z.object({
  storageClass: StorageClassSchema,
  storageKey: AnyStorageKeySchema,
  size: z.number().int().positive().max(20_971_520),
  checksumSha256: Sha256ChecksumSchema,
  bytes: z.instanceof(Uint8Array),
}).strict().superRefine((value, context) => {
  const keyMatchesClass = value.storageClass === "PPKS_PRIVATE"
    ? EncryptedPpksStorageKeySchema.safeParse(value.storageKey).success
    : StorageKeySchema.safeParse(value.storageKey).success;
  if (!keyMatchesClass || value.bytes.byteLength !== value.size) {
    context.addIssue({code: "custom", message: "Invalid staged file."});
  }
});

export type StagedBytesInput = z.infer<typeof StagedBytesSchema>;

// These paths come from runtime storage configuration, not build-time project files. The inline
// directives prevent standalone tracing from treating their filesystem targets as source inputs.
async function ensureRealDirectory(directory: string, mode: number): Promise<void> {
  try {
    await mkdir(/*turbopackIgnore: true*/ directory, {mode});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stats = await lstat(/*turbopackIgnore: true*/ directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw storageBoundaryError();
}

async function verifyRoot(root: string): Promise<void> {
  await mkdir(/*turbopackIgnore: true*/ root, {recursive: true, mode: 0o750});
  const stats = await lstat(/*turbopackIgnore: true*/ root);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw storageBoundaryError();
  if (
    await realpath(/*turbopackIgnore: true*/ root)
      !== path.resolve(/*turbopackIgnore: true*/ root)
  ) {
    throw storageBoundaryError();
  }
}

async function createDestinationDirectories(root: string, storageKey: string): Promise<void> {
  const [year, month] = storageKey.split("/");
  if (!year || !month) throw storageBoundaryError();
  const yearDirectory = path.join(/*turbopackIgnore: true*/ root, year);
  await ensureRealDirectory(yearDirectory, 0o750);
  await ensureRealDirectory(path.join(yearDirectory, month), 0o750);
}

async function removeIfPresent(filename: string): Promise<void> {
  try {
    await unlink(/*turbopackIgnore: true*/ filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function stageVerifiedBytes(rawUpload: StagedBytesInput, roots: StorageRoots): Promise<StagedUpload> {
  let temporaryPath: string | undefined;
  try {
    const upload = StagedBytesSchema.parse(rawUpload);
    const root = roots[upload.storageClass];
    await verifyRoot(root);
    const stagingDirectory = path.join(/*turbopackIgnore: true*/ root, ".staging");
    await ensureRealDirectory(stagingDirectory, 0o700);
    await chmod(/*turbopackIgnore: true*/ stagingDirectory, 0o700);
    temporaryPath = path.join(stagingDirectory, `${randomBytes(32).toString("hex")}.tmp`);
    const handle = await open(/*turbopackIgnore: true*/ temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(upload.bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }

    let state: StagedState = "STAGED";
    return {
      storageKey: upload.storageKey,
      checksumSha256: upload.checksumSha256,
      async commit() {
        if (state !== "STAGED") throw storageBoundaryError();
        let destination: string | undefined;
        let destinationLinked = false;
        try {
          const current = await readFile(/*turbopackIgnore: true*/ temporaryPath!);
          const checksum = createHash("sha256").update(current).digest("hex");
          if (checksum !== upload.checksumSha256 || current.byteLength !== upload.size) {
            throw storageBoundaryError();
          }
          await createDestinationDirectories(root, upload.storageKey);
          destination = resolveStoragePath(root, upload.storageKey);
          const destinationDirectory = path.dirname(destination);
          if (
            await realpath(/*turbopackIgnore: true*/ destinationDirectory)
              !== destinationDirectory
          ) {
            throw storageBoundaryError();
          }
          await link(
            /*turbopackIgnore: true*/ temporaryPath!,
            /*turbopackIgnore: true*/ destination,
          );
          destinationLinked = true;
          await chmod(
            /*turbopackIgnore: true*/ destination,
            upload.storageClass === "PUBLIC" ? 0o640 : 0o600,
          );
          await unlink(/*turbopackIgnore: true*/ temporaryPath!);
          state = "COMMITTED";
        } catch {
          if (destination && destinationLinked) {
            await removeIfPresent(destination).catch(() => undefined);
          }
          await removeIfPresent(temporaryPath!);
          state = "DISCARDED";
          throw storageBoundaryError();
        }
      },
      async discard() {
        if (state === "COMMITTED") throw storageBoundaryError();
        if (state === "DISCARDED") return;
        try {
          await removeIfPresent(temporaryPath!);
          state = "DISCARDED";
        } catch {
          throw storageBoundaryError();
        }
      },
    };
  } catch {
    if (temporaryPath) await removeIfPresent(temporaryPath).catch(() => undefined);
    throw storageBoundaryError();
  }
}

export async function stageUpload(rawUpload: ValidatedUpload, roots: StorageRoots): Promise<StagedUpload> {
  try {
    const upload = ValidatedUploadSchema.parse(rawUpload);
    return await stageVerifiedBytes({
      storageClass: upload.storageClass,
      storageKey: upload.storageKey,
      size: upload.size,
      checksumSha256: upload.checksumSha256,
      bytes: upload.bytes,
    }, roots);
  } catch {
    throw storageBoundaryError();
  }
}
