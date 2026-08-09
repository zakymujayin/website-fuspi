// @vitest-environment node

import {mkdtemp, readFile, readdir, rm, symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import sharp from "sharp";
import {afterEach, describe, expect, it} from "vitest";

import type {
  PpksAttachmentCryptoMetadata,
} from "@/contracts/storage";
import {
  decryptPpksAttachment,
  encryptAndStagePpksAttachment,
  parseStorageRoots,
  PpksAttachmentError,
  validatePpksAttachmentUpload,
} from "@/lib/storage";
import {resolveStoragePath} from "@/lib/storage/paths";

const keyV1 = Buffer.alloc(32, 0x11);
const keyV2 = Buffer.alloc(32, 0x22);
const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "fuspi-ppks-attachment-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function roots() {
  const base = await temporaryDirectory();
  return {
    base,
    roots: parseStorageRoots({
      PUBLIC: path.join(base, "public"),
      PRIVATE: path.join(base, "private"),
      PPKS_PRIVATE: path.join(base, "ppks"),
    }),
  };
}

async function imageAttachment(name = "Identitas Pelapor.png") {
  const bytes = await sharp({
    create: {width: 24, height: 16, channels: 3, background: {r: 120, g: 20, b: 40}},
  }).png().toBuffer();
  return validatePpksAttachmentUpload({
    bytes,
    originalName: name,
    declaredMime: "image/png",
    now: new Date("2026-07-15T00:00:00.000Z"),
  });
}

function pdfAttachmentBytes(secret = "synthetic-sensitive-phrase") {
  return Buffer.from(
    `%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Synthetic (${secret}) >>\nendobj\nstartxref\n0\n%%EOF\n`,
    "latin1",
  );
}

async function pdfAttachment(name = "Nama Pelapor dan Bukti.pdf") {
  return validatePpksAttachmentUpload({
    bytes: pdfAttachmentBytes(),
    originalName: name,
    declaredMime: "application/pdf",
    now: new Date("2026-07-15T00:00:00.000Z"),
  });
}

async function onlyStagedCiphertext(root: string) {
  const staging = path.join(root, ".staging");
  const names = await readdir(staging);
  expect(names).toHaveLength(1);
  return readFile(path.join(staging, names[0]!));
}

function resolver(version: number) {
  return new Map<number, Uint8Array>([[1, keyV1], [2, keyV2]]).get(version);
}

function flipBase64Url(value: string) {
  const bytes = Buffer.from(value, "base64url");
  bytes[0] ^= 0x01;
  return bytes.toString("base64url");
}

function expectGenericFailure(callback: () => unknown) {
  try {
    callback();
    throw new Error("Expected protected attachment operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(PpksAttachmentError);
    expect(error).toMatchObject({
      name: "PpksAttachmentError",
      message: "Unable to process protected attachment.",
    });
    expect(String(error)).not.toMatch(/ticket-|nonce|tag|key|cipher|checksum|\/tmp|pelapor/i);
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("PPKS attachment validation privacy", () => {
  it("replaces a sensitive image filename and emits an encrypted-only key", async () => {
    const attachment = await imageAttachment();
    expect(attachment).toMatchObject({
      storageClass: "PPKS_PRIVATE",
      originalName: "lampiran.webp",
      mimeType: "image/webp",
    });
    expect(attachment.storageKey).toMatch(/^2026\/07\/[a-f0-9]{64}\.enc$/);
    expect(JSON.stringify(attachment)).not.toContain("Identitas Pelapor");
  });

  it("replaces a sensitive PDF filename", async () => {
    const attachment = await pdfAttachment();
    expect(attachment.originalName).toBe("lampiran.pdf");
    expect(JSON.stringify(attachment)).not.toContain("Nama Pelapor");
  });

  it.each(["../bukti.png", "bukti.php.png", "bukti.png\0.php"])(
    "retains strict filename rejection for %j",
    async (originalName) => {
      await expect(imageAttachment(originalName)).rejects.toThrow("Unable to process file.");
    },
  );
});

describe("PPKS ciphertext-only staged storage", () => {
  it("never writes plaintext and round-trips only with correct AAD and key", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await pdfAttachment();
    const staged = await encryptAndStagePpksAttachment({
      attachment,
      ticketId: "ticket-synthetic-1",
      attachmentId: "attachment-synthetic-1",
      key: keyV1,
      keyVersion: 1,
      roots: storageRoots,
    });
    const stagedCiphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    expect(Object.keys(staged).sort()).toEqual(["commit", "discard", "metadata"]);
    expect(stagedCiphertext).not.toEqual(Buffer.from(attachment.bytes));
    expect(stagedCiphertext.toString("latin1")).not.toContain("synthetic-sensitive-phrase");
    await expect(readdir(storageRoots.PUBLIC)).rejects.toMatchObject({code: "ENOENT"});
    await expect(readdir(storageRoots.PRIVATE)).rejects.toMatchObject({code: "ENOENT"});

    await staged.commit();
    const storedCiphertext = await readFile(resolveStoragePath(
      storageRoots.PPKS_PRIVATE,
      staged.metadata.storageKey,
    ));
    expect(decryptPpksAttachment({
      ciphertext: storedCiphertext,
      metadata: staged.metadata,
      ticketId: "ticket-synthetic-1",
      attachmentId: "attachment-synthetic-1",
      resolveKey: resolver,
    })).toEqual(Buffer.from(attachment.bytes));
  });

  it("uses a fresh nonce for the same validated attachment", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const first = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    const firstCiphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    await first.discard();
    const second = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    const secondCiphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    expect(first.metadata.encryptionNonce).not.toBe(second.metadata.encryptionNonce);
    expect(firstCiphertext).not.toEqual(secondCiphertext);
    await second.discard();
  });

  it.each([
    ["ticket", "ticket-2", "attachment-1"],
    ["attachment", "ticket-1", "attachment-2"],
  ])("binds ciphertext to the %s identity", async (_label, ticketId, attachmentId) => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const staged = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    const ciphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    expectGenericFailure(() => decryptPpksAttachment({
      ciphertext, metadata: staged.metadata, ticketId, attachmentId, resolveKey: resolver,
    }));
    await staged.discard();
  });

  it("resolves rotated keys strictly by key version", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const staged = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV2, keyVersion: 2, roots: storageRoots,
    });
    const ciphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    expect(decryptPpksAttachment({
      ciphertext, metadata: staged.metadata, ticketId: "ticket-1",
      attachmentId: "attachment-1", resolveKey: resolver,
    })).toEqual(Buffer.from(attachment.bytes));
    expectGenericFailure(() => decryptPpksAttachment({
      ciphertext, metadata: staged.metadata, ticketId: "ticket-1",
      attachmentId: "attachment-1", resolveKey: () => keyV1,
    }));
    expectGenericFailure(() => decryptPpksAttachment({
      ciphertext, metadata: {...staged.metadata, keyVersion: 99}, ticketId: "ticket-1",
      attachmentId: "attachment-1", resolveKey: resolver,
    }));
    await staged.discard();
  });

  it("rejects ciphertext, nonce, tag, and checksum tampering generically", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const staged = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    const ciphertext = await onlyStagedCiphertext(storageRoots.PPKS_PRIVATE);
    const tamperedCiphertext = Buffer.from(ciphertext);
    tamperedCiphertext[0] ^= 0x01;
    const attempts: Array<[Uint8Array, PpksAttachmentCryptoMetadata]> = [
      [tamperedCiphertext, staged.metadata],
      [ciphertext, {...staged.metadata, encryptionNonce: flipBase64Url(staged.metadata.encryptionNonce)}],
      [ciphertext, {...staged.metadata, encryptionTag: flipBase64Url(staged.metadata.encryptionTag)}],
      [ciphertext, {...staged.metadata, checksumSha256: "0".repeat(64)}],
    ];
    for (const [candidate, metadata] of attempts) {
      expectGenericFailure(() => decryptPpksAttachment({
        ciphertext: candidate, metadata, ticketId: "ticket-1",
        attachmentId: "attachment-1", resolveKey: resolver,
      }));
    }
    await staged.discard();
  });

  it("rejects plaintext modified after validation before writing any file", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const modified = Buffer.from(attachment.bytes);
    modified[0] ^= 0x01;
    await expect(encryptAndStagePpksAttachment({
      attachment: {...attachment, bytes: modified},
      ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    })).rejects.toThrow(PpksAttachmentError);
    await expect(readdir(storageRoots.PPKS_PRIVATE)).rejects.toMatchObject({code: "ENOENT"});
  });

  it("discards ciphertext idempotently", async () => {
    const {roots: storageRoots} = await roots();
    const staged = await encryptAndStagePpksAttachment({
      attachment: await imageAttachment(), ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    await staged.discard();
    await staged.discard();
    expect(await readdir(path.join(storageRoots.PPKS_PRIVATE, ".staging"))).toHaveLength(0);
  });

  it("does not overwrite or delete existing ciphertext on collision", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const first = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    await first.commit();
    const destination = resolveStoragePath(storageRoots.PPKS_PRIVATE, attachment.storageKey);
    const original = await readFile(destination);
    const second = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    await expect(second.commit()).rejects.toThrow(PpksAttachmentError);
    expect(await readFile(destination)).toEqual(original);
  });

  it("rejects a symlink destination component and writes nothing outside", async () => {
    const {base, roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    const staged = await encryptAndStagePpksAttachment({
      attachment, ticketId: "ticket-1", attachmentId: "attachment-1",
      key: keyV1, keyVersion: 1, roots: storageRoots,
    });
    const outside = path.join(base, "outside");
    await symlink(outside, path.join(storageRoots.PPKS_PRIVATE, "2026"));
    await expect(staged.commit()).rejects.toThrow(PpksAttachmentError);
    await expect(readFile(path.join(outside, "07", path.basename(attachment.storageKey))))
      .rejects.toMatchObject({code: "ENOENT"});
  });

  it("rejects malformed identities and key material without reflecting them", async () => {
    const {roots: storageRoots} = await roots();
    const attachment = await imageAttachment();
    for (const options of [
      {ticketId: "../ticket", attachmentId: "attachment-1", key: keyV1, keyVersion: 1},
      {ticketId: "ticket-1", attachmentId: "attachment/1", key: keyV1, keyVersion: 1},
      {ticketId: "ticket-1", attachmentId: "attachment-1", key: Buffer.alloc(31), keyVersion: 1},
      {ticketId: "ticket-1", attachmentId: "attachment-1", key: keyV1, keyVersion: 0},
    ]) {
      try {
        await encryptAndStagePpksAttachment({...options, attachment, roots: storageRoots});
        throw new Error("Expected protected attachment operation to fail.");
      } catch (error) {
        expectGenericFailure(() => { throw error; });
      }
    }
  });
});
