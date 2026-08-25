"use server";

import { revalidatePath } from "next/cache";

import type { HomeNavMutationResult } from "@/contracts/home-nav";
import { executeHomeNavCommand } from "@/features/home-nav/administration";
import { getRequestSession } from "@/lib/auth/runtime/request-session";
import { getPrismaClient } from "@/lib/db/client";

export async function executeHomeNavAdminCommand(rawCommand: unknown): Promise<HomeNavMutationResult> {
  const session = await getRequestSession();
  const prisma = getPrismaClient();

  const result = await executeHomeNavCommand(prisma, session.ok ? session.session : null, rawCommand);

  if (result.ok) {
    const paths: Record<string, string> = {
      HOME_SLIDER: "slider", STATISTIC: "statistik", HOME_SECTION: "bagian", SITE_SETTING: "pengaturan",
      HOME_VIDEO: "video",
    };
    const segment = paths[result.resource] ?? result.resource.toLowerCase();
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/beranda/${segment}`);
      revalidatePath(`/${locale}`);
    }
  }

  return result;
}
