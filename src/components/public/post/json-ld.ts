export type NewsArticleJsonLdInput = {
  url: string;
  headline: string;
  description: string | null;
  imageUrl: string | null;
  datePublished: string;
  authorName: string | null;
};

/**
 * Escaped NewsArticle JSON-LD (manifest detail requirement 5). Only ever
 * receives plain text and already-validated public URLs — never raw article
 * HTML or a storage key.
 */
export function buildNewsArticleJsonLd(input: NewsArticleJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {"@type": "WebPage", "@id": input.url},
    headline: input.headline,
    datePublished: input.datePublished,
    ...(input.description ? {description: input.description} : {}),
    ...(input.imageUrl ? {image: [input.imageUrl]} : {}),
    ...(input.authorName ? {author: {"@type": "Person", name: input.authorName}} : {}),
  };
}

export type BreadcrumbItem = {name: string; url: string};

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Serializes JSON-LD for a `<script>` tag without letting the payload break
 * out of it — `<` becomes an escape sequence so `</script>` inside any text
 * field (title, excerpt) cannot terminate the tag early.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
