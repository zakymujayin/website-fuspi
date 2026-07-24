import {
  AdminPostCreatePayloadSchema,
  AdminPostUpdatePayloadSchema,
} from "@/contracts/post-admin";

export type PostEditorLocale = "id" | "en" | "ar";
export const POST_EDITOR_LOCALES: readonly PostEditorLocale[] = ["id", "en", "ar"];

/** One locale's editable text. Kept flat so the form state maps 1:1 onto inputs. */
export type PostEditorTranslationDraft = {
  title: string;
  excerpt: string;
  content: string;
};

export type PostEditorDraft = {
  slug: string;
  isFeatured: boolean;
  translations: Record<PostEditorLocale, PostEditorTranslationDraft>;
};

/**
 * Fields this task cannot edit but must preserve. `AdminPostUpdatePayloadSchema` requires all three
 * on every update, so an edit that omitted them would silently erase an existing category, cover
 * image, or tags. They are carried through untouched from the loaded editor view.
 */
export type PostEditorCarriedFields = {
  categoryId: string | null;
  coverMediaId: string | null;
  tagIds: readonly string[];
};

export const EMPTY_TRANSLATION: PostEditorTranslationDraft = {
  title: "",
  excerpt: "",
  content: "",
};

export function emptyDraft(): PostEditorDraft {
  return {
    slug: "",
    isFeatured: false,
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

/** A non-Indonesian locale counts as present only when the editor actually typed something. */
export function hasTranslationContent(draft: PostEditorTranslationDraft): boolean {
  return draft.title.trim().length > 0
    || draft.excerpt.trim().length > 0
    || draft.content.trim().length > 0;
}

function toTranslationInput(draft: PostEditorTranslationDraft) {
  const excerpt = draft.excerpt.trim();
  return {
    title: draft.title.trim(),
    // The contract models "no excerpt" as null, not an empty string.
    excerpt: excerpt.length > 0 ? excerpt : null,
    content: draft.content,
  };
}

function toTranslationsInput(draft: PostEditorDraft) {
  const translations: Record<string, ReturnType<typeof toTranslationInput>> = {
    id: toTranslationInput(draft.translations.id),
  };
  for (const locale of ["en", "ar"] as const) {
    if (hasTranslationContent(draft.translations[locale])) {
      translations[locale] = toTranslationInput(draft.translations[locale]);
    }
  }
  return translations;
}

/** Build the frozen CREATE payload. This task only ever saves a draft. */
export function buildCreatePayload(draft: PostEditorDraft) {
  return AdminPostCreatePayloadSchema.safeParse({
    slug: draft.slug.trim(),
    isFeatured: draft.isFeatured,
    categoryId: null,
    coverMediaId: null,
    tagIds: [],
    translations: toTranslationsInput(draft),
    publication: { intent: "SAVE_DRAFT" },
  });
}

/** Build the frozen UPDATE payload, preserving fields this form cannot edit. */
export function buildUpdatePayload(
  draft: PostEditorDraft,
  postId: string,
  expectedVersion: number,
  carried: PostEditorCarriedFields,
) {
  return AdminPostUpdatePayloadSchema.safeParse({
    postId,
    expectedVersion,
    slug: draft.slug.trim(),
    isFeatured: draft.isFeatured,
    categoryId: carried.categoryId,
    coverMediaId: carried.coverMediaId,
    tagIds: [...carried.tagIds],
    translations: toTranslationsInput(draft),
  });
}

/** Dotted Zod paths ("translations.id.title") so the form can attach errors to the right control. */
export function collectFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
