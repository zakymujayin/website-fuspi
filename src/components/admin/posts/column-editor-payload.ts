import { z } from "zod";

import {
  ColumnTypeSchema,
  PostCreateInputSchema,
  PostUpdateInputSchema,
} from "@/contracts/post";

export type ColumnEditorLocale = "id" | "en" | "ar";
export const COLUMN_EDITOR_LOCALES: readonly ColumnEditorLocale[] = ["id", "en", "ar"];
export const COLUMN_TYPES = ["DEKAN", "DOSEN", "MAHASISWA"] as const satisfies readonly z.infer<
  typeof ColumnTypeSchema
>[];
export type ColumnTypeValue = (typeof COLUMN_TYPES)[number];

/** One locale's editable text. Kept flat so the form state maps 1:1 onto inputs. */
export type ColumnEditorTranslationDraft = {
  title: string;
  excerpt: string;
  content: string;
};

export type ColumnEditorDraft = {
  slug: string;
  isFeatured: boolean;
  /** Nullable in state so an empty selection is representable; the CREATE/UPDATE payload builders
   *  reject null before ever reaching the contract, since KOLOM always requires one. */
  columnType: ColumnTypeValue | null;
  coverMediaId: string | null;
  translations: Record<ColumnEditorLocale, ColumnEditorTranslationDraft>;
};

export const EMPTY_COLUMN_TRANSLATION: ColumnEditorTranslationDraft = {
  title: "",
  excerpt: "",
  content: "",
};

export function emptyColumnDraft(): ColumnEditorDraft {
  return {
    slug: "",
    isFeatured: false,
    columnType: null,
    coverMediaId: null,
    translations: {
      id: { ...EMPTY_COLUMN_TRANSLATION },
      en: { ...EMPTY_COLUMN_TRANSLATION },
      ar: { ...EMPTY_COLUMN_TRANSLATION },
    },
  };
}

export function hasColumnTranslationContent(draft: ColumnEditorTranslationDraft): boolean {
  return draft.title.trim().length > 0
    || draft.excerpt.trim().length > 0
    || draft.content.trim().length > 0;
}

function toColumnTranslationInput(draft: ColumnEditorTranslationDraft) {
  const excerpt = draft.excerpt.trim();
  return {
    title: draft.title.trim(),
    excerpt: excerpt.length > 0 ? excerpt : null,
    content: draft.content,
  };
}

function toColumnTranslationsInput(draft: ColumnEditorDraft) {
  const translations: Record<string, ReturnType<typeof toColumnTranslationInput>> = {
    id: toColumnTranslationInput(draft.translations.id),
  };
  for (const locale of ["en", "ar"] as const) {
    if (hasColumnTranslationContent(draft.translations[locale])) {
      translations[locale] = toColumnTranslationInput(draft.translations[locale]);
    }
  }
  return translations;
}

/**
 * Builds the CREATE payload against the frozen, resource-agnostic `PostCreateInputSchema`
 * (`@/contracts/post`) — not the admin-transport-narrowed `AdminPostCreatePayloadSchema`, which
 * only declares BERITA's mutable fields. This is deliberate: `PostCreateInputSchema` already fully
 * supports `type: "KOLOM"` + `columnType` (including the "KOLOM requires columnType" rule), so this
 * is real, meaningful validation against the actual domain contract — not a stand-in. It produces
 * exactly the shape `createPost()` expects; the admin HTTP transport (`/api/admin/posts`) simply
 * cannot carry it yet (see the task handoff), which is why the form gates the network submission
 * rather than wiring it to a call that would either reject or misclassify the record.
 */
export function buildColumnCreatePayload(draft: ColumnEditorDraft) {
  return PostCreateInputSchema.safeParse({
    type: "KOLOM",
    columnType: draft.columnType,
    slug: draft.slug.trim(),
    isFeatured: draft.isFeatured,
    categoryId: null,
    coverMediaId: draft.coverMediaId,
    tagIds: [],
    translations: toColumnTranslationsInput(draft),
    publication: { intent: "SAVE_DRAFT" },
  });
}

/** Builds the UPDATE payload the same way — see `buildColumnCreatePayload`. */
export function buildColumnUpdatePayload(
  draft: ColumnEditorDraft,
  postId: string,
  expectedVersion: number,
) {
  return PostUpdateInputSchema.safeParse({
    postId,
    expectedVersion,
    type: "KOLOM",
    columnType: draft.columnType,
    slug: draft.slug.trim(),
    isFeatured: draft.isFeatured,
    categoryId: null,
    coverMediaId: draft.coverMediaId,
    tagIds: [],
    translations: toColumnTranslationsInput(draft),
  });
}
