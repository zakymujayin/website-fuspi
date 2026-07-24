import type { PostEditorLabels } from "./post-editor-form";
import type { PostEditorLocale } from "./post-editor-payload";

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Resolves every editor string on the server so the Client Component receives plain text and never
 * a raw failure code. `errorFor` is pre-bound over the whole `error.*` namespace because the code is
 * only known after the request completes on the client.
 */
export function buildPostEditorLabels(t: Translator): PostEditorLabels {
  const localeName: Record<PostEditorLocale, string> = {
    id: t("locale.id"),
    en: t("locale.en"),
    ar: t("locale.ar"),
  };

  return {
    slug: t("slug"),
    slugDescription: t("slugDescription"),
    featured: t("featured"),
    featuredDescription: t("featuredDescription"),
    localeLegend: (locale: string) => t("localeLegend", { locale }),
    localeOptional: t("localeOptional"),
    title: t("title"),
    excerpt: t("excerpt"),
    content: t("content"),
    contentDescription: t("contentDescription"),
    submitCreate: t("submitCreate"),
    submitUpdate: t("submitUpdate"),
    submitting: t("submitting"),
    cancel: t("cancel"),
    localeName,
    errorFor: (key: string) => t(key),
  };
}
