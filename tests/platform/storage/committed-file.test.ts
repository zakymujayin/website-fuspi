import {mkdir, mkdtemp, readFile, symlink, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";

import {
  parseStorageRoots,
  removeCommittedFile,
  stageCommittedFileDeletion,
} from "@/lib/storage";

const rootsToRemove: string[] = [];
const KEY = `2026/07/${"a".repeat(64)}.webp`;

async function roots() {
  const base = await mkdtemp(path.join(os.tmpdir(), "fuspi-committed-"));
  rootsToRemove.push(base);
  return parseStorageRoots({
    PUBLIC: path.join(base, "public"),
    PRIVATE: path.join(base, "private"),
    PPKS_PRIVATE: path.join(base, "ppks"),
  });
}

afterEach(async () => {
  const {rm} = await import("node:fs/promises");
  await Promise.all(rootsToRemove.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("committed storage compensation", () => {
  it("removes only the validated committed file and is idempotent when missing", async () => {
    const storageRoots = await roots();
    const destination = path.join(storageRoots.PUBLIC, KEY);
    await mkdir(path.dirname(destination), {recursive: true});
    await writeFile(destination, "public");

    await removeCommittedFile(storageRoots, "PUBLIC", KEY);
    await removeCommittedFile(storageRoots, "PUBLIC", KEY);
    await expect(readFile(destination)).rejects.toMatchObject({code: "ENOENT"});
  });

  it("rejects malformed keys and symlink escapes without deleting the target", async () => {
    const storageRoots = await roots();
    const outside = path.join(path.dirname(storageRoots.PUBLIC), "outside");
    await mkdir(outside, {recursive: true});
    const target = path.join(outside, "target.webp");
    await writeFile(target, "keep");
    await mkdir(path.join(storageRoots.PUBLIC, "2026"), {recursive: true});
    await symlink(outside, path.join(storageRoots.PUBLIC, "2026", "07"));

    await expect(removeCommittedFile(
      storageRoots,
      "PUBLIC",
      KEY,
    )).rejects.toMatchObject({name: "StorageBoundaryError"});
    await expect(removeCommittedFile(
      storageRoots,
      "PUBLIC",
      "../target.webp",
    )).rejects.toMatchObject({name: "StorageBoundaryError"});
    await expect(removeCommittedFile(
      storageRoots,
      "PUBLIC",
      `2026/07/${"b".repeat(64)}.enc`,
    )).rejects.toMatchObject({name: "StorageBoundaryError"});
    await expect(readFile(target)).resolves.toEqual(Buffer.from("keep"));
  });

  it("quarantines a committed file and restores it on rollback", async () => {
    const storageRoots = await roots();
    const destination = path.join(storageRoots.PUBLIC, KEY);
    await mkdir(path.dirname(destination), {recursive: true});
    await writeFile(destination, "restore");

    const staged = await stageCommittedFileDeletion(storageRoots, "PUBLIC", KEY);
    await expect(readFile(destination)).rejects.toMatchObject({code: "ENOENT"});
    await staged.rollback();
    await expect(readFile(destination)).resolves.toEqual(Buffer.from("restore"));
    await expect(staged.rollback()).rejects.toMatchObject({name: "StorageBoundaryError"});
    await expect(staged.commit()).rejects.toMatchObject({name: "StorageBoundaryError"});
  });

  it("finalizes a quarantined deletion and rejects missing or replaced targets", async () => {
    const storageRoots = await roots();
    const destination = path.join(storageRoots.PUBLIC, KEY);
    await mkdir(path.dirname(destination), {recursive: true});
    await expect(stageCommittedFileDeletion(storageRoots, "PUBLIC", KEY))
      .rejects.toMatchObject({name: "StorageBoundaryError"});

    await writeFile(destination, "delete");
    const committed = await stageCommittedFileDeletion(storageRoots, "PUBLIC", KEY);
    await committed.commit();
    await expect(readFile(destination)).rejects.toMatchObject({code: "ENOENT"});
    await expect(committed.commit()).rejects.toMatchObject({name: "StorageBoundaryError"});

    await writeFile(destination, "original");
    const staged = await stageCommittedFileDeletion(storageRoots, "PUBLIC", KEY);
    await writeFile(destination, "replacement");
    await expect(staged.rollback()).rejects.toMatchObject({name: "StorageBoundaryError"});
    await expect(readFile(destination)).resolves.toEqual(Buffer.from("replacement"));
  });
});
