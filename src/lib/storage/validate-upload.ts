import {createHash, randomBytes} from "node:crypto";
import {fileTypeFromBuffer} from "file-type";
import sharp from "sharp";

import {
  DetectedUploadMimeSchema,
  UploadPolicySchema,
  ValidatedUploadSchema,
  type UploadPolicy,
  type ValidatedUpload,
  type WritableStorageClass,
} from "@/contracts/storage";
import {storageBoundaryError} from "@/lib/storage/error";

const IMAGE_INPUT_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_PIXELS = 40_000_000;
const POLICY = {
  CMS_IMAGE: {storageClass: "PUBLIC", maxBytes: 5_242_880, kind: "IMAGE"},
  PUBLIC_PDF: {storageClass: "PUBLIC", maxBytes: 20_971_520, kind: "PDF"},
  TICKET_ATTACHMENT: {storageClass: "PRIVATE", maxBytes: 5_242_880, kind: "BOTH"},
  BOOKING_DOCUMENT: {storageClass: "PRIVATE", maxBytes: 10_485_760, kind: "PDF"},
} as const satisfies Record<UploadPolicy, {
  storageClass: WritableStorageClass;
  maxBytes: number;
  kind: "IMAGE" | "PDF" | "BOTH";
}>;
const EXTENSIONS_BY_MIME: Record<string, ReadonlySet<string>> = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "application/pdf": new Set(["pdf"]),
};
const ACTIVE_PDF_PATTERN = /\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b/i;

type UploadCandidate = {
  bytes: Uint8Array;
  originalName: string;
  declaredMime: string;
  policy: UploadPolicy;
  now?: Date;
};

function normalizeDisplayName(originalName: string, detectedMime: string): string {
  if (
    originalName.length < 1
    || Buffer.byteLength(originalName, "utf8") > 255
    || /[\0/\\\u0001-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(originalName)
  ) throw storageBoundaryError();

  const segments = originalName.normalize("NFKC").trim().split(".");
  if (segments.length !== 2) throw storageBoundaryError();
  const extension = segments[1]?.toLowerCase() ?? "";
  if (!EXTENSIONS_BY_MIME[detectedMime]?.has(extension)) throw storageBoundaryError();
  const stem = (segments[0] ?? "")
    .replace(/[^\p{L}\p{N} _()-]+/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/-+/gu, "-")
    .replace(/^[- ]+|[- ]+$/gu, "");
  if (!stem) throw storageBoundaryError();
  const shortened = Array.from(stem).slice(0, 119 - extension.length).join("").trim();
  if (!shortened) throw storageBoundaryError();
  return `${shortened}.${extension}`;
}

function createStorageKey(extension: "webp" | "pdf", now: Date): string {
  if (Number.isNaN(now.getTime())) throw storageBoundaryError();
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(32).toString("hex")}.${extension}`;
}

function validatePdf(bytes: Buffer): void {
  if (!/^%PDF-1\.[0-9]/.test(bytes.subarray(0, 8).toString("ascii"))) {
    throw storageBoundaryError();
  }
  const tail = bytes.subarray(Math.max(0, bytes.length - 1_024)).toString("latin1");
  if (!/%%EOF[\t\r\n ]*$/.test(tail) || ACTIVE_PDF_PATTERN.test(bytes.toString("latin1"))) {
    throw storageBoundaryError();
  }
}

async function transformImage(bytes: Buffer) {
  const input = sharp(bytes, {
    failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS, sequentialRead: true,
  });
  const metadata = await input.metadata();
  if (
    !metadata.width || !metadata.height
    || metadata.width * metadata.height > MAX_IMAGE_PIXELS
    || (metadata.pages ?? 1) !== 1
  ) throw storageBoundaryError();
  const output = await input.rotate().resize({
    width: 1_600, height: 1_600, fit: "inside", withoutEnlargement: true,
  }).webp({quality: 82}).toBuffer({resolveWithObject: true});
  if (!output.info.width || !output.info.height) throw storageBoundaryError();
  return {bytes: output.data, width: output.info.width, height: output.info.height};
}

export async function validateAndTransformUpload(
  candidate: UploadCandidate,
): Promise<ValidatedUpload> {
  try {
    const policy = POLICY[UploadPolicySchema.parse(candidate.policy)];
    const input = Buffer.from(candidate.bytes);
    if (input.byteLength < 1 || input.byteLength > policy.maxBytes) throw storageBoundaryError();
    const detected = await fileTypeFromBuffer(input);
    const detectedMime = DetectedUploadMimeSchema.parse(detected?.mime);
    if (candidate.declaredMime.trim().toLowerCase() !== detectedMime) throw storageBoundaryError();
    const isImage = IMAGE_INPUT_MIMES.has(detectedMime);
    if ((policy.kind === "IMAGE" && !isImage) || (policy.kind === "PDF" && detectedMime !== "application/pdf")) {
      throw storageBoundaryError();
    }
    const originalName = normalizeDisplayName(candidate.originalName, detectedMime);
    let outputBytes: Buffer;
    let width: number | null = null;
    let height: number | null = null;
    let mimeType: "image/webp" | "application/pdf";
    let extension: "webp" | "pdf";
    if (isImage) {
      const output = await transformImage(input);
      outputBytes = output.bytes;
      width = output.width;
      height = output.height;
      mimeType = "image/webp";
      extension = "webp";
    } else {
      validatePdf(input);
      outputBytes = input;
      mimeType = "application/pdf";
      extension = "pdf";
    }
    return ValidatedUploadSchema.parse({
      storageClass: policy.storageClass,
      storageKey: createStorageKey(extension, candidate.now ?? new Date()),
      originalName,
      mimeType,
      size: outputBytes.byteLength,
      checksumSha256: createHash("sha256").update(outputBytes).digest("hex"),
      width,
      height,
      bytes: new Uint8Array(outputBytes),
    });
  } catch {
    throw storageBoundaryError();
  }
}
