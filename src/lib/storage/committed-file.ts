import {randomBytes} from "node:crypto";
import {chmod, lstat, mkdir, realpath, rename, unlink} from "node:fs/promises";
import path from "node:path";

import {
  AnyStorageKeySchema,
  EncryptedPpksStorageKeySchema,
  StorageClassSchema,
  StorageKeySchema,
} from "@/contracts/storage";
import {storageBoundaryError} from "@/lib/storage/error";
import {resolveStoragePath, type StorageRoots} from "@/lib/storage/paths";

async function missing(filename: string): Promise<boolean> {
  try {
    await lstat(filename);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
}

async function validateCommittedTarget(
  roots: StorageRoots,
  rawStorageClass: unknown,
  rawStorageKey: unknown,
) {
  const storageClass = StorageClassSchema.parse(rawStorageClass);
  const storageKey = AnyStorageKeySchema.parse(rawStorageKey);
  const matchesClass = storageClass === "PPKS_PRIVATE"
    ? EncryptedPpksStorageKeySchema.safeParse(storageKey).success
    : StorageKeySchema.safeParse(storageKey).success;
  if (!matchesClass) throw storageBoundaryError();
  const root = roots[storageClass];
  const destination = resolveStoragePath(root, storageKey);
  if (await missing(root)) return {root, destination, exists: false as const};
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw storageBoundaryError();
  if (await realpath(root) !== path.resolve(root)) throw storageBoundaryError();
  const parent = path.dirname(destination);
  if (await missing(parent)) return {root, destination, exists: false as const};
  const parentStats = await lstat(parent);
  if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) throw storageBoundaryError();
  if (await realpath(parent) !== parent) throw storageBoundaryError();
  if (await missing(destination)) return {root, destination, exists: false as const};
  const destinationStats = await lstat(destination);
  if (!destinationStats.isFile() || destinationStats.isSymbolicLink()) throw storageBoundaryError();
  return {root, destination, exists: true as const};
}

export async function removeCommittedFile(
  roots: StorageRoots,
  rawStorageClass: unknown,
  rawStorageKey: unknown,
): Promise<void> {
  try {
    const target = await validateCommittedTarget(roots, rawStorageClass, rawStorageKey);
    if (!target.exists) return;
    await unlink(target.destination);
  } catch (error) {
    if (error instanceof Error && error.name === "StorageBoundaryError") throw error;
    throw storageBoundaryError();
  }
}

export type StagedCommittedFileDeletion = {
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

/** Quarantines one committed file so a database deletion can still roll back safely. */
export async function stageCommittedFileDeletion(
  roots: StorageRoots,
  rawStorageClass: unknown,
  rawStorageKey: unknown,
): Promise<StagedCommittedFileDeletion> {
  try {
    const target = await validateCommittedTarget(roots, rawStorageClass, rawStorageKey);
    if (!target.exists) throw storageBoundaryError();
    const quarantineDirectory = path.join(target.root, ".deleting");
    try {
      await mkdir(quarantineDirectory, {mode: 0o700});
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const quarantineStats = await lstat(quarantineDirectory);
    if (!quarantineStats.isDirectory() || quarantineStats.isSymbolicLink()) {
      throw storageBoundaryError();
    }
    if (await realpath(quarantineDirectory) !== quarantineDirectory) throw storageBoundaryError();
    await chmod(quarantineDirectory, 0o700);
    const quarantine = path.join(
      quarantineDirectory,
      `${randomBytes(32).toString("hex")}.pending`,
    );
    await rename(target.destination, quarantine);
    let state: "STAGED" | "COMMITTED" | "ROLLED_BACK" = "STAGED";
    return {
      async commit() {
        if (state !== "STAGED") throw storageBoundaryError();
        try {
          const stats = await lstat(quarantine);
          if (!stats.isFile() || stats.isSymbolicLink()) throw storageBoundaryError();
          await unlink(quarantine);
          state = "COMMITTED";
        } catch {
          throw storageBoundaryError();
        }
      },
      async rollback() {
        if (state !== "STAGED") throw storageBoundaryError();
        try {
          if (!await missing(target.destination)) throw storageBoundaryError();
          const parent = path.dirname(target.destination);
          if (await realpath(parent) !== parent) throw storageBoundaryError();
          const stats = await lstat(quarantine);
          if (!stats.isFile() || stats.isSymbolicLink()) throw storageBoundaryError();
          await rename(quarantine, target.destination);
          state = "ROLLED_BACK";
        } catch {
          throw storageBoundaryError();
        }
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "StorageBoundaryError") throw error;
    throw storageBoundaryError();
  }
}
