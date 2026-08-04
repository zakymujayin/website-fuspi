"use server";

import {revalidatePath} from "next/cache";

import type {PublicContentMutationResult} from "@/contracts/public-content";
import {executePublicContentCommand} from "@/features/public-content/administration";
import {listPublicContentAdmin} from "@/features/public-content/admin-query";
import {getPublicContentAdminDetail} from "@/features/public-content/admin-detail";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

export type PublicContentMutationActionResult = PublicContentMutationResult;

export type PublicContentAdminListActionResult = Awaited<ReturnType<typeof listPublicContentAdmin>>;
export type PublicContentAdminDetailActionResult = Awaited<ReturnType<typeof getPublicContentAdminDetail>>;

export async function executePublicContentAdminCommand(
  rawCommand: unknown,
): Promise<PublicContentMutationResult> {
  const session = await getRequestSession();
  const prisma = getPrismaClient();

  const result = await executePublicContentCommand(
    prisma,
    session.ok ? session.session : null,
    rawCommand,
  );

  if (result.ok) {
    const resource = result.resource as string;
    const slugNames: Record<string, string> = {
      SERVICE: "layanan",
      PARTNERSHIP: "kerjasama",
      SCHOLARSHIP: "beasiswa",
      ACHIEVEMENT: "prestasi",
      STUDENT_ACTIVITY: "kegiatan",
      DOCUMENT: "dokumen",
      ALBUM: "album",
      EVENT: "agenda",
      FAQ: "faq",
      TESTIMONIAL: "testimoni",
    };
    const adminPath = slugNames[resource] ?? resource.toLowerCase();
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/${adminPath}`);
      revalidatePath(`/${locale}/admin/${adminPath}/[id]/edit`, "page");
      revalidatePath(`/${locale}/${adminPath}`);
      revalidatePath(`/${locale}/${adminPath}/[slug]`, "page");
    }
  }

  return result;
}

export async function listPublicContentAdminAction(
  rawQuery: unknown,
): Promise<PublicContentAdminListActionResult> {
  const session = await getRequestSession();
  const prisma = getPrismaClient();

  const result = await listPublicContentAdmin(
    prisma,
    session.ok ? session.session : null,
    rawQuery,
  );

  return result;
}

export async function getPublicContentAdminDetailAction(
  rawQuery: unknown,
): Promise<PublicContentAdminDetailActionResult> {
  const session = await getRequestSession();
  const prisma = getPrismaClient();

  return getPublicContentAdminDetail(
    prisma,
    session.ok ? session.session : null,
    rawQuery,
  );
}
