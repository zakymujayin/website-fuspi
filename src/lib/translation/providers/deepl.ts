import type { TranslateRequest, TranslateResult, TranslationProvider } from "../types";

const DEEPL_TARGET_LANG: Record<"en" | "ar", string> = { en: "EN-US", ar: "AR" };

/**
 * DeepL API v2 (deepl.com/docs-api). Uses the free-tier host by default; set
 * `DEEPL_API_HOST` to `https://api.deepl.com` for a Pro key.
 */
export function createDeepLProvider(apiKey: string, host = "https://api-free.deepl.com"): TranslationProvider {
  return {
    name: "deepl",
    async translate(request: TranslateRequest): Promise<TranslateResult> {
      const keys = Object.keys(request.fields);
      const textKeys = keys.filter((key) => request.fields[key]!.format === "text");
      const htmlKeys = keys.filter((key) => request.fields[key]!.format === "html");
      const out: Record<string, string> = {};

      try {
        if (textKeys.length > 0) {
          const translated = await callDeepL(
            apiKey, host, textKeys.map((key) => request.fields[key]!.value), request.targetLocale, false,
          );
          textKeys.forEach((key, index) => { out[key] = translated[index] ?? ""; });
        }
        if (htmlKeys.length > 0) {
          const translated = await callDeepL(
            apiKey, host, htmlKeys.map((key) => request.fields[key]!.value), request.targetLocale, true,
          );
          htmlKeys.forEach((key, index) => { out[key] = translated[index] ?? ""; });
        }
        return { ok: true, fields: out };
      } catch (error) {
        if (error instanceof UnsupportedLanguageError) {
          return { ok: false, code: "UNSUPPORTED_LANGUAGE", message: error.message };
        }
        return { ok: false, code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "DeepL request failed." };
      }
    },
  };
}

class UnsupportedLanguageError extends Error {}

async function callDeepL(
  apiKey: string,
  host: string,
  texts: readonly string[],
  targetLocale: "en" | "ar",
  isHtml: boolean,
): Promise<string[]> {
  const response = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "ID",
      target_lang: DEEPL_TARGET_LANG[targetLocale],
      ...(isHtml ? { tag_handling: "html" } : {}),
    }),
  });

  if (response.status === 400 || response.status === 456) {
    const body = await response.text().catch(() => "");
    if (/target_lang/i.test(body)) throw new UnsupportedLanguageError(`DeepL does not support target language "${targetLocale}".`);
    throw new Error(`DeepL request rejected (${response.status}): ${body}`);
  }
  if (!response.ok) {
    throw new Error(`DeepL request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { translations?: Array<{ text: string }> };
  if (!Array.isArray(data.translations)) throw new Error("DeepL returned an unexpected response shape.");
  return data.translations.map((item) => item.text);
}
