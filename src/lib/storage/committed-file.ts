import {lstat, realpath, unlink} from "node:fs/promises";
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

export async function removeCommittedFile(
  roots: StorageRoots,
  rawStorageClass: unknown,
  rawStorageKey: unknown,
): Promise<void> {
  try {
    const storageClass = StorageClassSchema.parse(rawStorageClass);
    const storageKey = AnyStorageKeySchema.parse(rawStorageKey);
    const matchesClass = storageClass === "PPKS_PRIVATE"
      ? EncryptedPpksStorageKeySchema.safeParse(storageKey).success
      : StorageKeySchema.safeParse(storageKey).success;
    if (!matchesClass) throw storageBoundaryError();
    const root = roots[storageClass];
    const destination = resolveStoragePath(root, storageKey);

    if (await missing(root)) return;
    const rootStats = await lstat(root);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw storageBoundaryError();
    if (await realpath(root) !== path.resolve(root)) throw storageBoundaryError();

    const parent = path.dirname(destination);
    if (await missing(parent)) return;
    if (await realpath(parent) !== parent) throw storageBoundaryError();
    if (await missing(destination)) return;
    const destinationStats = await lstat(destination);
    if (!destinationStats.isFile() || destinationStats.isSymbolicLink()) {
      throw storageBoundaryError();
    }
    await unlink(destination);
  } catch (error) {
    if (error instanceof Error && error.name === "StorageBoundaryError") throw error;
    throw storageBoundaryError();
  }
}
