import type { TranslateRequest, TranslateResult, TranslationProvider } from "../types";

/** Google Cloud Translation API v2 (basic, API-key based — not the v3 Advanced API). */
export function createGoogleTranslateProvider(apiKey: string): TranslationProvider {
  return {
    name: "google",
    async translate(request: TranslateRequest): Promise<TranslateResult> {
      const keys = Object.keys(request.fields);
      const textKeys = keys.filter((key) => request.fields[key]!.format === "text");
      const htmlKeys = keys.filter((key) => request.fields[key]!.format === "html");
      const out: Record<string, string> = {};

      try {
        if (textKeys.length > 0) {
          const translated = await callGoogle(
            apiKey, textKeys.map((key) => request.fields[key]!.value), request.targetLocale, "text",
          );
          textKeys.forEach((key, index) => { out[key] = translated[index] ?? ""; });
        }
        if (htmlKeys.length > 0) {
          const translated = await callGoogle(
            apiKey, htmlKeys.map((key) => request.fields[key]!.value), request.targetLocale, "html",
          );
          htmlKeys.forEach((key, index) => { out[key] = translated[index] ?? ""; });
        }
        return { ok: true, fields: out };
      } catch (error) {
        return { ok: false, code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "Google Translate request failed." };
      }
    },
  };
}

async function callGoogle(
  apiKey: string,
  texts: readonly string[],
  targetLocale: "en" | "ar",
  format: "text" | "html",
): Promise<string[]> {
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source: "id", target: targetLocale, format }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Translate request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { data?: { translations?: Array<{ translatedText: string }> } };
  const translations = data.data?.translations;
  if (!Array.isArray(translations)) throw new Error("Google Translate returned an unexpected response shape.");
  return translations.map((item) => item.translatedText);
}
