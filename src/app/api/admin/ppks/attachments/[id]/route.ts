import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";

import {z} from "zod";

import {PpksAttachmentCryptoMetadataSchema} from "@/contracts/storage";
import {authorize} from "@/lib/auth/runtime/authorization";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {decryptPpksAttachment, parseStorageRoots} from "@/lib/storage";
import {resolveStoragePath} from "@/lib/storage/paths";
import {createPpksKeyResolver} from "@/lib/tickets/ppks-encryption";

const AttachmentIdSchema = z.string().trim().min(1).max(191);

function notFound() {
  return new Response(null, {
    status: 404,
    headers: {"Cache-Control": "no-store"},
  });
}

function attachmentHeaders(mimeType: string, originalName: string) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": mimeType,
    "Content-Disposition": `attachment; filename="${originalName}"`,
  };
}

function storageRoots() {
  return parseStorageRoots({
    PUBLIC: process.env.UPLOAD_DIR ?? "",
    PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
    PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
  });
}

async function auditDeniedDownload(attachmentId: string, userId: string) {
  const prisma = getPrismaClient();
  await prisma.$executeRaw`
    INSERT INTO "TicketAccessLog"
      ("id", "ticketId", "userId", "action", "allowed", "reasonCode", "createdAt")
    SELECT
      ${randomUUID()},
      "Ticket"."id",
      ${userId},
      'ATTACHMENT_DOWNLOAD'::"TicketAccessAction",
      false,
      'ACCESS_DENIED',
      CURRENT_TIMESTAMP
    FROM "TicketAttachment"
    INNER JOIN "Ticket" ON "Ticket"."id" = "TicketAttachment"."ticketId"
    WHERE "TicketAttachment"."id" = ${attachmentId}
      AND "Ticket"."category" = 'PELECEHAN_SEKSUAL'::"ComplaintCategory"
  `;
}

export async function GET(
  _request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const parsedId = AttachmentIdSchema.safeParse((await params).id);
  if (!parsedId.success) return notFound();

  const session = await getRequestSession();
  if (!session.ok) return notFound();
  const decision = authorize(
    {actor: session.session, ticketScope: "PPKS_DETAIL"},
    "DOWNLOAD",
    "PPKS_TICKET",
  );
  if (!decision.allowed) {
    await auditDeniedDownload(parsedId.data, session.session.userId).catch(() => undefined);
    return notFound();
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.$transaction(async (tx) => {
      const attachment = await tx.ticketAttachment.findFirst({
        where: {
          id: parsedId.data,
          storageClass: "PPKS_PRIVATE",
          ticket: {category: "PELECEHAN_SEKSUAL"},
        },
        select: {
          id: true,
          ticketId: true,
          storageKey: true,
          storageClass: true,
          originalName: true,
          mimeType: true,
          size: true,
          checksumSha256: true,
          encryptionNonce: true,
          encryptionTag: true,
          keyVersion: true,
        },
      });
      if (!attachment) return null;
      await tx.ticketAccessLog.create({
        data: {
          ticketId: attachment.ticketId,
          userId: session.session.userId,
          action: "ATTACHMENT_DOWNLOAD",
          allowed: true,
        },
      });
      return attachment;
    });
    if (!row || !row.encryptionNonce || !row.encryptionTag || !row.keyVersion) return notFound();

    const metadata = PpksAttachmentCryptoMetadataSchema.parse({
      storageKey: row.storageKey,
      storageClass: row.storageClass,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      checksumSha256: row.checksumSha256,
      encryptionNonce: row.encryptionNonce,
      encryptionTag: row.encryptionTag,
      keyVersion: row.keyVersion,
    });
    const ciphertext = await readFile(resolveStoragePath(storageRoots().PPKS_PRIVATE, metadata.storageKey));
    const plaintext = decryptPpksAttachment({
      ciphertext,
      metadata,
      ticketId: row.ticketId,
      attachmentId: row.id,
      resolveKey: createPpksKeyResolver(),
    });
    return new Response(new Uint8Array(plaintext), {
      status: 200,
      headers: attachmentHeaders(metadata.mimeType, metadata.originalName),
    });
  } catch {
    return notFound();
  }
}
