import DOMPurify from "isomorphic-dompurify";

const MAX_RICH_TEXT_INPUT_BYTES = 1_048_576;
const SANITIZATION_ERROR_MESSAGE = "Unable to sanitize content.";

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "caption",
  "code",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
] as const;

const ALLOWED_ATTRIBUTES = [
  "alt",
  "colspan",
  "dir",
  "height",
  "href",
  "lang",
  "loading",
  "rel",
  "rowspan",
  "scope",
  "src",
  "title",
  "width",
] as const;

function isSafeResourceReference(attribute: string, rawValue: string): boolean {
  const value = rawValue.trim();
  if (value !== rawValue || value.startsWith("//")) return false;
  if (value.startsWith("/") || (attribute === "href" && value.startsWith("#"))) return true;

  if (attribute === "src") return /^https:\/\//i.test(value);
  return /^(?:https:|mailto:|tel:)/i.test(value);
}

export class ContentSanitizationError extends Error {
  constructor() {
    super(SANITIZATION_ERROR_MESSAGE);
    this.name = "ContentSanitizationError";
  }
}

export function sanitizeRichTextHtml(input: unknown): string {
  try {
    if (typeof input !== "string") {
      throw new ContentSanitizationError();
    }
    if (Buffer.byteLength(input, "utf8") > MAX_RICH_TEXT_INPUT_BYTES) {
      throw new ContentSanitizationError();
    }

    const fragment = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [...ALLOWED_TAGS],
      ALLOWED_ATTR: [...ALLOWED_ATTRIBUTES],
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
      FORBID_CONTENTS: ["script", "style", "svg", "math", "template"],
      FORBID_TAGS: [
        "base",
        "embed",
        "form",
        "iframe",
        "input",
        "link",
        "math",
        "meta",
        "object",
        "script",
        "style",
        "svg",
        "template",
      ],
      RETURN_DOM_FRAGMENT: true,
      RETURN_TRUSTED_TYPE: false,
    }) as unknown as DocumentFragment;

    for (const element of fragment.querySelectorAll<HTMLElement>("[href], [src]")) {
      for (const attribute of ["href", "src"] as const) {
        const value = element.getAttribute(attribute);
        if (value !== null && !isSafeResourceReference(attribute, value)) {
          element.removeAttribute(attribute);
        }
      }
    }

    const container = fragment.ownerDocument.createElement("div");
    container.append(fragment);
    return container.innerHTML;
  } catch {
    throw new ContentSanitizationError();
  }
}

export function protectCsvFormulaCell(value: string): string {
  if (/^(?:\uFEFF|[\t\r\n]|[\u0020\u00a0]*[=+\-@])/u.test(value)) {
    return `'${value}`;
  }
  return value;
}
