import {
  MEDIA_SELECT,
  mediaView,
  resolve,
  safeDate,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

export type PublicHomeAchievement = {
  id: string;
  slug: string;
  studentName: string;
  title: string;
  level: string;
  achievedAt: string | null;
  media: NonNullable<ReturnType<typeof mediaView>> | null;
};

/**
 * Bespoke query (same reasoning as `listPublicHomeFacilities`): the shared
 * `PublicContentCardSchema` used by the generic public-content list is
 * deliberately resource-agnostic and has no `studentName` field. The
 * homepage widget needs the student's name as real text, not baked into the
 * award image, so it reads straight from Prisma instead of going through
 * the generic contract.
 */
export async function listPublicHomeAchievements(
  prisma: PublicContentDatabase,
  locale: Locale,
  limit: number,
  uploadBase = "/uploads",
): Promise<PublicHomeAchievement[]> {
  const safeLimit = Math.max(0, Math.min(limit, 12));
  if (safeLimit === 0) return [];

  const rows = await prisma.achievement.findMany({
    take: safeLimit,
    orderBy: [{ achievedAt: "desc" }, { id: "asc" }],
    include: {
      translations: { where: { status: "PUBLISHED" } },
      imageMedia: { select: MEDIA_SELECT },
    },
  });

  return rows.flatMap((row) => {
    const text = resolve(row.translations, locale);
    if (!text) return [];
    return [{
      id: row.id,
      slug: row.slug,
      studentName: row.studentName,
      title: text.title,
      level: row.level,
      achievedAt: safeDate(row.achievedAt),
      media: mediaView(row.imageMedia, uploadBase),
    }];
  });
}
