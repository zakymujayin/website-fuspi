import {
  AdminColumnAutosavePayloadSchema,
  AdminColumnCreatePayloadSchema,
  AdminColumnUpdatePayloadSchema,
  AdminPostAutosavePayloadSchema,
  AdminPostCreatePayloadSchema,
  AdminPostUpdatePayloadSchema,
} from "@/contracts/post-admin";

export type PostEditorLocale = "id" | "en" | "ar";
export type PostEditorType = "BERITA" | "KOLOM";
export type PostEditorColumnType = "DEKAN" | "DOSEN" | "MAHASISWA";
export const POST_EDITOR_LOCALES: readonly PostEditorLocale[] = ["id", "en", "ar"];

/** One locale's editable text. Kept flat so the form state maps 1:1 onto inputs. */
export type PostEditorTranslationDraft = {
  title: string;
  excerpt: string;
  content: string;
};

export type PostEditorImageDraft = { mediaId: string; caption: string };

export type PostEditorDraft = {
  type: PostEditorType;
  columnType: PostEditorColumnType | null;
  slug: string;
  isFeatured: boolean;
  categoryId: string | null;
  tagIds: readonly string[];
  /** Editable via the cover picker; null means no cover. */
  coverMediaId: string | null;
  /** Gallery photos, in display order; editable via the gallery picker. */
  images: readonly PostEditorImageDraft[];
  translations: Record<PostEditorLocale, PostEditorTranslationDraft>;
};

/**
 * Backwards-compatible alias for tests/components that still refer to the old carried-field shape.
 * Category and tags are now first-class editable draft fields.
 */
export type PostEditorCarriedFields = {
  categoryId: string | null;
  tagIds: readonly string[];
};

export const EMPTY_TRANSLATION: PostEditorTranslationDraft = {
  title: "",
  excerpt: "",
  content: "",
};

export function emptyDraft(type: PostEditorType = "BERITA"): PostEditorDraft {
  return {
    type,
    columnType: type === "KOLOM" ? "DOSEN" : null,
    slug: "",
    isFeatured: false,
    categoryId: null,
    tagIds: [],
    coverMediaId: null,
    images: [],
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

function toImagesInput(draft: PostEditorDraft) {
  return draft.images.map((image) => {
    const caption = image.caption.trim();
    return { mediaId: image.mediaId, caption: caption.length > 0 ? caption : null };
  });
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

function basePayload(draft: PostEditorDraft) {
  return {
    slug: draft.slug.trim(),
    isFeatured: draft.isFeatured,
    categoryId: draft.categoryId,
    coverMediaId: draft.coverMediaId,
    tagIds: [...draft.tagIds],
    images: toImagesInput(draft),
    translations: toTranslationsInput(draft),
  };
}

function columnBasePayload(draft: PostEditorDraft) {
  return {
    ...basePayload(draft),
    type: "KOLOM" as const,
    columnType: draft.columnType,
  };
}

/** Build the frozen CREATE payload. This task only ever saves a draft. */
export function buildCreatePayload(draft: PostEditorDraft) {
  return draft.type === "KOLOM"
    ? AdminColumnCreatePayloadSchema.safeParse({
        ...columnBasePayload(draft),
        publication: { intent: "SAVE_DRAFT" },
      })
    : AdminPostCreatePayloadSchema.safeParse({
        ...basePayload(draft),
        publication: { intent: "SAVE_DRAFT" },
      });
}

/** Build the frozen UPDATE payload. */
export function buildUpdatePayload(
  draft: PostEditorDraft,
  postId: string,
  expectedVersion: number,
) {
  return draft.type === "KOLOM"
    ? AdminColumnUpdatePayloadSchema.safeParse({
        postId,
        expectedVersion,
        ...columnBasePayload(draft),
      })
    : AdminPostUpdatePayloadSchema.safeParse({
        postId,
        expectedVersion,
        ...basePayload(draft),
      });
}

/**
 * Build the frozen AUTOSAVE payload. Identical mutable fields to UPDATE plus the AUTOSAVE_DRAFT
 * intent; the transport persists the draft without changing its publication status and bumps the
 * version, so autosave must always send the *current* shared `expectedVersion`.
 */
export function buildAutosavePayload(
  draft: PostEditorDraft,
  postId: string,
  expectedVersion: number,
) {
  return draft.type === "KOLOM"
    ? AdminColumnAutosavePayloadSchema.safeParse({
        intent: "AUTOSAVE_DRAFT",
        postId,
        expectedVersion,
        ...columnBasePayload(draft),
      })
    : AdminPostAutosavePayloadSchema.safeParse({
        intent: "AUTOSAVE_DRAFT",
        postId,
        expectedVersion,
        ...basePayload(draft),
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
