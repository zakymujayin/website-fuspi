import {createHash, randomBytes} from "node:crypto";
import {chmod, link, lstat, mkdir, open, readFile, realpath, unlink} from "node:fs/promises";
import path from "node:path";

import {ValidatedUploadSchema, type ValidatedUpload} from "@/contracts/storage";
import {storageBoundaryError} from "@/lib/storage/error";
import {resolveStoragePath, type StorageRoots} from "@/lib/storage/paths";

type StagedState = "STAGED" | "COMMITTED" | "DISCARDED";
export type StagedUpload = {
  readonly storageKey: string;
  readonly checksumSha256: string;
  commit(): Promise<void>;
  discard(): Promise<void>;
};

async function ensureRealDirectory(directory: string, mode: number): Promise<void> {
  try {
    await mkdir(directory, {mode});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stats = await lstat(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw storageBoundaryError();
}

async function verifyRoot(root: string): Promise<void> {
  await mkdir(root, {recursive: true, mode: 0o750});
  const stats = await lstat(root);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw storageBoundaryError();
  if (await realpath(root) !== path.resolve(root)) throw storageBoundaryError();
}

async function createDestinationDirectories(root: string, storageKey: string): Promise<void> {
  const [year, month] = storageKey.split("/");
  if (!year || !month) throw storageBoundaryError();
  const yearDirectory = path.join(root, year);
  await ensureRealDirectory(yearDirectory, 0o750);
  await ensureRealDirectory(path.join(yearDirectory, month), 0o750);
}

async function removeIfPresent(filename: string): Promise<void> {
  try {
    await unlink(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function stageUpload(rawUpload: ValidatedUpload, roots: StorageRoots): Promise<StagedUpload> {
  let temporaryPath: string | undefined;
  try {
    const upload = ValidatedUploadSchema.parse(rawUpload);
    const root = roots[upload.storageClass];
    await verifyRoot(root);
    const stagingDirectory = path.join(root, ".staging");
    await ensureRealDirectory(stagingDirectory, 0o700);
    await chmod(stagingDirectory, 0o700);
    temporaryPath = path.join(stagingDirectory, `${randomBytes(32).toString("hex")}.tmp`);
    const handle = await open(temporaryPath, "wx", 0o600);
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
          const current = await readFile(temporaryPath!);
          const checksum = createHash("sha256").update(current).digest("hex");
          if (checksum !== upload.checksumSha256 || current.byteLength !== upload.size) {
            throw storageBoundaryError();
          }
          await createDestinationDirectories(root, upload.storageKey);
          destination = resolveStoragePath(root, upload.storageKey);
          if (await realpath(path.dirname(destination)) !== path.dirname(destination)) {
            throw storageBoundaryError();
          }
          await link(temporaryPath!, destination);
          destinationLinked = true;
          await chmod(destination, upload.storageClass === "PUBLIC" ? 0o640 : 0o600);
          await unlink(temporaryPath!);
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
