import {z} from "zod";

import {
  HomeNavAdminCommandSchema,
  HomeSectionInputSchema,
  HomeSliderInputSchema,
  HomeVideoInputSchema,
  SiteSettingInputSchema,
  StatisticInputSchema,
  type HomeNavAdminCommand,
  type HomeNavMutationResult,
} from "@/contracts/home-nav";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";

import {
  MEDIA_SELECT,
  actorOrNull,
  isPrismaCode,
  mediaView,
  sanitizeLocalized,
  translationState,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

type HomeSliderInput = z.infer<typeof HomeSliderInputSchema>;
type HomeSectionInput = z.infer<typeof HomeSectionInputSchema>;
type StatisticInput = z.infer<typeof StatisticInputSchema>;
type SiteSettingInput = z.infer<typeof SiteSettingInputSchema>;
type HomeVideoInput = z.infer<typeof HomeVideoInputSchema>;

type SanitizableResource = "HOME_SLIDER" | "HOME_SECTION" | "STATISTIC" | "SITE_SETTING" | "HOME_VIDEO";

const RICH_FIELDS: Record<SanitizableResource, string[]> = {
  HOME_SLIDER: [], HOME_SECTION: [], STATISTIC: [], SITE_SETTING: ["deanMessage", "videoDesc"], HOME_VIDEO: [],
};

const SCHEMA_BY_RESOURCE = {
  HOME_SLIDER: HomeSliderInputSchema, HOME_SECTION: HomeSectionInputSchema,
  STATISTIC: StatisticInputSchema, SITE_SETTING: SiteSettingInputSchema,
  HOME_VIDEO: HomeVideoInputSchema,
} as const satisfies Record<SanitizableResource, z.ZodType>;

function sanitizePayload(resource: SanitizableResource, payload: unknown) {
  const schema = SCHEMA_BY_RESOURCE[resource];
  const input = schema.parse(payload) as {translations: Record<string, Record<string, unknown>>};
  return schema.parse({...input, translations: sanitizeLocalized(input.translations, RICH_FIELDS[resource])});
}

function translationRows<R>(
  input: {translations: Record<string, Record<string, unknown>>},
  publish: boolean,
  actorId: string,
  now: Date,
  version = 1,
) {
  return Object.entries(input.translations).map(([locale, value]) => ({
    locale: locale as Locale, ...value, ...translationState(locale as Locale, publish, actorId, now, version),
  })) as unknown as R[];
}

async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: "CREATE" | "UPDATE",
  resourceType: string,
  resourceId: string,
  operation?: string,
) {
  await tx.activityLog.create({data: {
    actorId, action, resourceType, resourceId,
    ...(operation ? {metadata: {operation}} : {}),
  }});
}

async function validImage(tx: Prisma.TransactionClient, id: string | null) {
  if (id === null) return true;
  const row = await tx.media.findUnique({where: {id}, select: MEDIA_SELECT});
  return mediaView(row) !== null;
}

async function mutateHomeSlider(
  tx: Prisma.TransactionClient,
  action: "CREATE" | "UPDATE",
  input: HomeSliderInput,
  mutation: {id: string} | null,
  actorId: string,
  now: Date,
): Promise<HomeNavMutationResult> {
  if (!await validImage(tx, input.imageMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  const data = {
    imageMediaId: input.imageMediaId, ctaUrl: input.cta?.href ?? null,
    order: input.order, isVisible: input.isVisible,
  };
  let id: string;
  if (action === "CREATE") {
    id = (await tx.homeSlider.create({data: {
      ...data,
      translations: {create: translationRows<Prisma.HomeSliderTranslationCreateWithoutHomeSliderInput>(input, input.isVisible, actorId, now)},
    }})).id;
  } else {
    if (!mutation || !await tx.homeSlider.findUnique({where: {id: mutation.id}, select: {id: true}})) {
      return {ok: false, code: "NOT_FOUND"};
    }
    id = mutation.id;
    await tx.homeSlider.update({where: {id}, data: {
      ...data,
      translations: {deleteMany: {}, create: translationRows<Prisma.HomeSliderTranslationCreateWithoutHomeSliderInput>(input, input.isVisible, actorId, now)},
    }});
  }
  await audit(tx, actorId, action, "HomeSlider", id);
  return {ok: true, id, resource: "HOME_SLIDER", version: null};
}

async function mutateStatistic(
  tx: Prisma.TransactionClient,
  action: "CREATE" | "UPDATE",
  input: StatisticInput,
  mutation: {id: string} | null,
  actorId: string,
  now: Date,
): Promise<HomeNavMutationResult> {
  const data = {value: input.value, suffix: input.suffix, icon: input.icon, order: input.order, isVisible: input.isVisible};
  let id: string;
  if (action === "CREATE") {
    id = (await tx.statistic.create({data: {
      ...data,
      translations: {create: translationRows<Prisma.StatisticTranslationCreateWithoutStatisticInput>(input, input.isVisible, actorId, now)},
    }})).id;
  } else {
    if (!mutation || !await tx.statistic.findUnique({where: {id: mutation.id}, select: {id: true}})) {
      return {ok: false, code: "NOT_FOUND"};
    }
    id = mutation.id;
    await tx.statistic.update({where: {id}, data: {
      ...data,
      translations: {deleteMany: {}, create: translationRows<Prisma.StatisticTranslationCreateWithoutStatisticInput>(input, input.isVisible, actorId, now)},
    }});
  }
  await audit(tx, actorId, action, "Statistic", id);
  return {ok: true, id, resource: "STATISTIC", version: null};
}

async function mutateHomeVideo(
  tx: Prisma.TransactionClient,
  action: "CREATE" | "UPDATE",
  input: HomeVideoInput,
  mutation: {id: string} | null,
  actorId: string,
  now: Date,
): Promise<HomeNavMutationResult> {
  const data = {youtubeUrl: input.youtubeUrl, order: input.order, isVisible: input.isVisible};
  let id: string;
  if (action === "CREATE") {
    id = (await tx.homeVideo.create({data: {
      ...data,
      translations: {create: translationRows<Prisma.HomeVideoTranslationCreateWithoutHomeVideoInput>(input, input.isVisible, actorId, now)},
    }})).id;
  } else {
    if (!mutation || !await tx.homeVideo.findUnique({where: {id: mutation.id}, select: {id: true}})) {
      return {ok: false, code: "NOT_FOUND"};
    }
    id = mutation.id;
    await tx.homeVideo.update({where: {id}, data: {
      ...data,
      translations: {deleteMany: {}, create: translationRows<Prisma.HomeVideoTranslationCreateWithoutHomeVideoInput>(input, input.isVisible, actorId, now)},
    }});
  }
  await audit(tx, actorId, action, "HomeVideo", id);
  return {ok: true, id, resource: "HOME_VIDEO", version: null};
}

async function mutateHomeSection(
  tx: Prisma.TransactionClient,
  input: HomeSectionInput,
  mutation: {id: string} | null,
  actorId: string,
  now: Date,
): Promise<HomeNavMutationResult> {
  if (!mutation) return {ok: false, code: "VALIDATION_FAILED"};
  const existing = await tx.homeSection.findUnique({where: {id: mutation.id}, select: {id: true, key: true}});
  if (!existing) return {ok: false, code: "NOT_FOUND"};
  if (existing.key !== input.key) return {ok: false, code: "VALIDATION_FAILED"};
  if (!await validImage(tx, input.backgroundMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  await tx.homeSection.update({where: {id: existing.id}, data: {
    isVisible: input.isVisible, order: input.order, itemLimit: input.itemLimit,
    ctaUrl: input.cta?.href ?? null, backgroundMediaId: input.backgroundMediaId,
    translations: {deleteMany: {}, create: translationRows<Prisma.HomeSectionTranslationCreateWithoutHomeSectionInput>(input, input.isVisible, actorId, now)},
  }});
  await audit(tx, actorId, "UPDATE", "HomeSection", existing.id);
  return {ok: true, id: existing.id, resource: "HOME_SECTION", version: null};
}

async function mutateSiteSetting(
  tx: Prisma.TransactionClient,
  input: SiteSettingInput,
  mutation: {id: string; expectedVersion: number} | null,
  actorId: string,
  now: Date,
): Promise<HomeNavMutationResult> {
  if (!mutation || mutation.id !== "singleton") return {ok: false, code: "VALIDATION_FAILED"};
  if (!await validImage(tx, input.deanPhotoMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  if (!await validImage(tx, input.videoPosterMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  if (!await validImage(tx, input.logoMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  if (!await validImage(tx, input.accreditationLogoMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  if (!await validImage(tx, input.bluLogoMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  if (!await validImage(tx, input.faviconMediaId)) return {ok: false, code: "MEDIA_INVALID"};
  const claim = await tx.siteSetting.updateMany({
    where: {id: "singleton", version: mutation.expectedVersion},
    data: {version: {increment: 1}},
  });
  if (claim.count !== 1) return {ok: false, code: "VERSION_CONFLICT"};
  const version = mutation.expectedVersion + 1;
  await tx.siteSetting.update({where: {id: "singleton"}, data: {
    deanName: input.deanName, deanPhotoId: input.deanPhotoMediaId, videoUrl: input.videoUrl,
    videoPosterMediaId: input.videoPosterMediaId, showProfileVideoInGallery: input.showProfileVideoInGallery,
    email: input.email, phone: input.phone,
    facebookUrl: input.facebookUrl, instagramUrl: input.instagramUrl, youtubeUrl: input.youtubeUrl, xUrl: input.xUrl,
    logoMediaId: input.logoMediaId,
    accreditationLogoMediaId: input.accreditationLogoMediaId,
    bluLogoMediaId: input.bluLogoMediaId,
    faviconMediaId: input.faviconMediaId,
    contentOwnerId: input.contentOwnerId,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    translations: {deleteMany: {}, create: translationRows<Prisma.SiteSettingTranslationCreateWithoutSiteSettingInput>(input, true, actorId, now, version)},
  }});
  await audit(tx, actorId, "UPDATE", "SiteSetting", "singleton");
  return {ok: true, id: "singleton", resource: "SITE_SETTING", version};
}

async function remove(
  tx: Prisma.TransactionClient,
  resource: "HOME_SLIDER" | "STATISTIC",
  id: string,
  actorId: string,
): Promise<HomeNavMutationResult> {
  if (resource === "HOME_SLIDER") {
    if (!await tx.homeSlider.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"};
    await tx.homeSlider.delete({where: {id}});
    await audit(tx, actorId, "UPDATE", "HomeSlider", id, "DELETE");
    return {ok: true, id, resource, version: null};
  }
  if (!await tx.statistic.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"};
  await tx.statistic.delete({where: {id}});
  await audit(tx, actorId, "UPDATE", "Statistic", id, "DELETE");
  return {ok: true, id, resource, version: null};
}

async function reorder(
  tx: Prisma.TransactionClient,
  command: Extract<HomeNavAdminCommand, {action: "REORDER"}>,
  actorId: string,
): Promise<HomeNavMutationResult> {
  if (command.resource !== "HOME_SLIDER" && command.resource !== "STATISTIC") {
    return {ok: false, code: "UNAVAILABLE"};
  }
  const ids = command.payload.items.map(({id}) => id);
  const count = command.resource === "HOME_SLIDER"
    ? await tx.homeSlider.count({where: {id: {in: ids}}})
    : await tx.statistic.count({where: {id: {in: ids}}});
  if (count !== ids.length) return {ok: false, code: "NOT_FOUND"};
  for (const {id, position} of command.payload.items) {
    if (command.resource === "HOME_SLIDER") await tx.homeSlider.update({where: {id}, data: {order: position}});
    else await tx.statistic.update({where: {id}, data: {order: position}});
  }
  const resourceType = command.resource === "HOME_SLIDER" ? "HomeSlider" : "Statistic";
  for (const {id} of command.payload.items) await audit(tx, actorId, "UPDATE", resourceType, id, "REORDER");
  return {ok: true, id: ids[0]!, resource: command.resource, version: null};
}

export async function executeHomeNavCommand(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<HomeNavMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = HomeNavAdminCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") {
        if (command.resource !== "HOME_SLIDER" && command.resource !== "STATISTIC") return {ok: false, code: "UNAVAILABLE"};
        return remove(tx, command.resource, command.id, actor.userId);
      }
      if (command.action === "REORDER") return reorder(tx, command, actor.userId);

      if (command.resource === "HOME_SLIDER") {
        const input = sanitizePayload("HOME_SLIDER", command.payload) as HomeSliderInput;
        return mutateHomeSlider(tx, command.action, input, command.action === "UPDATE" ? {id: command.mutation.id} : null, actor.userId, now);
      }
      if (command.resource === "STATISTIC") {
        const input = sanitizePayload("STATISTIC", command.payload) as StatisticInput;
        return mutateStatistic(tx, command.action, input, command.action === "UPDATE" ? {id: command.mutation.id} : null, actor.userId, now);
      }
      if (command.resource === "HOME_VIDEO") {
        const input = sanitizePayload("HOME_VIDEO", command.payload) as HomeVideoInput;
        return mutateHomeVideo(tx, command.action, input, command.action === "UPDATE" ? {id: command.mutation.id} : null, actor.userId, now);
      }
      if (command.resource === "HOME_SECTION") {
        if (command.action !== "UPDATE") return {ok: false, code: "UNAVAILABLE"};
        const input = sanitizePayload("HOME_SECTION", command.payload) as HomeSectionInput;
        return mutateHomeSection(tx, input, {id: command.mutation.id}, actor.userId, now);
      }
      if (command.resource === "SITE_SETTING") {
        if (command.action !== "UPDATE") return {ok: false, code: "UNAVAILABLE"};
        const input = sanitizePayload("SITE_SETTING", command.payload) as SiteSettingInput;
        return mutateSiteSetting(tx, input, {id: command.mutation.id, expectedVersion: command.mutation.expectedVersion!}, actor.userId, now);
      }
      return {ok: false, code: "UNAVAILABLE"};
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}
