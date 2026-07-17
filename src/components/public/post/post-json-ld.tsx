import { serializeJsonLd } from "./json-ld";

type PostJsonLdProps = {
  data: Record<string, unknown>;
};

/** Renders one escaped `application/ld+json` script tag (manifest detail requirement 5). */
export function PostJsonLd({ data }: PostJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD requires raw text content; payload is escaped by serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
