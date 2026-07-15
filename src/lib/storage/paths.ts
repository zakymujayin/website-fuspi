import path from "node:path";
import {StorageKeySchema, type StorageClass} from "@/contracts/storage";
import {storageBoundaryError} from "@/lib/storage/error";

export type StorageRoots = Readonly<Record<StorageClass, string>>;

function overlaps(first: string, second: string): boolean {
  return first === second
    || first.startsWith(`${second}${path.sep}`)
    || second.startsWith(`${first}${path.sep}`);
}

export function parseStorageRoots(input: Record<StorageClass, string>): StorageRoots {
  try {
    if (Object.keys(input).sort().join(",") !== "PPKS_PRIVATE,PRIVATE,PUBLIC") {
      throw storageBoundaryError();
    }
    const roots = Object.fromEntries(Object.entries(input).map(([storageClass, value]) => {
      if (!path.isAbsolute(value) || value.includes("\0")) throw storageBoundaryError();
      return [storageClass, path.resolve(value)];
    })) as Record<StorageClass, string>;
    const values = Object.values(roots);
    for (let index = 0; index < values.length; index += 1) {
      for (let other = index + 1; other < values.length; other += 1) {
        if (overlaps(values[index]!, values[other]!)) throw storageBoundaryError();
      }
    }
    return Object.freeze(roots);
  } catch {
    throw storageBoundaryError();
  }
}

export function resolveStoragePath(root: string, storageKey: string): string {
  try {
    if (!path.isAbsolute(root) || root.includes("\0")) throw storageBoundaryError();
    const candidate = path.resolve(root, StorageKeySchema.parse(storageKey));
    if (!candidate.startsWith(`${path.resolve(root)}${path.sep}`)) throw storageBoundaryError();
    return candidate;
  } catch {
    throw storageBoundaryError();
  }
}
