export type SlideTranslation = {title: string; subtitle: string; ctaLabel: string};
export type SlideLocale = "id" | "en" | "ar";
export type SliderTranslationState = Record<SlideLocale, SlideTranslation>;

export const SLIDE_LOCALES: readonly SlideLocale[] = ["id", "en", "ar"];

export function readSliderTranslation(value: Partial<SlideTranslation> | undefined): SlideTranslation {
  return {
    title: typeof value?.title === "string" ? value.title : "",
    subtitle: typeof value?.subtitle === "string" ? value.subtitle : "",
    ctaLabel: typeof value?.ctaLabel === "string" ? value.ctaLabel : "",
  };
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalLocale(translation: SlideTranslation) {
  return translation.title.trim().length > 0
    || translation.subtitle.trim().length > 0
    || translation.ctaLabel.trim().length > 0;
}

function configuredCta(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return {kind: "INTERNAL" as const, href: trimmed};
  if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)) return {kind: "EXTERNAL" as const, href: trimmed};
  return {kind: "EXTERNAL" as const, href: `https://${trimmed}`};
}

export function buildHomeSliderEditorPayload(input: {
  imageMediaId: string;
  ctaHref: string;
  order: number;
  isVisible: boolean;
  translations: SliderTranslationState;
}) {
  const href = input.ctaHref.trim();
  const translations: Record<string, {title: string | null; subtitle: string | null; ctaLabel: string | null}> = {
    id: {
      title: nullableText(input.translations.id.title),
      subtitle: nullableText(input.translations.id.subtitle),
      ctaLabel: href ? nullableText(input.translations.id.ctaLabel) : null,
    },
  };
  for (const locale of ["en", "ar"] as const) {
    if (!optionalLocale(input.translations[locale])) continue;
    translations[locale] = {
      title: nullableText(input.translations[locale].title),
      subtitle: nullableText(input.translations[locale].subtitle),
      ctaLabel: href ? nullableText(input.translations[locale].ctaLabel) : null,
    };
  }

  return {
    imageMediaId: input.imageMediaId,
    cta: configuredCta(href),
    order: input.order,
    isVisible: input.isVisible,
    translations,
  };
}
