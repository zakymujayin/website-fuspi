export type TranslationTargetLocale = "en" | "ar";

export type TranslationField = {
  /** Plain text (title, excerpt) vs sanitized rich HTML (content). */
  format: "text" | "html";
  value: string;
};

export type TranslateRequest = {
  targetLocale: TranslationTargetLocale;
  fields: Record<string, TranslationField>;
};

export type TranslateSuccess = {
  ok: true;
  fields: Record<string, string>;
};

export type TranslateFailure = {
  ok: false;
  code: "NOT_CONFIGURED" | "PROVIDER_ERROR" | "UNSUPPORTED_LANGUAGE";
  message?: string;
};

export type TranslateResult = TranslateSuccess | TranslateFailure;

export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslateRequest): Promise<TranslateResult>;
}
