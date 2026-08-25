import { createDeepLProvider } from "./providers/deepl";
import { createGoogleTranslateProvider } from "./providers/google";
import { createOpenAIProvider } from "./providers/openai";
import type { TranslationProvider } from "./types";

export type { TranslateRequest, TranslateResult, TranslationField, TranslationProvider, TranslationTargetLocale } from "./types";

/**
 * Provider-agnostic translation "socket": pick a provider by setting
 * `TRANSLATION_PROVIDER` to "deepl" | "openai" | "google" and `TRANSLATION_API_KEY`
 * to that provider's key. Leaving either unset disables the feature — callers
 * get `null` and must surface a "not configured" state, never a crash.
 */
export function getTranslationProvider(): TranslationProvider | null {
  const kind = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.TRANSLATION_API_KEY?.trim();
  if (!kind || !apiKey) return null;

  switch (kind) {
    case "deepl":
      return createDeepLProvider(apiKey, process.env.DEEPL_API_HOST?.trim() || undefined);
    case "openai":
      return createOpenAIProvider(apiKey, process.env.OPENAI_TRANSLATION_MODEL?.trim() || undefined);
    case "google":
      return createGoogleTranslateProvider(apiKey);
    default:
      return null;
  }
}
