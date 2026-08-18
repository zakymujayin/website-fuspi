import type { AdminPostEditorView } from "@/contracts/post-admin";

import { EMPTY_COLUMN_TRANSLATION, type ColumnEditorDraft, type ColumnTypeValue } from "./column-editor-payload";

/**
 * Projects the admin editor view onto the Kolom form draft. `AdminPostEditorViewSchema.columnType`
 * is frozen to `z.null()` today (see the task handoff) so this always reads `null` until that
 * schema is generalized — this mapper is otherwise ready as soon as it is.
 */
export function draftFromColumnEditorView(view: AdminPostEditorView): ColumnEditorDraft {
  const translations = view.translations;

  return {
    slug: view.slug,
    isFeatured: view.isFeatured,
    columnType: view.columnType as ColumnTypeValue | null,
    coverMediaId: view.coverMediaId,
    translations: {
      id: {
        title: translations.id.title,
        excerpt: translations.id.excerpt ?? "",
        content: translations.id.content,
      },
      en: translations.en
        ? {
            title: translations.en.title,
            excerpt: translations.en.excerpt ?? "",
            content: translations.en.content,
          }
        : { ...EMPTY_COLUMN_TRANSLATION },
      ar: translations.ar
        ? {
            title: translations.ar.title,
            excerpt: translations.ar.excerpt ?? "",
            content: translations.ar.content,
          }
        : { ...EMPTY_COLUMN_TRANSLATION },
    },
  };
}
