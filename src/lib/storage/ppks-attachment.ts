import {createCipheriv, createDecipheriv, createHash, randomBytes} from "node:crypto";
import {z} from "zod";

import {
  PpksAttachmentCryptoMetadataSchema,
  ValidatedPpksAttachmentSchema,
  type PpksAttachmentCryptoMetadata,
  type ValidatedPpksAttachment,
} from "@/contracts/storage";
import {ProtectedDataContextSchema} from "@/contracts/security";
import type {EncryptionKeyResolver} from "@/lib/security/encryption";
import {ppksAttachmentError} from "@/lib/storage/error";
import {stageVerifiedBytes, type StagedUpload} from "@/lib/storage/staged-file";
import type {StorageRoots} from "@/lib/storage/paths";

const AES_KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const MAX_ATTACHMENT_BYTES = 5_242_880;
const IdentifierSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export type StagedPpksAttachment = {
  readonly metadata: Readonly<PpksAttachmentCryptoMetadata>;
  commit(): Promise<void>;
  discard(): Promise<void>;
};

function normalizeKey(key: Uint8Array): Buffer {
  const normalized = Buffer.from(key);
  if (normalized.byteLength !== AES_KEY_BYTES) throw ppksAttachmentError();
  return normalized;
}

function createAttachmentAad(ticketId: string, attachmentId: string): Buffer {
  const normalizedTicketId = IdentifierSchema.parse(ticketId);
  const normalizedAttachmentId = IdentifierSchema.parse(attachmentId);
  const context = ProtectedDataContextSchema.parse({
    purpose: "PPKS_ATTACHMENT",
    resourceId: normalizedTicketId,
    field: `attachment:${normalizedAttachmentId}`,
  });
  return Buffer.from(
    `fuspi:aes-256-gcm:v1\0${context.purpose}\0${context.resourceId}\0${context.field}`,
    "utf8",
  );
}

function verifyPlaintextChecksum(bytes: Uint8Array, expected: string): void {
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    throw ppksAttachmentError();
  }
}

export async function encryptAndStagePpksAttachment(options: {
  attachment: ValidatedPpksAttachment;
  ticketId: string;
  attachmentId: string;
  key: Uint8Array;
  keyVersion: number;
  roots: StorageRoots;
}): Promise<StagedPpksAttachment> {
  let staged: StagedUpload | undefined;
  try {
    const attachment = ValidatedPpksAttachmentSchema.parse(options.attachment);
    if (!Number.isSafeInteger(options.keyVersion) || options.keyVersion < 1) {
      throw ppksAttachmentError();
    }
    verifyPlaintextChecksum(attachment.bytes, attachment.checksumSha256);
    const key = normalizeKey(options.key);
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, nonce, {authTagLength: TAG_BYTES});
    cipher.setAAD(createAttachmentAad(options.ticketId, options.attachmentId));
    const ciphertext = Buffer.concat([
      cipher.update(attachment.bytes),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const ciphertextChecksum = createHash("sha256").update(ciphertext).digest("hex");
    staged = await stageVerifiedBytes({
      storageClass: "PPKS_PRIVATE",
      storageKey: attachment.storageKey,
      size: ciphertext.byteLength,
      checksumSha256: ciphertextChecksum,
      bytes: new Uint8Array(ciphertext),
    }, options.roots);
    const stagedFile = staged;
    const metadata = Object.freeze(PpksAttachmentCryptoMetadataSchema.parse({
      storageKey: attachment.storageKey,
      storageClass: "PPKS_PRIVATE",
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      checksumSha256: attachment.checksumSha256,
      encryptionNonce: nonce.toString("base64url"),
      encryptionTag: tag.toString("base64url"),
      keyVersion: options.keyVersion,
    }));
    return {
      metadata,
      async commit() {
        try {
          await stagedFile.commit();
        } catch {
          throw ppksAttachmentError();
        }
      },
      async discard() {
        try {
          await stagedFile.discard();
        } catch {
          throw ppksAttachmentError();
        }
      },
    };
  } catch {
    if (staged) await staged.discard().catch(() => undefined);
    throw ppksAttachmentError();
  }
}

export function decryptPpksAttachment(options: {
  ciphertext: Uint8Array;
  metadata: PpksAttachmentCryptoMetadata;
  ticketId: string;
  attachmentId: string;
  resolveKey: EncryptionKeyResolver;
}): Buffer {
  try {
    const metadata = PpksAttachmentCryptoMetadataSchema.parse(options.metadata);
    const ciphertext = Buffer.from(options.ciphertext);
    if (
      ciphertext.byteLength < 1
      || ciphertext.byteLength > MAX_ATTACHMENT_BYTES
      || ciphertext.byteLength !== metadata.size
    ) throw ppksAttachmentError();
    const resolvedKey = options.resolveKey(metadata.keyVersion);
    if (!resolvedKey) throw ppksAttachmentError();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      normalizeKey(resolvedKey),
      Buffer.from(metadata.encryptionNonce, "base64url"),
      {authTagLength: TAG_BYTES},
    );
    decipher.setAAD(createAttachmentAad(options.ticketId, options.attachmentId));
    decipher.setAuthTag(Buffer.from(metadata.encryptionTag, "base64url"));
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    verifyPlaintextChecksum(plaintext, metadata.checksumSha256);
    return plaintext;
  } catch {
    throw ppksAttachmentError();
  }
}
