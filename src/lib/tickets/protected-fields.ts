import {createHash} from "node:crypto";

import {z} from "zod";

import {PpksStoredFieldEnvelopeJsonSchema} from "@/contracts/ticket";
import {
  decryptProtectedData,
  encryptProtectedData,
  type EncryptionKeyResolver,
} from "@/lib/security/encryption";

const ProtectedTicketFieldSchema = z.enum([
  "subject",
  "description",
  "reporterIdentity",
  "resolution",
]);

type ProtectedTicketField = z.infer<typeof ProtectedTicketFieldSchema>;

function ppksReplyContextId(ticketId: string, replyId: string) {
  return createHash("sha256")
    .update("FUSPI:PPKS_REPLY\0", "utf8")
    .update(ticketId, "utf8")
    .update("\0", "utf8")
    .update(replyId, "utf8")
    .digest("hex");
}

export function sealPpksTicketField(
  plaintext: string,
  ticketId: string,
  field: ProtectedTicketField,
  options: Readonly<{
    key: Uint8Array;
    keyVersion: number;
  }>,
) {
  const parsedField = ProtectedTicketFieldSchema.parse(field);
  const envelope = encryptProtectedData(
    plaintext,
    {
      purpose: "PPKS_TICKET",
      resourceId: ticketId,
      field: parsedField,
    },
    options,
  );
  return JSON.stringify(envelope);
}

export function openPpksTicketField(
  storedEnvelope: string,
  ticketId: string,
  field: ProtectedTicketField,
  resolveKey: EncryptionKeyResolver,
) {
  const parsedField = ProtectedTicketFieldSchema.parse(field);
  const envelope = PpksStoredFieldEnvelopeJsonSchema.parse(storedEnvelope);
  return decryptProtectedData(
    envelope,
    {
      purpose: "PPKS_TICKET",
      resourceId: ticketId,
      field: parsedField,
    },
    {resolveKey},
  ).toString("utf8");
}

export function sealPpksReplyBody(
  plaintext: string,
  ticketId: string,
  replyId: string,
  options: Readonly<{
    key: Uint8Array;
    keyVersion: number;
  }>,
) {
  const envelope = encryptProtectedData(
    plaintext,
    {
      purpose: "PPKS_REPLY",
      resourceId: ppksReplyContextId(ticketId, replyId),
      field: "body",
    },
    options,
  );
  return JSON.stringify(envelope);
}

export function openPpksReplyBody(
  storedEnvelope: string,
  ticketId: string,
  replyId: string,
  resolveKey: EncryptionKeyResolver,
) {
  const envelope = PpksStoredFieldEnvelopeJsonSchema.parse(storedEnvelope);
  return decryptProtectedData(
    envelope,
    {
      purpose: "PPKS_REPLY",
      resourceId: ppksReplyContextId(ticketId, replyId),
      field: "body",
    },
    {resolveKey},
  ).toString("utf8");
}
