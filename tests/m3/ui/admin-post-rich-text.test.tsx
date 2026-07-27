import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/components/admin/posts/post-rich-text-field.tsx"),
  "utf8",
);
const sanitizer = readFileSync(
  path.join(process.cwd(), "src/lib/security/sanitize.ts"),
  "utf8",
);

// Formats the toolbar exposes → the sanitizer tag they produce.
const TOOL_TO_TAG: Record<string, string> = {
  bold: "strong",
  italic: "em",
  h2: "h2",
  h3: "h3",
  bulletList: "ul",
  orderedList: "ol",
  blockquote: "blockquote",
  code: "code",
};

describe("rich-text toolbar stays within the server sanitizer allowlist", () => {
  it("every exposed format maps to a tag the sanitizer keeps", () => {
    for (const [tool, tag] of Object.entries(TOOL_TO_TAG)) {
      expect(source, `toolbar should expose ${tool}`).toContain(`"${tool}"`);
      expect(sanitizer, `sanitizer should allow <${tag}>`).toMatch(
        new RegExp(`"${tag}"`),
      );
    }
  });

  it("does not expose formats the sanitizer strips (underline, text-align, image, table)", () => {
    expect(source).not.toMatch(/toggleUnderline|Underline/);
    expect(source).not.toMatch(/textAlign|setTextAlign/);
    expect(source).not.toMatch(/setImage|insertTable/);
  });
});

describe("editor configuration", () => {
  it("limits headings to the sanitizer's allowed levels", () => {
    expect(source).toContain("heading: { levels: [2, 3, 4] }");
  });

  it("disables immediate render for Next SSR safety", () => {
    expect(source).toContain("immediatelyRender: false");
  });

  it("writes HTML back to the draft on every change", () => {
    expect(source).toContain("current.getHTML()");
    expect(source).toContain("onChange");
  });

  it("gives the editor an accessible textbox role and label", () => {
    expect(source).toContain('role: "textbox"');
    expect(source).toContain('"aria-label": ariaLabel');
  });

  it("sets dir=rtl on the content area when requested (Arabic)", () => {
    expect(source).toContain("...(dir ? { dir } : {})");
  });

  it("marks the active format with aria-pressed", () => {
    expect(source).toContain("aria-pressed={isActive}");
  });

  it("uses no physical-direction utility", () => {
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });
});

describe("editor form wiring and i18n", () => {
  const form = readFileSync(
    path.join(process.cwd(), "src/components/admin/posts/post-editor-form.tsx"),
    "utf8",
  );

  it("uses RichTextField for content and passes RTL for Arabic", () => {
    expect(form).toContain("<RichTextField");
    expect(form).toContain('dir={locale === "ar" ? "rtl" : undefined}');
    expect(form).toContain("updateTranslation(locale, \"content\", html)");
  });

  it("defines the same AdminPostRichText keys in id, en, ar with real Arabic", () => {
    const flatten = (v: unknown, p = ""): string[] =>
      typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, c]) => flatten(c, p ? `${p}.${k}` : k))
        : [p];
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminPostRichText).sort();
    });
    expect(id.length).toBeGreaterThan(8);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);
    const ar_ = JSON.parse(readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"))
      .AdminPostRichText;
    expect(ar_.tool.bold).toMatch(/[؀-ۿ]/);
  });
});
