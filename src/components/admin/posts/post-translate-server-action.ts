"use server";

import { getTranslationProvider } from "@/lib/translation";
import { getRequestSession } from "@/lib/auth/runtime/request-session";

export type PostTranslateSource = {
  title: string;
  excerpt: string;
  content: string;
};

export type PostTranslateResult =
  | { ok: true; locale: "en" | "ar"; title: string; excerpt: string; content: string }
  | { ok: false; code: "NOT_CONFIGURED" | "PROVIDER_ERROR" | "UNSUPPORTED_LANGUAGE" | "SESSION_INVALID" | "VALIDATION_FAILED"; message?: string };

/**
 * Auto-translates one post draft's Indonesian text into the requested locale via
 * whichever provider `TRANSLATION_PROVIDER`/`TRANSLATION_API_KEY` selects
 * (see `@/lib/translation`). Returns `NOT_CONFIGURED` — never a crash — when no
 * provider is set up yet.
 */
export async function translatePostDraft(
  targetLocale: "en" | "ar",
  source: PostTranslateSource,
): Promise<PostTranslateResult> {
  const session = await getRequestSession();
  if (!session.ok) return { ok: false, code: "SESSION_INVALID" };
  if (!source.title.trim() || !source.content.trim()) return { ok: false, code: "VALIDATION_FAILED" };

  const provider = getTranslationProvider();
  if (!provider) return { ok: false, code: "NOT_CONFIGURED" };

  const fields: Record<string, { format: "text" | "html"; value: string }> = {
    title: { format: "text", value: source.title },
    content: { format: "html", value: source.content },
  };
  if (source.excerpt.trim()) fields.excerpt = { format: "text", value: source.excerpt };

  const result = await provider.translate({ targetLocale, fields });
  if (!result.ok) return result;

  return {
    ok: true,
    locale: targetLocale,
    title: result.fields.title ?? "",
    excerpt: fields.excerpt ? (result.fields.excerpt ?? "") : "",
    content: result.fields.content ?? "",
  };
}
