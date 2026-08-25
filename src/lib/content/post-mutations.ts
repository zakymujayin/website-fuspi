import type {Prisma} from "@/generated/prisma/client";
import type {ContentStatus, TranslationStatus} from "@/generated/prisma/enums";
import {z} from "zod";

import {
  ActiveDatabaseSessionSchema,
  type ActiveDatabaseSession,
} from "@/contracts/auth";
import {
  PostAutosaveInputSchema,
  PostCreateInputSchema,
  PostInitialPublicationDecisionSchema,
  PostIdSchema,
  PostMutationResultSchema,
  PostPublicationMutationInputSchema,
  PostPublicationTransitionSchema,
  PostUpdateInputSchema,
  type PostAutosaveInput,
  type PostCreateInput,
  type PostMutationFailureCode,
  type PostMutationResult,
  type PostPublicationMutationInput,
  type PostTranslationInput,
  type PostTranslationsInput,
  type PostUpdateInput,
} from "@/contracts/post";
import {authorize} from "@/lib/auth/runtime/authorization";
import {recordActivity} from "@/lib/audit/activity-log";
import {createPrismaClient} from "@/lib/db/client";
import {claimOptimisticVersion} from "@/lib/db/optimistic-lock";
import {createContentRevision} from "@/lib/db/revision";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type PostMutationDatabase = ReturnType<typeof createPrismaClient>;
export type PostMutationClock = () => Date;

type Actor = ActiveDatabaseSession & {role: "ADMIN" | "EDITOR"};
type SanitizedTranslation = PostTranslationInput & {content: string};
type SanitizedTranslations = {
  id: SanitizedTranslation;
  en?: SanitizedTranslation;
  ar?: SanitizedTranslation;
};
type MutablePostInput = Pick<
  PostCreateInput,
  | "type"
  | "columnType"
  | "slug"
  | "isFeatured"
  | "categoryId"
  | "coverMediaId"
  | "tagIds"
  | "images"
>;
type ExistingPost = {
  id: string;
  type: PostCreateInput["type"];
  columnType: PostCreateInput["columnType"];
  slug: string;
  status: ContentStatus;
  isFeatured: boolean;
  publishedAt: Date | null;
  version: number;
  categoryId: string | null;
  coverMediaId: string | null;
  contentOwnerId: string | null;
  authorId: string | null;
  translations: Array<SanitizedTranslation & {
    locale: "id" | "en" | "ar";
    status: TranslationStatus;
    sourceVersion: number;
  }>;
  tags: Array<{tagId: string}>;
  images: Array<{mediaId: string; caption: string | null}>;
};

const SYSTEM_CLOCK: PostMutationClock = () => new Date();

function resultFailure(code: PostMutationFailureCode): PostMutationResult {
  return PostMutationResultSchema.parse({ok: false, code});
}

function actorFromSession(rawSession: unknown, now: Date): Actor | PostMutationResult {
  const parsed = ActiveDatabaseSessionSchema.safeParse(rawSession);
  if (!parsed.success || parsed.data.expiresAt.getTime() <= now.getTime()) {
    return resultFailure("UNAUTHENTICATED");
  }
  if (parsed.data.role !== "ADMIN" && parsed.data.role !== "EDITOR") {
    return resultFailure("FORBIDDEN");
  }
  return {...parsed.data, role: parsed.data.role};
}

function isFailure(value: Actor | PostMutationResult): value is PostMutationResult {
  return "ok" in value;
}

function isAuthorized(
  actor: Actor,
  action: "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "SCHEDULE",
  resourceOwnerId: string,
) {
  return authorize({
    actor,
    resourceOwnerId,
  }, action, "POST").allowed;
}

const PostDeleteInputSchema = z.object({
  postId: PostIdSchema,
  expectedVersion: z.number().int().positive().max(2_147_483_646),
}).strict();

function ownedPostWhere(actor: Actor, postId: string): Prisma.PostWhereInput {
  return actor.role === "ADMIN"
    ? {id: postId}
    : {
        id: postId,
        contentOwnerId: actor.userId,
        authorId: actor.userId,
      };
}

function sanitizeTranslations(translations: PostTranslationsInput): SanitizedTranslations {
  const sanitize = (translation: PostTranslationInput): SanitizedTranslation => ({
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

function translationStatusForPost(status: ContentStatus): TranslationStatus {
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "ARCHIVED") return "STALE";
  return "DRAFT";
}

function publicationOnCreate(input: PostCreateInput, now: Date) {
  const decision = PostInitialPublicationDecisionSchema.safeParse({
    now,
    publication: input.publication,
  });
  if (!decision.success) return null;
  switch (input.publication.intent) {
    case "SAVE_DRAFT":
      return {status: "DRAFT" as const, publishedAt: null};
    case "PUBLISH_NOW":
      return {status: "PUBLISHED" as const, publishedAt: now};
    case "SCHEDULE":
      return {
        status: "PUBLISHED" as const,
        publishedAt: new Date(input.publication.publishedAt),
      };
  }
}

function publicStateAfterMutation(
  command: PostPublicationMutationInput,
  now: Date,
  currentPublishedAt: Date | null,
) {
  switch (command.intent) {
    case "PUBLISH_NOW":
      return {status: "PUBLISHED" as const, publishedAt: now};
    case "SCHEDULE":
      return {
        status: "PUBLISHED" as const,
        publishedAt: new Date(command.publishedAt),
      };
    case "RETURN_TO_DRAFT":
      return {status: "DRAFT" as const, publishedAt: null};
    case "ARCHIVE":
      return {status: "ARCHIVED" as const, publishedAt: currentPublishedAt};
  }
}

async function validateReferences(
  transaction: Prisma.TransactionClient,
  actor: Actor,
  input: MutablePostInput,
): Promise<PostMutationFailureCode | null> {
  if (input.categoryId) {
    const category = await transaction.category.findUnique({
      where: {id: input.categoryId},
      select: {id: true},
    });
    if (!category) return "VALIDATION_FAILED";
  }

  if (input.tagIds.length > 0) {
    const tags = await transaction.tag.findMany({
      where: {id: {in: input.tagIds}},
      select: {id: true},
    });
    if (tags.length !== input.tagIds.length) return "VALIDATION_FAILED";
  }

  if (input.coverMediaId) {
    const media = await transaction.media.findUnique({
      where: {id: input.coverMediaId},
      select: {id: true, storageClass: true, uploaderId: true},
    });
    if (!media) return "MEDIA_NOT_FOUND";
    if (
      media.storageClass !== "PUBLIC"
      || (actor.role === "EDITOR" && media.uploaderId !== actor.userId)
    ) {
      return "MEDIA_FORBIDDEN";
    }
  }

  if (input.images.length > 0) {
    const mediaIds = input.images.map((image) => image.mediaId);
    const media = await transaction.media.findMany({
      where: {id: {in: mediaIds}},
      select: {id: true, storageClass: true, uploaderId: true},
    });
    if (media.length !== mediaIds.length) return "MEDIA_NOT_FOUND";
    const forbidden = media.some((item) =>
      item.storageClass !== "PUBLIC" || (actor.role === "EDITOR" && item.uploaderId !== actor.userId));
    if (forbidden) return "MEDIA_FORBIDDEN";
  }

  return null;
}

function rootSnapshot(options: {
  input: MutablePostInput;
  status: ContentStatus;
  publishedAt: Date | null;
  version: number;
}) {
  return {
    type: options.input.type,
    columnType: options.input.columnType ?? null,
    slug: options.input.slug,
    status: options.status,
    isFeatured: options.input.isFeatured,
    publishedAt: options.publishedAt?.toISOString() ?? null,
    version: options.version,
    categoryId: options.input.categoryId,
    coverMediaId: options.input.coverMediaId,
    tagIds: [...options.input.tagIds],
    images: options.input.images.map((image) => ({...image})),
  };
}

async function createRevisions(
  transaction: Prisma.TransactionClient,
  options: {
    postId: string;
    actorId: string;
    version: number;
    changeSummary: string;
    input: MutablePostInput;
    status: ContentStatus;
    publishedAt: Date | null;
    translations: SanitizedTranslations;
  },
) {
  await createContentRevision(transaction, {
    resourceType: "Post",
    resourceId: options.postId,
    version: options.version,
    snapshot: rootSnapshot(options),
    changeSummary: options.changeSummary,
    actorId: options.actorId,
  });

  for (const {locale, value} of translationEntries(options.translations)) {
    await createContentRevision(transaction, {
      resourceType: "Post",
      resourceId: options.postId,
      locale,
      version: options.version,
      snapshot: {
        locale,
        title: value.title,
        excerpt: value.excerpt ?? null,
        content: value.content,
        metaTitle: value.metaTitle ?? null,
        metaDesc: value.metaDesc ?? null,
        coverCaption: value.coverCaption ?? null,
        status: translationStatusForPost(options.status),
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
  const translationStatus = translationStatusForPost(status);
  return translationEntries(translations).map(({locale, value}) => ({
    locale,
    ...value,
    status: translationStatus,
    sourceVersion,
  }));
}

async function replaceTranslations(
  transaction: Prisma.TransactionClient,
  postId: string,
  translations: SanitizedTranslations,
  status: ContentStatus,
  sourceVersion: number,
) {
  const entries = translationEntries(translations);
  const locales = entries.map(({locale}) => locale);
  await transaction.postTranslation.deleteMany({
    where: {postId, locale: {notIn: locales}},
  });
  const translationStatus = translationStatusForPost(status);
  for (const {locale, value} of entries) {
    await transaction.postTranslation.upsert({
      where: {postId_locale: {postId, locale}},
      create: {
        postId,
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

async function replaceTags(
  transaction: Prisma.TransactionClient,
  postId: string,
  tagIds: readonly string[],
) {
  await transaction.postTag.deleteMany({where: {postId}});
  if (tagIds.length > 0) {
    await transaction.postTag.createMany({
      data: tagIds.map((tagId) => ({postId, tagId})),
    });
  }
}

async function replaceImages(
  transaction: Prisma.TransactionClient,
  postId: string,
  images: readonly {mediaId: string; caption?: string | null}[],
) {
  await transaction.postImage.deleteMany({where: {postId}});
  if (images.length > 0) {
    await transaction.postImage.createMany({
      data: images.map((image, order) => ({
        postId, mediaId: image.mediaId, caption: image.caption ?? null, order,
      })),
    });
  }
}

async function readOwnedPost(
  transaction: Prisma.TransactionClient,
  actor: Actor,
  postId: string,
): Promise<ExistingPost | null> {
  return transaction.post.findFirst({
    where: ownedPostWhere(actor, postId),
    select: {
      id: true,
      type: true,
      columnType: true,
      slug: true,
      status: true,
      isFeatured: true,
      publishedAt: true,
      version: true,
      categoryId: true,
      coverMediaId: true,
      contentOwnerId: true,
      authorId: true,
      translations: {
        select: {
          locale: true,
          title: true,
          excerpt: true,
          content: true,
          metaTitle: true,
          metaDesc: true,
          coverCaption: true,
          status: true,
          sourceVersion: true,
        },
      },
      tags: {select: {tagId: true}},
      images: {select: {mediaId: true, caption: true}, orderBy: {order: "asc"}},
    },
  });
}

function translationsFromExisting(post: ExistingPost): SanitizedTranslations {
  const byLocale = Object.fromEntries(post.translations.map((translation) => [
    translation.locale,
    {
      title: translation.title,
      excerpt: translation.excerpt,
      content: translation.content,
      metaTitle: translation.metaTitle,
      metaDesc: translation.metaDesc,
      coverCaption: translation.coverCaption,
    },
  ])) as Partial<Record<"id" | "en" | "ar", SanitizedTranslation>>;
  if (!byLocale.id) throw new Error("Post has no Indonesian translation.");
  return {
    id: byLocale.id,
    ...(byLocale.en ? {en: byLocale.en} : {}),
    ...(byLocale.ar ? {ar: byLocale.ar} : {}),
  };
}

function mutableInputFromExisting(post: ExistingPost): MutablePostInput {
  return {
    type: post.type,
    columnType: post.columnType,
    slug: post.slug,
    isFeatured: post.isFeatured,
    categoryId: post.categoryId,
    coverMediaId: post.coverMediaId,
    tagIds: post.tags.map(({tagId}) => tagId),
    images: post.images.map(({mediaId, caption}) => ({mediaId, caption})),
  };
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && error.code === "P2002",
  );
}

function successfulResult(post: {
  id: string;
  version: number;
  status: ContentStatus;
  publishedAt: Date | null;
  updatedAt: Date;
}): PostMutationResult {
  return PostMutationResultSchema.parse({
    ok: true,
    postId: post.id,
    version: post.version,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  });
}

export async function createPost(
  database: PostMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PostMutationClock = SYSTEM_CLOCK,
): Promise<PostMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  if (!isAuthorized(actor, "CREATE", actor.userId)) return resultFailure("FORBIDDEN");

  const parsed = PostCreateInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");
  const publication = publicationOnCreate(parsed.data, now);
  if (!publication) return resultFailure("VALIDATION_FAILED");

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

      const post = await transaction.post.create({
        data: {
          type: parsed.data.type,
          columnType: parsed.data.columnType ?? null,
          slug: parsed.data.slug,
          status: publication.status,
          isFeatured: parsed.data.isFeatured,
          publishedAt: publication.publishedAt,
          categoryId: parsed.data.categoryId,
          authorId: actor.userId,
          contentOwnerId: actor.userId,
          coverMediaId: parsed.data.coverMediaId,
          translations: {
            create: translationCreateData(translations, publication.status, 1),
          },
          tags: {
            create: parsed.data.tagIds.map((tagId) => ({tagId})),
          },
          images: {
            create: parsed.data.images.map((image, order) => ({
              mediaId: image.mediaId, caption: image.caption ?? null, order,
            })),
          },
        },
      });
      await createRevisions(transaction, {
        postId: post.id,
        actorId: actor.userId,
        version: post.version,
        changeSummary: parsed.data.publication.intent,
        input: parsed.data,
        status: post.status,
        publishedAt: post.publishedAt,
        translations,
      });
      return successfulResult(post);
    });
  } catch (error) {
    return resultFailure(isUniqueConstraintError(error) ? "SLUG_CONFLICT" : "INTERNAL_ERROR");
  }
}

async function writeExistingPost(
  database: PostMutationDatabase,
  actor: Actor,
  input: PostUpdateInput | PostAutosaveInput,
  translations: SanitizedTranslations,
  autosave: boolean,
): Promise<PostMutationResult> {
  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPost(transaction, actor, input.postId);
      if (!existing) return resultFailure("NOT_FOUND");
      if (!isAuthorized(actor, "UPDATE", existing.contentOwnerId ?? existing.authorId ?? "")) {
        return resultFailure("NOT_FOUND");
      }
      if (autosave && existing.status !== "DRAFT") {
        return resultFailure("INVALID_STATE");
      }

      const referenceFailure = await validateReferences(transaction, actor, input);
      if (referenceFailure) return resultFailure(referenceFailure);

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Post",
        id: existing.id,
        expectedVersion: input.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      const guarded = await transaction.post.updateMany({
        where: {
          ...ownedPostWhere(actor, existing.id),
          version: claim.nextVersion,
        },
        data: {
          type: input.type,
          columnType: input.columnType ?? null,
          slug: input.slug,
          isFeatured: input.isFeatured,
          categoryId: input.categoryId,
          coverMediaId: input.coverMediaId,
        },
      });
      if (guarded.count !== 1) throw new Error("Owned post changed during mutation.");

      await replaceTranslations(
        transaction,
        existing.id,
        translations,
        existing.status,
        claim.nextVersion,
      );
      await replaceTags(transaction, existing.id, input.tagIds);
      await replaceImages(transaction, existing.id, input.images);
      await createRevisions(transaction, {
        postId: existing.id,
        actorId: actor.userId,
        version: claim.nextVersion,
        changeSummary: autosave ? "AUTOSAVE_DRAFT" : "UPDATE",
        input,
        status: existing.status,
        publishedAt: existing.publishedAt,
        translations,
      });

      const post = await transaction.post.findUniqueOrThrow({
        where: {id: existing.id},
        select: {
          id: true,
          version: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
      });
      return successfulResult(post);
    });
  } catch (error) {
    return resultFailure(isUniqueConstraintError(error) ? "SLUG_CONFLICT" : "INTERNAL_ERROR");
  }
}

export async function updatePost(
  database: PostMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PostMutationClock = SYSTEM_CLOCK,
): Promise<PostMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  const parsed = PostUpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  let translations: SanitizedTranslations;
  try {
    translations = sanitizeTranslations(parsed.data.translations);
  } catch {
    return resultFailure("VALIDATION_FAILED");
  }
  return writeExistingPost(database, actor, parsed.data, translations, false);
}

export async function autosavePost(
  database: PostMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PostMutationClock = SYSTEM_CLOCK,
): Promise<PostMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  const parsed = PostAutosaveInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  let translations: SanitizedTranslations;
  try {
    translations = sanitizeTranslations(parsed.data.translations);
  } catch {
    return resultFailure("VALIDATION_FAILED");
  }
  return writeExistingPost(database, actor, parsed.data, translations, true);
}

export async function mutatePostPublication(
  database: PostMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PostMutationClock = SYSTEM_CLOCK,
): Promise<PostMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  const parsed = PostPublicationMutationInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");
  const action = parsed.data.intent === "SCHEDULE" ? "SCHEDULE" : "PUBLISH";

  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPost(transaction, actor, parsed.data.postId);
      if (!existing) return resultFailure("NOT_FOUND");
      if (!isAuthorized(actor, action, existing.contentOwnerId ?? existing.authorId ?? "")) {
        return resultFailure("NOT_FOUND");
      }
      const transition = PostPublicationTransitionSchema.safeParse({
        currentStatus: existing.status,
        now,
        command: parsed.data,
      });
      if (!transition.success) return resultFailure("INVALID_STATE");

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Post",
        id: existing.id,
        expectedVersion: parsed.data.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      const nextState = publicStateAfterMutation(parsed.data, now, existing.publishedAt);
      const guarded = await transaction.post.updateMany({
        where: {
          ...ownedPostWhere(actor, existing.id),
          version: claim.nextVersion,
        },
        data: nextState,
      });
      if (guarded.count !== 1) throw new Error("Owned post changed during publication.");

      const translationStatus = translationStatusForPost(nextState.status);
      await transaction.postTranslation.updateMany({
        where: {postId: existing.id},
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
        postId: existing.id,
        actorId: actor.userId,
        version: claim.nextVersion,
        changeSummary: parsed.data.intent,
        input: mutableInputFromExisting(existing),
        status: nextState.status,
        publishedAt: nextState.publishedAt,
        translations,
      });

      const post = await transaction.post.findUniqueOrThrow({
        where: {id: existing.id},
        select: {
          id: true,
          version: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
      });
      return successfulResult(post);
    });
  } catch {
    return resultFailure("INTERNAL_ERROR");
  }
}

export async function deletePost(
  database: PostMutationDatabase,
  rawSession: unknown,
  rawInput: unknown,
  clock: PostMutationClock = SYSTEM_CLOCK,
): Promise<PostMutationResult> {
  const now = clock();
  const actor = actorFromSession(rawSession, now);
  if (isFailure(actor)) return actor;
  const parsed = PostDeleteInputSchema.safeParse(rawInput);
  if (!parsed.success) return resultFailure("VALIDATION_FAILED");

  try {
    return await database.$transaction(async (transaction) => {
      const existing = await readOwnedPost(transaction, actor, parsed.data.postId);
      if (!existing) return resultFailure("NOT_FOUND");
      const ownerId = existing.contentOwnerId ?? existing.authorId ?? "";
      if (!isAuthorized(actor, "DELETE", ownerId)) return resultFailure("NOT_FOUND");

      const claim = await claimOptimisticVersion(transaction, {
        resource: "Post",
        id: existing.id,
        expectedVersion: parsed.data.expectedVersion,
      });
      if (!claim.ok) return resultFailure("VERSION_CONFLICT");

      const removed = await transaction.post.deleteMany({
        where: {
          ...ownedPostWhere(actor, existing.id),
          version: claim.nextVersion,
        },
      });
      if (removed.count !== 1) throw new Error("Owned post changed during deletion.");
      await recordActivity(transaction, {
        actorId: actor.userId,
        action: "UPDATE",
        resourceType: "Post",
        resourceId: existing.id,
        metadata: {operation: "DELETE", version: claim.nextVersion},
      });
      return successfulResult({
        id: existing.id,
        version: claim.nextVersion,
        status: existing.status,
        publishedAt: existing.publishedAt,
        updatedAt: now,
      });
    });
  } catch {
    return resultFailure("INTERNAL_ERROR");
  }
}
