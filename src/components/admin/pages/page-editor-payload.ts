import {
  PageCreateInputSchema,
  PageUpdateInputSchema,
} from "@/features/content/pages/contract";

export type PageEditorLocale = "id" | "en" | "ar";
export const PAGE_EDITOR_LOCALES: readonly PageEditorLocale[] = ["id", "en", "ar"];

export type PageEditorTranslationDraft = {
  title: string;
  content: string;
  metaTitle: string;
  metaDesc: string;
};

export type PageEditorDraft = {
  slug: string;
  parentId: string | null;
  heroMediaId: string | null;
  order: number;
  translations: Record<PageEditorLocale, PageEditorTranslationDraft>;
};

export const EMPTY_TRANSLATION: PageEditorTranslationDraft = {
  title: "",
  content: "",
  metaTitle: "",
  metaDesc: "",
};

export function emptyDraft(): PageEditorDraft {
  return {
    slug: "",
    parentId: null,
    heroMediaId: null,
    order: 0,
    translations: {
      id: { ...EMPTY_TRANSLATION },
      en: { ...EMPTY_TRANSLATION },
      ar: { ...EMPTY_TRANSLATION },
    },
  };
}

export function hasTranslationContent(draft: PageEditorTranslationDraft): boolean {
  return draft.title.trim().length > 0
    || draft.content.trim().length > 0
    || draft.metaTitle.trim().length > 0
    || draft.metaDesc.trim().length > 0;
}

function toTranslationInput(draft: PageEditorTranslationDraft) {
  const metaTitle = draft.metaTitle.trim();
  const metaDesc = draft.metaDesc.trim();
  return {
    title: draft.title.trim(),
    content: draft.content,
    metaTitle: metaTitle.length > 0 ? metaTitle : null,
    metaDesc: metaDesc.length > 0 ? metaDesc : null,
  };
}

function toTranslationsInput(draft: PageEditorDraft) {
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

export function buildCreatePayload(draft: PageEditorDraft) {
  return PageCreateInputSchema.safeParse({
    slug: draft.slug.trim(),
    parentId: draft.parentId?.trim() ?? null,
    heroMediaId: draft.heroMediaId?.trim() ?? null,
    order: draft.order,
    translations: toTranslationsInput(draft),
    publication: { intent: "SAVE_DRAFT" },
  });
}

export function buildUpdatePayload(
  draft: PageEditorDraft,
  pageId: string,
  expectedVersion: number,
) {
  return PageUpdateInputSchema.safeParse({
    pageId,
    expectedVersion,
    slug: draft.slug.trim(),
    parentId: draft.parentId?.trim() ?? null,
    heroMediaId: draft.heroMediaId?.trim() ?? null,
    order: draft.order,
    translations: toTranslationsInput(draft),
  });
}

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
