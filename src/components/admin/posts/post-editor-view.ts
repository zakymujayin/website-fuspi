import type { AdminPostEditorView } from "@/contracts/post-admin";

import { EMPTY_TRANSLATION, type PostEditorDraft } from "./post-editor-payload";

/**
 * Projects the frozen editor view onto the flat form draft. Optional locales and null excerpts
 * become empty strings so every control stays a controlled input; `toTranslationsInput` converts
 * them back to the contract's null/absent shape on submit.
 */
export function draftFromEditorView(view: AdminPostEditorView): PostEditorDraft {
  const translations = view.translations;

  return {
    slug: view.slug,
    isFeatured: view.isFeatured,
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
        : { ...EMPTY_TRANSLATION },
      ar: translations.ar
        ? {
            title: translations.ar.title,
            excerpt: translations.ar.excerpt ?? "",
            content: translations.ar.content,
          }
        : { ...EMPTY_TRANSLATION },
    },
  };
}
