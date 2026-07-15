import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import type {z} from "zod";

import {
  AesGcmEnvelopeSchema,
  ProtectedDataContextSchema,
  type AesGcmEnvelope,
  type ProtectedDataContext,
} from "@/contracts/security";

const AES_256_KEY_BYTES = 32;
const AES_GCM_NONCE_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const DEFAULT_MAX_PLAINTEXT_BYTES = 1_048_576;
const PROTECTED_DATA_ERROR_MESSAGE = "Unable to process protected data.";

export class ProtectedDataError extends Error {
  constructor() {
    super(PROTECTED_DATA_ERROR_MESSAGE);
    this.name = "ProtectedDataError";
  }
}

export type EncryptionKeyResolver = (keyVersion: number) => Uint8Array | undefined;

type EncryptionOptions = {
  key: Uint8Array;
  keyVersion: number;
  maxPlaintextBytes?: number;
};

type DecryptionOptions = {
  resolveKey: EncryptionKeyResolver;
  maxPlaintextBytes?: number;
};

function protectedDataError(): ProtectedDataError {
  return new ProtectedDataError();
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? DEFAULT_MAX_PLAINTEXT_BYTES;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > DEFAULT_MAX_PLAINTEXT_BYTES) {
    throw protectedDataError();
  }
  return limit;
}

function normalizeKey(key: Uint8Array): Buffer {
  const copy = Buffer.from(key);
  if (copy.byteLength !== AES_256_KEY_BYTES) {
    throw protectedDataError();
  }
  return copy;
}

function serializeContext(context: ProtectedDataContext): Buffer {
  const parsed = ProtectedDataContextSchema.safeParse(context);
  if (!parsed.success) {
    throw protectedDataError();
  }

  const {purpose, resourceId, field} = parsed.data;
  return Buffer.from(
    `fuspi:aes-256-gcm:v1\0${purpose}\0${resourceId}\0${field}`,
    "utf8",
  );
}

function assertPlaintextSize(plaintext: Buffer, limit: number): void {
  if (plaintext.byteLength < 1 || plaintext.byteLength > limit) {
    throw protectedDataError();
  }
}

export function encryptProtectedData(
  plaintext: string | Uint8Array,
  context: ProtectedDataContext,
  options: EncryptionOptions,
): AesGcmEnvelope {
  try {
    if (!Number.isSafeInteger(options.keyVersion) || options.keyVersion < 1) {
      throw protectedDataError();
    }

    const key = normalizeKey(options.key);
    const limit = normalizeLimit(options.maxPlaintextBytes);
    const plaintextBytes = typeof plaintext === "string"
      ? Buffer.from(plaintext, "utf8")
      : Buffer.from(plaintext);
    assertPlaintextSize(plaintextBytes, limit);

    const nonce = randomBytes(AES_GCM_NONCE_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, nonce, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    cipher.setAAD(serializeContext(context));
    const ciphertext = Buffer.concat([cipher.update(plaintextBytes), cipher.final()]);

    return AesGcmEnvelopeSchema.parse({
      ciphertext: ciphertext.toString("base64url"),
      nonce: nonce.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      keyVersion: options.keyVersion,
    });
  } catch {
    throw protectedDataError();
  }
}

export function decryptProtectedData(
  envelope: AesGcmEnvelope,
  context: ProtectedDataContext,
  options: DecryptionOptions,
): Buffer {
  try {
    const parsedEnvelope = AesGcmEnvelopeSchema.parse(envelope);
    const key = options.resolveKey(parsedEnvelope.keyVersion);
    if (!key) {
      throw protectedDataError();
    }

    const normalizedKey = normalizeKey(key);
    const limit = normalizeLimit(options.maxPlaintextBytes);
    const ciphertext = Buffer.from(parsedEnvelope.ciphertext, "base64url");
    if (ciphertext.byteLength < 1 || ciphertext.byteLength > limit) {
      throw protectedDataError();
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      normalizedKey,
      Buffer.from(parsedEnvelope.nonce, "base64url"),
      {authTagLength: AES_GCM_TAG_BYTES},
    );
    decipher.setAAD(serializeContext(context));
    decipher.setAuthTag(Buffer.from(parsedEnvelope.tag, "base64url"));
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    assertPlaintextSize(plaintext, limit);
    return plaintext;
  } catch {
    throw protectedDataError();
  }
}

export function encryptProtectedJson(
  value: unknown,
  context: ProtectedDataContext,
  options: EncryptionOptions,
): AesGcmEnvelope {
  try {
    return encryptProtectedData(JSON.stringify(value), context, options);
  } catch {
    throw protectedDataError();
  }
}

export function decryptProtectedJson<T>(
  envelope: AesGcmEnvelope,
  context: ProtectedDataContext,
  schema: z.ZodType<T>,
  options: DecryptionOptions,
): T {
  try {
    const plaintext = decryptProtectedData(envelope, context, options).toString("utf8");
    return schema.parse(JSON.parse(plaintext));
  } catch {
    throw protectedDataError();
  }
}
