import {actorOrNull, mediaView, type PublicContentDatabase} from "@/features/public-content/shared";

export type HomeNavListResource = "HOME_SLIDER" | "STATISTIC" | "HOME_SECTION" | "HOME_VIDEO";

export type HomeNavAdminRow = {
  id: string;
  primaryText: string;
  secondaryText: string | null;
  order: number;
  isVisible: boolean;
  thumbnailUrl: string | null;
};

export type HomeNavAdminListResult =
  | {ok: true; items: HomeNavAdminRow[]}
  | {ok: false; code: "SESSION_INVALID" | "UNAVAILABLE"};

export async function listHomeNavAdmin(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  resource: HomeNavListResource,
  now = new Date(),
): Promise<HomeNavAdminListResult> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};

  try {
    if (resource === "HOME_SLIDER") {
      const rows = await prisma.homeSlider.findMany({
        orderBy: [{order: "asc"}, {id: "asc"}],
        include: {translations: true, imageMedia: true},
      });
      return {ok: true, items: rows.map((row) => {
        const idTranslation = row.translations.find((t) => t.locale === "id");
        return {
          id: row.id,
          primaryText: idTranslation?.title ?? "(tanpa judul)",
          secondaryText: idTranslation?.subtitle ?? null,
          order: row.order,
          isVisible: row.isVisible,
          thumbnailUrl: mediaView(row.imageMedia)?.url ?? null,
        };
      })};
    }
    if (resource === "STATISTIC") {
      const rows = await prisma.statistic.findMany({
        orderBy: [{order: "asc"}, {id: "asc"}],
        include: {translations: true},
      });
      return {ok: true, items: rows.map((row) => {
        const idTranslation = row.translations.find((t) => t.locale === "id");
        return {
          id: row.id,
          primaryText: `${row.value}${row.suffix ?? ""} — ${idTranslation?.label ?? "(tanpa label)"}`,
          secondaryText: null,
          order: row.order,
          isVisible: row.isVisible,
          thumbnailUrl: null,
        };
      })};
    }
    if (resource === "HOME_SECTION") {
      const rows = await prisma.homeSection.findMany({
        orderBy: [{order: "asc"}, {id: "asc"}],
        include: {translations: true},
      });
      return {ok: true, items: rows.map((row) => {
        const idTranslation = row.translations.find((t) => t.locale === "id");
        return {
          id: row.id,
          primaryText: `${row.key} — ${idTranslation?.title ?? "(tanpa judul)"}`,
          secondaryText: idTranslation?.subtitle ?? null,
          order: row.order,
          isVisible: row.isVisible,
          thumbnailUrl: null,
        };
      })};
    }
    const rows = await prisma.homeVideo.findMany({
      orderBy: [{order: "asc"}, {id: "asc"}],
      include: {translations: true},
    });
    return {ok: true, items: rows.map((row) => {
      const idTranslation = row.translations.find((t) => t.locale === "id");
      return {
        id: row.id,
        primaryText: idTranslation?.title ?? "(tanpa judul)",
        secondaryText: row.youtubeUrl,
        order: row.order,
        isVisible: row.isVisible,
        thumbnailUrl: null,
      };
    })};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
