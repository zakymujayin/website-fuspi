import {z} from "zod";

import {AesGcmEnvelopeSchema} from "@/contracts/security";
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
  const envelope = AesGcmEnvelopeSchema.parse(JSON.parse(storedEnvelope));
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
      resourceId: replyId,
      field: "body",
    },
    options,
  );
  return JSON.stringify(envelope);
}

export function openPpksReplyBody(
  storedEnvelope: string,
  replyId: string,
  resolveKey: EncryptionKeyResolver,
) {
  const envelope = AesGcmEnvelopeSchema.parse(JSON.parse(storedEnvelope));
  return decryptProtectedData(
    envelope,
    {
      purpose: "PPKS_REPLY",
      resourceId: replyId,
      field: "body",
    },
    {resolveKey},
  ).toString("utf8");
}
