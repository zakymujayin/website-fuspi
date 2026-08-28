import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import type {MediaPersistenceDatabase} from "@/lib/content/media-persistence";
import {
  MediaPersistenceInvariantError,
  persistMediaUpload,
} from "@/lib/content/media-persistence";
import type {StorageRoots} from "@/lib/storage/paths";
import type {StagedUpload} from "@/lib/storage/staged-file";

const NOW = new Date("2026-07-17T01:00:00.000Z");
const KEY = `2026/07/${"a".repeat(64)}.webp`;
const CHECKSUM = "b".repeat(64);
const ROOTS = {
  PUBLIC: "/tmp/fuspi-media-public",
  PRIVATE: "/tmp/fuspi-media-private",
  PPKS_PRIVATE: "/tmp/fuspi-media-ppks",
} as StorageRoots;

function session(role: ActiveDatabaseSession["role"] = "EDITOR"): ActiveDatabaseSession {
  return {
    userId: "editor-1",
    role,
    isActive: true,
    mustChangePassword: false,
    expiresAt: new Date("2026-07-17T09:00:00.000Z"),
  };
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    policy: "CMS_IMAGE",
    storageClass: "PUBLIC",
    storageKey: KEY,
    originalName: "gambar-fuspi.webp",
    mimeType: "image/webp",
    size: 1_024,
    checksumSha256: CHECKSUM,
    width: 320,
    height: 240,
    focalX: null,
    focalY: null,
    alt: "Kegiatan FUSPI",
    isDecorative: false,
    ...overrides,
  };
}

function staged(overrides: Partial<StagedUpload> = {}): StagedUpload {
  return {
    storageKey: KEY,
    checksumSha256: CHECKSUM,
    commit: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function database(options: {
  createFailure?: Error;
  transactionFailureAfterCallback?: Error;
} = {}) {
  const create = options.createFailure
    ? vi.fn().mockRejectedValue(options.createFailure)
    : vi.fn().mockResolvedValue({id: "media-1"});
  const deleteMany = vi.fn().mockResolvedValue({count: 0});
  const client = {
    media: {deleteMany},
    $transaction: vi.fn(async (
      callback: (transaction: {media: {create: typeof create}}) => Promise<unknown>,
    ) => {
      const value = await callback({media: {create}});
      if (options.transactionFailureAfterCallback) throw options.transactionFailureAfterCallback;
      return value;
    }),
  } as unknown as MediaPersistenceDatabase;
  return {client, create, deleteMany};
}

describe("M3 Media persistence boundary", () => {
  it("rejects invalid, expired, inactive, and non-CMS sessions and discards staging", async () => {
    for (const rawSession of [
      null,
      {...session(), expiresAt: NOW},
      {...session(), isActive: false},
      session("PETUGAS"),
    ]) {
      const upload = staged();
      const {client, create} = database();
      const result = await persistMediaUpload(
        client, rawSession, record(), upload, ROOTS, () => NOW,
      );
      expect(result).toMatchObject({ok: false, storageState: "DISCARDED"});
      expect(create).not.toHaveBeenCalled();
      expect(upload.discard).toHaveBeenCalledOnce();
    }
  });

  it("rejects strict payload and staged metadata mismatch before database access", async () => {
    for (const [candidate, upload] of [
      [record({uploaderId: "attacker"}), staged()],
      [record(), staged({storageKey: `2026/07/${"c".repeat(64)}.webp`})],
      [record(), staged({checksumSha256: "d".repeat(64)})],
    ] as const) {
      const {client, create} = database();
      await expect(persistMediaUpload(
        client, session(), candidate, upload, ROOTS, () => NOW,
      )).resolves.toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        storageState: "DISCARDED",
      });
      expect(create).not.toHaveBeenCalled();
      expect(upload.discard).toHaveBeenCalledOnce();
    }
  });

  it("persists only frozen metadata with uploader and time derived from the server", async () => {
    const upload = staged();
    const {client, create} = database();
    await expect(persistMediaUpload(
      client, session(), record(), upload, ROOTS, () => NOW,
    )).resolves.toEqual({
      ok: true,
      mediaId: "media-1",
      storageState: "COMMITTED",
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        storageKey: KEY,
        storageClass: "PUBLIC",
        checksumSha256: CHECKSUM,
        originalName: "gambar-fuspi.webp",
        mimeType: "image/webp",
        size: 1_024,
        alt: "Kegiatan FUSPI",
        isDecorative: false,
        width: 320,
        height: 240,
        focalX: null,
        focalY: null,
        uploaderId: "editor-1",
        createdAt: NOW,
      },
      select: {id: true},
    });
    expect(upload.commit).toHaveBeenCalledOnce();
  });

  it("discards staging on database failure and maps storage commit failure", async () => {
    const databaseFailure = database({createFailure: new Error("postgresql://secret")});
    const first = staged();
    await expect(persistMediaUpload(
      databaseFailure.client, session(), record(), first, ROOTS, () => NOW,
    )).resolves.toEqual({
      ok: false,
      code: "DATABASE_WRITE_FAILED",
      storageState: "DISCARDED",
    });
    expect(first.commit).not.toHaveBeenCalled();
    expect(first.discard).toHaveBeenCalledOnce();

    const storageFailure = staged({
      commit: vi.fn().mockRejectedValue(new Error("/srv/fuspi/private")),
    });
    await expect(persistMediaUpload(
      database().client, session(), record(), storageFailure, ROOTS, () => NOW,
    )).resolves.toEqual({
      ok: false,
      code: "STORAGE_COMMIT_FAILED",
      storageState: "DISCARDED",
    });
    expect(storageFailure.discard).toHaveBeenCalledOnce();
  });

  it("compensates a committed file when the database transaction fails after its callback", async () => {
    const upload = staged();
    const failed = database({
      transactionFailureAfterCallback: new Error("database commit unavailable"),
    });
    const result = await persistMediaUpload(
      failed.client,
      session(),
      record(),
      upload,
      ROOTS,
      () => NOW,
    );
    expect(result).toEqual({
      ok: false,
      code: "DATABASE_WRITE_FAILED",
      storageState: "DISCARDED",
    });
    expect(upload.commit).toHaveBeenCalledOnce();
    expect(upload.discard).not.toHaveBeenCalled();
    expect(failed.deleteMany).toHaveBeenCalledWith({
      where: {
        storageKey: KEY,
        checksumSha256: CHECKSUM,
        uploaderId: "editor-1",
      },
    });
  });

  it("throws only a non-disclosing invariant error when cleanup cannot be confirmed", async () => {
    const upload = staged();
    const result = persistMediaUpload(
      database({
        transactionFailureAfterCallback: new Error("SQL postgresql://secret"),
      }).client,
      session(),
      record(),
      upload,
      {...ROOTS, PUBLIC: "relative-root"} as StorageRoots,
      () => NOW,
    );
    await expect(result).rejects.toEqual(new MediaPersistenceInvariantError());
    await expect(result).rejects.not.toThrow(/secret|SQL|postgresql|srv/i);
  });
});
