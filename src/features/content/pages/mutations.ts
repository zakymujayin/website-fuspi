import type {Prisma} from "@/generated/prisma/client";
import type {ContentStatus, TranslationStatus} from "@/generated/prisma/enums";

import {
  ActiveDatabaseSessionSchema,
  type ActiveDatabaseSession,
} from "@/contracts/auth";
import {authorize} from "@/lib/auth/runtime/authorization";
import {recordActivity} from "@/lib/audit/activity-log";
import {createPrismaClient} from "@/lib/db/client";
import {claimOptimisticVersion} from "@/lib/db/optimistic-lock";
import {createContentRevision} from "@/lib/db/revision";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";
import {
  PageCreateInputSchema,
  PageDeleteInputSchema,
  PageMutationResultSchema,
  PagePublicationMutationInputSchema,
  PagePublicationTransitionSchema,
  PageUpdateInputSchema,
  type PageCreateInput,
  type PageMutationFailureCode,
  type PageMutationResult,
  type PagePublicationMutationInput,
  type PageTranslationInput,
  type PageTranslationsInput,

} from "@/features/content/pages/contract";

export type PageMutationDatabase = ReturnType<typeof createPrismaClient>;
export type PageMutationClock = () => Date;

type Actor = ActiveDatabaseSession & {role: "ADMIN"};
type SanitizedTranslation = PageTranslationInput & {content: string};
type SanitizedTranslations = {
  id: SanitizedTranslation;
  en?: SanitizedTranslation;
  ar?: SanitizedTranslation;
};

const SYSTEM_CLOCK: PageMutationClock = () => new Date();

function resultFailure(code: PageMutationFailureCode): PageMutationResult {
  return PageMutationResultSchema.parse({ok: false, code});
}

function actorFromSession(rawSession: unknown, now: Date): Actor | PageMutationResult {
  const parsed = ActiveDatabaseSessionSchema.safeParse(rawSession);
  if (!parsed.success || parsed.data.expiresAt.getTime() <= now.getTime()) {
    return resultFailure("UNAUTHENTICATED");
  }
  if (parsed.data.role !== "ADMIN") {
    return resultFailure("FORBIDDEN");
  }
  return {...parsed.data, role: parsed.data.role as "ADMIN"};
}

function isFailure(value: Actor | PageMutationResult): value is PageMutationResult {
  return "ok" in value;
}

function isAuthorized(actor: Actor, action: "CREATE" | "UPDATE" | "DELETE" | "PUBLISH") {
  return authorize({actor}, action, "CMS").allowed;
}

function sanitizeTranslations(translations: PageTranslationsInput): SanitizedTranslations {
  const sanitize = (translation: PageTranslationInput): SanitizedTranslation => ({
    ...translation,
    content: sanitizeRichTextHtml(translation.content),
  });
  return {
    id: sanitize(translations.id),
    ...(translations.en ? {en: sanitize(translations.en)} : {}),
    ...(translations.ar ? {ar: sanitize(translations.ar)} : {}),
  };
}

function translationEntries(translations: SanitizedTranslations) {
  return (["id", "en", "ar"] as const).flatMap((locale) => {
    const value = translations[locale];
    return value ? [{locale, value}] : [];
  });
}

function translationStatusForPage(status: ContentStatus): TranslationStatus {
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "ARCHIVED") return "STALE";
  return "DRAFT";
}

function publicationOnCreate(input: PageCreateInput): {status: ContentStatus} {
  switch (input.publication.intent) {
    case "SAVE_DRAFT":
      return {status: "DRAFT"};
    case "PUBLISH_NOW":
      return {status: "PUBLISHED"};
  }
}

function publicStateAfterMutation(command: PagePublicationMutationInput) {
  switch (command.intent) {
    case "PUBLISH_NOW":
      return {status: "PUBLISHED" as const};
    case "RETURN_TO_DRAFT":
      return {status: "DRAFT" as const};
    case "ARCHIVE":
      return {status: "ARCHIVED" as const};
  }
}

async function validateReferences(
  transaction: Prisma.TransactionClient,
  actor: Actor,
  input: {heroMediaId: string | null; parentId: string | null},
): Promise<PageMutationFailureCode | null> {
  if (input.heroMediaId) {
    const media = await transaction.media.findUnique({
      where: {id: input.heroMediaId},
      select: {id: true, storageClass: true},
    });
    if (!media) return "MEDIA_NOT_FOUND";
    if (media.storageClass !== "PUBLIC") return "MEDIA_FORBIDDEN";
  }

  if (input.parentId) {
    const parent = await transaction.page.findUnique({
      where: {id: input.parentId},
      select: {id: true},
    });
    if (!parent) return "PARENT_NOT_FOUND";
  }

  return null;
}

async function detectHierarchyCycle(
  transaction: Prisma.TransactionClient,
  pageId: string,
  proposedParentId: string,
): Promise<boolean> {
  if (pageId === proposedParentId) return true;

  const visited = new Set<string>([pageId]);
  let currentId: string | null = proposedParentId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    const ancestor: {parentId: string | null} | null = await transaction.page.findUnique({
      where: {id: currentId},
      select: {parentId: true},
    });
    currentId = ancestor?.parentId ?? null;
  }

  return false;
}

function rootSnapshot(options: {
  input: {slug: string; parentId: string | null; heroMediaId: string | null; order: number};
  status: ContentStatus;
  version: number;
}) {
  return {
    slug: options.input.slug,
    status: options.status,
    order: options.input.order,
    parentId: options.input.parentId,
    heroMediaId: options.input.heroMediaId,
    version: options.version,
  };
}

async function createRevisions(
  transaction: Prisma.TransactionClient,
  options: {
    pageId: string;
    actorId: string;
    version: number;
    changeSummary: string;
    input: {slug: string; parentId: string | null; heroMediaId: string | null; order: number};
    status: ContentStatus;
    translations: SanitizedTranslations;
  },
) {
  await createContentRevision(transaction, {
    resourceType: "Page",
    resourceId: options.pageId,
    version: options.version,
    snapshot: rootSnapshot(options),
    changeSummary: options.changeSummary,
    actorId: options.actorId,
  });

  for (const {locale, value} of translationEntries(options.translations)) {
    await createContentRevision(transaction, {
      resourceType: "Page",
      resourceId: options.pageId,
      locale,
      version: options.version,
      snapshot: {
        locale,
        title: value.title,
        content: value.content,
        metaTitle: value.metaTitle ?? null,
        metaDesc: value.metaDesc ?? null,
        status: translationStatusForPage(options.status),
        sourceVersion: options.version,
      },
      changeSummary: options.changeSummary,
      actorId: options.actorId,
    });
  }
}

function translationCreateData(
  translations: SanitizedTranslations,
  status: ContentStatus,
  sourceVersion: number,
) {
  const translationStatus = translationStatusForPage(status);
  return translationEntries(translations).map(({locale, value}) => ({
    locale,
    ...value,
    status: translationStatus,
    sourceVersion,
  }));
}

async function replaceTranslations(
  transaction: Prisma.TransactionClient,
  pageId: string,
  translations: SanitizedTranslations,
  status: ContentStatus,
  sourceVersion: number,
) {
  const entries = translationEntries(translations);
  const locales = entries.map(({locale}) => locale);
  await transaction.pageTranslation.deleteMany({
    where: {pageId, locale: {notIn: locales}},
  });
  const translationStatus = translationStatusForPage(status);
  for (const {locale, value} of entries) {
    await transaction.pageTranslation.upsert({
      where: {pageId_locale: {pageId, locale}},
      create: {
        pageId,
        locale,
        ...value,
        status: translationStatus,
        sourceVersion,
      },
      update: {
        ...value,
        status: translationStatus,
        sourceVersion,
        translatorId: null,
        reviewerId: null,
        reviewedAt: null,
      },
    });
  }
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && error.code === "P2002",
  );
}

function successfulResult(page: {
  id: string;
  version: number;
  status: ContentStatus;
  updatedAt: Date;
}): PageMutationResult {
  return PageMutationResultSchema.parse({
    ok: true,
    pageId: page.id,
    version: page.version,
    status: page.status,
    updatedAt: page.updatedAt,
  });
}

export async function createPage(
  database: PageMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PageMutationClock = SYSTEM_CLOCK,
): Promise<PageMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  if (!isAuthorized(actor, "CREATE")) return resultFailure("FORBIDDEN");

  const parsed = PageCreateInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");
  const publication = publicationOnCreate(parsed.data);

  let translations: SanitizedTranslations;
  try {
    translations = sanitizeTranslations(parsed.data.translations);
  } catch {
    return resultFailure("VALIDATION_FAILED");
  }

  try {
    return await database.$transaction(async (transaction) => {
      const referenceFailure = await validateReferences(transaction, actor, parsed.data);
      if (referenceFailure) return resultFailure(referenceFailure);

      const page = await transaction.page.create({
        data: {
          slug: parsed.data.slug,
          status: publication.status,
          order: parsed.data.order,
          parentId: parsed.data.parentId,
          heroMediaId: parsed.data.heroMediaId,
          contentOwnerId: actor.userId,
          translations: {
            create: translationCreateData(translations, publication.status, 1),
          },
        },
      });

      await createRevisions(transaction, {
        pageId: page.id,
        actorId: actor.userId,
        version: page.version,
        changeSummary: parsed.data.publication.intent,
        input: parsed.data,
        status: page.status,
        translations,
      });

      await recordActivity(transaction, {
        actorId: actor.userId,
        action: "CREATE",
        resourceType: "Page",
        resourceId: page.id,
      });

      return successfulResult(page);
    });
  } catch (error) {
    return resultFailure(isUniqueConstraintError(error) ? "SLUG_CONFLICT" : "INTERNAL_ERROR");
  }
}

async function readOwnedPage(
  transaction: Prisma.TransactionClient,
  pageId: string,
): Promise<{
  id: string;
  slug: string;
  status: ContentStatus;
  order: number;
  version: number;
  parentId: string | null;
  heroMediaId: string | null;
  contentOwnerId: string | null;
  translations: Array<{
    locale: "id" | "en" | "ar";
    title: string;
    content: string;
    metaTitle: string | null;
    metaDesc: string | null;
    status: TranslationStatus;
    sourceVersion: number;
  }>;
} | null> {
  return transaction.page.findFirst({
    where: {id: pageId},
    select: {
      id: true,
      slug: true,
      status: true,
      order: true,
      version: true,
      parentId: true,
      heroMediaId: true,
      contentOwnerId: true,
      translations: {
        select: {
          locale: true,
          title: true,
          content: true,
          metaTitle: true,
          metaDesc: true,
          status: true,
          sourceVersion: true,
        },
      },
    },
  });
}

function translationsFromExisting(existing: NonNullable<Awaited<ReturnType<typeof readOwnedPage>>>): SanitizedTranslations {
  const byLocale = Object.fromEntries(existing.translations.map((t) => [
    t.locale,
    {
      title: t.title,
      content: t.content,
      metaTitle: t.metaTitle,
      metaDesc: t.metaDesc,
    },
  ])) as Partial<Record<"id" | "en" | "ar", SanitizedTranslation>>;
  if (!byLocale.id) throw new Error("Page has no Indonesian translation.");
  return {
    id: byLocale.id,
    ...(byLocale.en ? {en: byLocale.en} : {}),
    ...(byLocale.ar ? {ar: byLocale.ar} : {}),
  };
}

export async function updatePage(
  database: PageMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PageMutationClock = SYSTEM_CLOCK,
): Promise<PageMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  if (!isAuthorized(actor, "UPDATE")) return resultFailure("FORBIDDEN");

  const parsed = PageUpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  let translations: SanitizedTranslations;
  try {
    translations = sanitizeTranslations(parsed.data.translations);
  } catch {
    return resultFailure("VALIDATION_FAILED");
  }

  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPage(transaction, parsed.data.pageId);
      if (!existing) return resultFailure("NOT_FOUND");

      const referenceFailure = await validateReferences(transaction, actor, parsed.data);
      if (referenceFailure) return resultFailure(referenceFailure);

      if (parsed.data.parentId && parsed.data.parentId !== existing.parentId) {
        const cycle = await detectHierarchyCycle(
          transaction,
          parsed.data.pageId,
          parsed.data.parentId,
        );
        if (cycle) return resultFailure("HIERARCHY_CYCLE");
      }

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Page",
        id: existing.id,
        expectedVersion: parsed.data.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      await transaction.page.update({
        where: {id: existing.id},
        data: {
          slug: parsed.data.slug,
          parentId: parsed.data.parentId,
          heroMediaId: parsed.data.heroMediaId,
          order: parsed.data.order,
        },
      });

      await replaceTranslations(
        transaction,
        existing.id,
        translations,
        existing.status,
        claim.nextVersion,
      );

      await createRevisions(transaction, {
        pageId: existing.id,
        actorId: actor.userId,
        version: claim.nextVersion,
        changeSummary: "UPDATE",
        input: parsed.data,
        status: existing.status,
        translations,
      });

      await recordActivity(transaction, {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "Page",
        resourceId: existing.id,
      });

      const page = await transaction.page.findUniqueOrThrow({
        where: {id: existing.id},
        select: {id: true, version: true, status: true, updatedAt: true},
      });
      return successfulResult(page);
    });
  } catch (error) {
    return resultFailure(isUniqueConstraintError(error) ? "SLUG_CONFLICT" : "INTERNAL_ERROR");
  }
}

export async function mutatePagePublication(
  database: PageMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PageMutationClock = SYSTEM_CLOCK,
): Promise<PageMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  if (!isAuthorized(actor, "PUBLISH")) return resultFailure("FORBIDDEN");

  const parsed = PagePublicationMutationInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPage(transaction, parsed.data.pageId);
      if (!existing) return resultFailure("NOT_FOUND");

      const transition = PagePublicationTransitionSchema.safeParse({
        currentStatus: existing.status,
        command: parsed.data,
      });
      if (!transition.success) return resultFailure("INVALID_STATE");

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Page",
        id: existing.id,
        expectedVersion: parsed.data.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      const nextState = publicStateAfterMutation(parsed.data);

      await transaction.page.update({
        where: {id: existing.id},
        data: nextState,
      });

      const translationStatus = translationStatusForPage(nextState.status);
      await transaction.pageTranslation.updateMany({
        where: {pageId: existing.id},
        data: {
          status: translationStatus,
          sourceVersion: claim.nextVersion,
          translatorId: null,
          reviewerId: null,
          reviewedAt: null,
        },
      });

      const translations = translationsFromExisting(existing);
      await createRevisions(transaction, {
        pageId: existing.id,
        actorId: actor.userId,
        version: claim.nextVersion,
        changeSummary: parsed.data.intent,
        input: {
          slug: existing.slug,
          parentId: existing.parentId,
          heroMediaId: existing.heroMediaId,
          order: existing.order,
        },
        status: nextState.status,
        translations,
      });

      await recordActivity(transaction, {
        actorId: actor.userId,
        action: nextState.status === "PUBLISHED"
          ? "PUBLISH"
          : parsed.data.intent === "ARCHIVE"
            ? "ARCHIVE"
            : "UPDATE",
        resourceType: "Page",
        resourceId: existing.id,
        ...(parsed.data.intent === "RETURN_TO_DRAFT"
          ? {metadata: {operation: "RETURN_TO_DRAFT", version: claim.nextVersion}}
          : {}),
      });

      const page = await transaction.page.findUniqueOrThrow({
        where: {id: existing.id},
        select: {id: true, version: true, status: true, updatedAt: true},
      });
      return successfulResult(page);
    });
  } catch {
    return resultFailure("INTERNAL_ERROR");
  }
}

export async function deletePage(
  database: PageMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PageMutationClock = SYSTEM_CLOCK,
): Promise<PageMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  if (!isAuthorized(actor, "DELETE")) return resultFailure("FORBIDDEN");

  const parsed = PageDeleteInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPage(transaction, parsed.data.pageId);
      if (!existing) return resultFailure("NOT_FOUND");

      const childrenCount = await transaction.page.count({
        where: {parentId: existing.id},
      });

      if (childrenCount > 0) {
        return resultFailure("INVALID_STATE");
      }

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Page",
        id: existing.id,
        expectedVersion: parsed.data.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      await transaction.page.delete({
        where: {id: existing.id},
      });

      await recordActivity(transaction, {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "Page",
        resourceId: existing.id,
        metadata: {operation: "DELETE", version: claim.nextVersion},
      });

      return successfulResult({
        id: existing.id,
        version: claim.nextVersion,
        status: existing.status,
        updatedAt: now,
      });
    });
  } catch {
    return resultFailure("INTERNAL_ERROR");
  }
}
