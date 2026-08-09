import type {Prisma} from "@/generated/prisma/client";
import {
  NotificationOutboxInputSchema,
  type NotificationOutboxInput,
} from "@/contracts/platform";

const SENSITIVE_PAYLOAD_KEY =
  /(password|token|secret|ciphertext|nonce|encryptiontag|reporter|identity|ppks|attachment|storagekey)/i;

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => SENSITIVE_PAYLOAD_KEY.test(key) || containsSensitiveKey(child),
  );
}

function preparePublicPayload(payload: Record<string, unknown>) {
  let normalized: Record<string, unknown>;
  try {
    const encoded = JSON.stringify(payload);
    if (Buffer.byteLength(encoded, "utf8") > 65_536) {
      throw new Error("Outbox payload exceeds 64 KiB.");
    }
    normalized = JSON.parse(encoded) as Record<string, unknown>;
  } catch (error) {
    throw new Error("Outbox payload must be JSON serializable.", {cause: error});
  }

  if (containsSensitiveKey(normalized)) {
    throw new Error("Sensitive outbox data must use an encrypted payload.");
  }
  return normalized as Prisma.InputJsonValue;
}

export function prepareOutboxMessage(input: NotificationOutboxInput) {
  const parsed = NotificationOutboxInputSchema.parse(input);
  const base = {
    type: parsed.type,
    recipient: parsed.recipient,
    locale: parsed.locale,
    template: parsed.template,
    idempotencyKey: parsed.idempotencyKey,
    nextAttemptAt: parsed.nextAttemptAt ?? new Date(),
  };

  if (parsed.sensitive) {
    return {
      ...base,
      payload: undefined,
      payloadEncrypted: true,
      payloadCiphertext: parsed.encryptedPayload.ciphertext,
      encryptionNonce: parsed.encryptedPayload.nonce,
      encryptionTag: parsed.encryptedPayload.tag,
      keyVersion: parsed.encryptedPayload.keyVersion,
    };
  }

  return {
    ...base,
    payload: preparePublicPayload(parsed.payload),
    payloadEncrypted: false,
    payloadCiphertext: null,
    encryptionNonce: null,
    encryptionTag: null,
    keyVersion: null,
  };
}

export async function enqueueNotification(
  tx: Prisma.TransactionClient,
  input: NotificationOutboxInput,
) {
  return tx.notificationOutbox.create({data: prepareOutboxMessage(input)});
}
