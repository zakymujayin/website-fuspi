"use server";

import {revalidatePath} from "next/cache";

import type {FacilityMutationResult} from "@/contracts/facility";
import {executeFacilityCommand} from "@/features/facility/domain";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

export async function executeFacilityAdminCommand(rawCommand: unknown): Promise<FacilityMutationResult> {
  const session = await getRequestSession();
  const result = await executeFacilityCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    rawCommand,
  );

  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/profil/fasilitas`);
      revalidatePath(`/${locale}/admin/fasilitas`);
    }
  }

  return result;
}
