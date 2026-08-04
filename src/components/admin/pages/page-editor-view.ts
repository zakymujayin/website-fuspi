import type { AdminPageEditorView } from "@/contracts/page-admin";

import { EMPTY_TRANSLATION, type PageEditorDraft } from "./page-editor-payload";

export function draftFromEditorView(view: AdminPageEditorView): PageEditorDraft {
  const translations = view.translations;

  return {
    slug: view.slug,
    parentId: view.parentId,
    heroMediaId: view.heroMediaId,
    order: view.order,
    translations: {
      id: {
        title: translations.id.title,
        content: translations.id.content,
        metaTitle: translations.id.metaTitle ?? "",
        metaDesc: translations.id.metaDesc ?? "",
      },
      en: translations.en
        ? {
            title: translations.en.title,
            content: translations.en.content,
            metaTitle: translations.en.metaTitle ?? "",
            metaDesc: translations.en.metaDesc ?? "",
          }
        : { ...EMPTY_TRANSLATION },
      ar: translations.ar
        ? {
            title: translations.ar.title,
            content: translations.ar.content,
            metaTitle: translations.ar.metaTitle ?? "",
            metaDesc: translations.ar.metaDesc ?? "",
          }
        : { ...EMPTY_TRANSLATION },
    },
  };
}
