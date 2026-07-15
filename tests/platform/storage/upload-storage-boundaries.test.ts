// @vitest-environment node

import {createHash} from "node:crypto";
import {chmod, lstat, mkdtemp, readFile, readdir, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import sharp from "sharp";
import {afterEach, describe, expect, it} from "vitest";

import type {ValidatedUpload} from "@/contracts/storage";
import {parseStorageRoots, stageUpload, StorageBoundaryError, validateAndTransformUpload} from "@/lib/storage";
import {resolveStoragePath} from "@/lib/storage/paths";

const temporaryDirectories: string[] = [];
async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "fuspi-storage-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
async function imageBytes(format: "jpeg" | "png" | "webp" = "png", width = 32, height = 24) {
  const image = sharp({create: {width, height, channels: 3, background: {r: 25, g: 65, b: 110}}});
  return format === "jpeg" ? image.jpeg().toBuffer()
    : format === "webp" ? image.webp().toBuffer() : image.png().toBuffer();
}
function pdfBytes(extra = "") {
  return Buffer.from(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog ${extra} >>\nendobj\nstartxref\n0\n%%EOF\n`, "latin1");
}
function expectGenericFailure(error: unknown) {
  expect(error).toBeInstanceOf(StorageBoundaryError);
  expect(error).toMatchObject({name: "StorageBoundaryError", message: "Unable to process file."});
  expect(String(error)).not.toMatch(/sharp|vips|pdf|mime|\/tmp|filename|checksum|symlink/i);
}
async function expectUploadFailure(candidate: Parameters<typeof validateAndTransformUpload>[0]) {
  try {
    await validateAndTransformUpload(candidate);
    throw new Error("Expected upload validation to fail.");
  } catch (error) {
    expectGenericFailure(error);
  }
}
async function validPublicImage(): Promise<ValidatedUpload> {
  return validateAndTransformUpload({
    bytes: await imageBytes(), originalName: "Foto Kegiatan.png", declaredMime: "image/png",
    policy: "CMS_IMAGE", now: new Date("2026-07-15T00:00:00.000Z"),
  });
}
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {recursive: true, force: true})));
});

describe("upload content validation", () => {
  it.each(["jpeg", "png", "webp"] as const)("rewrites real %s as bounded WebP", async (format) => {
    const upload = await validateAndTransformUpload({
      bytes: await imageBytes(format, 2_000, 1_000),
      originalName: `Dokumentasi.${format === "jpeg" ? "jpg" : format}`,
      declaredMime: `image/${format}`, policy: "CMS_IMAGE",
      now: new Date("2026-07-15T00:00:00.000Z"),
    });
    expect(upload).toMatchObject({storageClass: "PUBLIC", mimeType: "image/webp", width: 1_600, height: 800});
    expect(upload.storageKey).toMatch(/^2026\/07\/[a-f0-9]{64}\.webp$/);
    expect(upload.checksumSha256).toBe(createHash("sha256").update(upload.bytes).digest("hex"));
    expect((await sharp(upload.bytes).metadata()).format).toBe("webp");
  });

  it("accepts a terminated PDF under its policy", async () => {
    const bytes = pdfBytes();
    const upload = await validateAndTransformUpload({
      bytes, originalName: "Panduan Akademik.pdf", declaredMime: "application/pdf",
      policy: "PUBLIC_PDF", now: new Date("2027-01-01T00:00:00.000Z"),
    });
    expect(upload).toMatchObject({storageClass: "PUBLIC", mimeType: "application/pdf", width: null, height: null});
    expect(Buffer.from(upload.bytes)).toEqual(bytes);
    expect(upload.storageKey).toMatch(/^2027\/01\/[a-f0-9]{64}\.pdf$/);
  });

  it("assigns ticket attachments to private storage", async () => {
    const upload = await validateAndTransformUpload({
      bytes: await imageBytes("jpeg"), originalName: "Bukti.jpg",
      declaredMime: "image/jpeg", policy: "TICKET_ATTACHMENT",
    });
    expect(upload.storageClass).toBe("PRIVATE");
  });

  it.each([
    ["shell.jpg", "image/jpeg", Buffer.from("<?php system($_GET.x); ?>")],
    ["vector.svg", "image/svg+xml", Buffer.from("<svg onload=alert(1)></svg>")],
    ["page.html", "text/html", Buffer.from("<!doctype html><script>x()</script>")],
    ["binary.exe", "application/octet-stream", Buffer.from("MZ\u0090\0\0")],
    ["unknown.jpg", "image/jpeg", Buffer.from("not an image")],
  ])("rejects spoofed content %s", async (originalName, declaredMime, bytes) => {
    await expectUploadFailure({bytes, originalName, declaredMime, policy: "CMS_IMAGE"});
  });

  it("rejects declared and detected MIME disagreement", async () => {
    await expectUploadFailure({
      bytes: await imageBytes(), originalName: "photo.png", declaredMime: "image/jpeg", policy: "CMS_IMAGE",
    });
  });

  it.each([
    "../../../etc/passwd.png", "folder\\photo.png", "photo.png\0.php", "photo.php.jpg",
    "photo.final.png", ".png", "photo.svg", "photo\u202Egnp.png",
  ])("rejects hostile filename %j", async (originalName) => {
    await expectUploadFailure({
      bytes: await imageBytes(), originalName, declaredMime: "image/png", policy: "CMS_IMAGE",
    });
  });

  it("rejects oversize before decode", async () => {
    await expectUploadFailure({
      bytes: Buffer.alloc(5_242_881, 0x41), originalName: "large.jpg",
      declaredMime: "image/jpeg", policy: "CMS_IMAGE",
    });
  });

  it("rejects malformed, trailing, and active PDFs", async () => {
    for (const bytes of [
      Buffer.from("%PDF-not-real\n%%EOF\n"), Buffer.from("%PDF-1.7\nno eof"),
      Buffer.concat([pdfBytes(), Buffer.from("<script>after eof</script>")]),
      pdfBytes("/OpenAction 2 0 R"), pdfBytes("/JavaScript (alert)"),
    ]) {
      await expectUploadFailure({bytes, originalName: "document.pdf", declaredMime: "application/pdf", policy: "PUBLIC_PDF"});
    }
  });

  it("rejects forged image dimensions beyond the pixel ceiling", async () => {
    const bytes = Buffer.from(await imageBytes("png", 1, 1));
    bytes.writeUInt32BE(100_000, 16);
    bytes.writeUInt32BE(100_000, 20);
    await expectUploadFailure({bytes, originalName: "bomb.png", declaredMime: "image/png", policy: "CMS_IMAGE"});
  });

  it("rejects a valid file under a mismatched feature policy", async () => {
    await expectUploadFailure({bytes: pdfBytes(), originalName: "x.pdf", declaredMime: "application/pdf", policy: "CMS_IMAGE"});
  });
});

describe("filesystem storage boundary", () => {
  async function roots() {
    const base = await temporaryDirectory();
    return {base, parsed: parseStorageRoots({
      PUBLIC: path.join(base, "nested", "public"), PRIVATE: path.join(base, "private"),
      PPKS_PRIVATE: path.join(base, "ppks"),
    })};
  }

  it("requires absolute, complete, distinct, non-overlapping roots", async () => {
    const base = await temporaryDirectory();
    for (const invalid of [
      {PUBLIC: "relative", PRIVATE: path.join(base, "private"), PPKS_PRIVATE: path.join(base, "ppks")},
      {PUBLIC: base, PRIVATE: base, PPKS_PRIVATE: path.join(base, "ppks")},
      {PUBLIC: base, PRIVATE: path.join(base, "private"), PPKS_PRIVATE: path.join(base, "ppks")},
    ]) expect(() => parseStorageRoots(invalid)).toThrow(StorageBoundaryError);
    expect(() => parseStorageRoots({PUBLIC: path.join(base, "public"), PRIVATE: path.join(base, "private")} as never))
      .toThrow(StorageBoundaryError);
  });

  it.each([
    "../../../etc/passwd.pdf", "/absolute/file.pdf", "2026/07/../escape.pdf",
    "2026\\07\\file.pdf", "2026/07/file.pdf\0hidden", `2026/13/${"a".repeat(64)}.pdf`,
  ])("rejects non-contract key %j", async (key) => {
    const {parsed} = await roots();
    expect(() => resolveStoragePath(parsed.PUBLIC, key)).toThrow(StorageBoundaryError);
  });

  it("stages, commits, and uses restrictive permissions", async () => {
    const {parsed} = await roots();
    const upload = await validPublicImage();
    const staged = await stageUpload(upload, parsed);
    expect(await readdir(path.join(parsed.PUBLIC, ".staging"))).toHaveLength(1);
    await staged.commit();
    const destination = resolveStoragePath(parsed.PUBLIC, upload.storageKey);
    expect(await readFile(destination)).toEqual(Buffer.from(upload.bytes));
    expect((await lstat(destination)).mode & 0o777).toBe(0o640);
    expect(await readdir(path.join(parsed.PUBLIC, ".staging"))).toHaveLength(0);
    await expect(staged.commit()).rejects.toThrow(StorageBoundaryError);
    await expect(staged.discard()).rejects.toThrow(StorageBoundaryError);
  });

  it("discards idempotently", async () => {
    const {parsed} = await roots();
    const staged = await stageUpload(await validPublicImage(), parsed);
    await staged.discard();
    await staged.discard();
    expect(await readdir(path.join(parsed.PUBLIC, ".staging"))).toHaveLength(0);
  });

  it("detects staged-byte tampering and cleans it", async () => {
    const {parsed} = await roots();
    const upload = await validPublicImage();
    const staged = await stageUpload(upload, parsed);
    const staging = path.join(parsed.PUBLIC, ".staging");
    const [name] = await readdir(staging);
    await writeFile(path.join(staging, name!), "tampered");
    await expect(staged.commit()).rejects.toThrow(StorageBoundaryError);
    expect(await readdir(staging)).toHaveLength(0);
    await expect(readFile(resolveStoragePath(parsed.PUBLIC, upload.storageKey))).rejects.toMatchObject({code: "ENOENT"});
  });

  it("never overwrites or deletes an existing key on collision", async () => {
    const {parsed} = await roots();
    const upload = await validPublicImage();
    await (await stageUpload(upload, parsed)).commit();
    const destination = resolveStoragePath(parsed.PUBLIC, upload.storageKey);
    const original = await readFile(destination);
    const second = await stageUpload(upload, parsed);
    await expect(second.commit()).rejects.toThrow(StorageBoundaryError);
    expect(await readFile(destination)).toEqual(original);
  });

  it("rejects symlink roots and components without writing outside", async () => {
    const {base, parsed} = await roots();
    const outside = path.join(base, "outside");
    await chmod(base, 0o750);
    const upload = await validPublicImage();
    const staged = await stageUpload(upload, parsed);
    await symlink(outside, path.join(parsed.PUBLIC, "2026"));
    await expect(staged.commit()).rejects.toThrow(StorageBoundaryError);
    await expect(readFile(path.join(outside, "07", path.basename(upload.storageKey)))).rejects.toMatchObject({code: "ENOENT"});
    const symlinkRoot = path.join(base, "public-link");
    await symlink(parsed.PUBLIC, symlinkRoot);
    await expect(stageUpload(upload, {...parsed, PUBLIC: symlinkRoot})).rejects.toThrow(StorageBoundaryError);
  });

  it("fails closed for plaintext PPKS_PRIVATE", async () => {
    const {parsed} = await roots();
    await expect(stageUpload({...await validPublicImage(), storageClass: "PPKS_PRIVATE"} as never, parsed))
      .rejects.toThrow(StorageBoundaryError);
    await expect(readdir(parsed.PPKS_PRIVATE)).rejects.toMatchObject({code: "ENOENT"});
  });
});
