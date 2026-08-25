import type { TranslateRequest, TranslateResult, TranslationProvider } from "../types";

const TARGET_LANGUAGE_NAME: Record<"en" | "ar", string> = { en: "English", ar: "Modern Standard Arabic" };

/**
 * OpenAI chat completions used as a translator. Model is configurable via
 * `OPENAI_TRANSLATION_MODEL` (defaults to a small, cheap model); the prompt
 * instructs the model to preserve HTML tags untouched for `format: "html"` fields.
 */
export function createOpenAIProvider(apiKey: string, model = "gpt-4o-mini"): TranslationProvider {
  return {
    name: "openai",
    async translate(request: TranslateRequest): Promise<TranslateResult> {
      const keys = Object.keys(request.fields);
      const languageName = TARGET_LANGUAGE_NAME[request.targetLocale];
      const payload = keys.map((key) => ({
        key,
        format: request.fields[key]!.format,
        value: request.fields[key]!.value,
      }));

      const systemPrompt = [
        `You are a professional translator for a university Islamic-studies faculty website.`,
        `Translate each item's "value" from Indonesian to ${languageName}.`,
        `Keep the tone formal and academic. Do not add commentary.`,
        `For items with format "html", the value is sanitized HTML: preserve every HTML tag and attribute exactly, translate only the visible text content.`,
        `For items with format "text", return plain translated text with no HTML.`,
        `Respond with ONLY a JSON object mapping each input "key" to its translated string — no other text.`,
      ].join(" ");

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(payload) },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return { ok: false, code: "PROVIDER_ERROR", message: `OpenAI request failed (${response.status}): ${body}` };
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content;
        if (!content) return { ok: false, code: "PROVIDER_ERROR", message: "OpenAI returned no content." };

        const parsed = JSON.parse(content) as Record<string, string>;
        const out: Record<string, string> = {};
        for (const key of keys) {
          if (typeof parsed[key] !== "string") {
            return { ok: false, code: "PROVIDER_ERROR", message: `OpenAI response missing translation for "${key}".` };
          }
          out[key] = parsed[key];
        }
        return { ok: true, fields: out };
      } catch (error) {
        return { ok: false, code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "OpenAI request failed." };
      }
    },
  };
}
