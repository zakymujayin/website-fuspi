"use server";

import {revalidatePath} from "next/cache";

import type {TaxonomyMutationResult} from "@/contracts/admin-foundation";
import {executeTaxonomyCommand} from "@/features/admin/foundation";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

export async function executeTaxonomyAdminCommand(rawCommand: unknown): Promise<TaxonomyMutationResult> {
  const session = await getRequestSession();
  const result = await executeTaxonomyCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    rawCommand,
  );

  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/taksonomi`);
      revalidatePath(`/${locale}/admin/posts`);
      revalidatePath(`/${locale}/berita`);
    }
  }

  return result;
}
