import {readFile} from "node:fs/promises";

import {z} from "zod";

import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots} from "@/lib/storage";
import {resolveStoragePath} from "@/lib/storage/paths";

const BookingIdSchema = z.string().trim().min(1).max(191);

function notFound() {
  return new Response(null, {
    status: 404,
    headers: {"Cache-Control": "no-store"},
  });
}

function storageRoots() {
  return parseStorageRoots({
    PUBLIC: process.env.UPLOAD_DIR ?? "",
    PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
    PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
  });
}

export async function GET(
  _request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const parsedId = BookingIdSchema.safeParse((await params).id);
  if (!parsedId.success) return notFound();

  const session = await getRequestSession();
  if (!session.ok || !["ADMIN", "PETUGAS"].includes(session.session.role)) return notFound();

  try {
    const prisma = getPrismaClient();
    const booking = await prisma.booking.findUnique({
      where: {id: parsedId.data},
      select: {id: true, applicationStorageKey: true},
    });
    if (!booking?.applicationStorageKey) return notFound();

    await prisma.activityLog.create({
      data: {
        actorId: session.session.userId,
        action: "VIEW_SENSITIVE",
        resourceType: "Booking",
        resourceId: booking.id,
        metadata: {attachment: "APPLICATION_LETTER"},
      },
    });

    const bytes = await readFile(resolveStoragePath(storageRoots().PRIVATE, booking.applicationStorageKey));
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="surat-peminjaman.pdf"',
      },
    });
  } catch {
    return notFound();
  }
}
