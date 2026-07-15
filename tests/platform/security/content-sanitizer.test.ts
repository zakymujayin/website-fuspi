import {describe, expect, it} from "vitest";

import {
  ContentSanitizationError,
  protectCsvFormulaCell,
  sanitizeRichTextHtml,
} from "@/lib/security/sanitize";

describe("rich-text output sanitizer", () => {
  it("preserves a minimal semantic institutional-content allowlist", () => {
    const input = [
      '<h2 dir="rtl" lang="ar">عنوان</h2>',
      "<p><strong>Strong</strong> <em>emphasis</em> <u>underline</u></p>",
      "<blockquote>Quote</blockquote><ul><li>One</li></ul>",
      '<a href="https://fuspi.example/path" title="Reference" rel="external">Link</a>',
      '<img src="/media/photo.webp" alt="Description" width="640" height="360" loading="lazy">',
      '<table><caption>Data</caption><thead><tr><th scope="col">A</th></tr></thead>',
      '<tbody><tr><td colspan="1">B</td></tr></tbody></table>',
      "<pre><code>const safe = true;</code></pre>",
    ].join("");

    const output = sanitizeRichTextHtml(input);
    expect(output).toContain('<h2 dir="rtl" lang="ar">عنوان</h2>');
    expect(output).toContain("<strong>Strong</strong>");
    expect(output).toContain('<a href="https://fuspi.example/path"');
    expect(output).toContain('<img src="/media/photo.webp"');
    expect(output).toContain("<table>");
    expect(output).toContain("<pre><code>");
  });

  it.each([
    ["script", '<p>before<script>alert(1)</script>after</p>'],
    ["mixed script", '<ScRiPt src="https://evil.invalid/x.js"></ScRiPt><p>safe</p>'],
    ["event handler", '<img src="/safe.webp" onerror="alert(1)">'],
    ["javascript link", '<a href="java&#x73;cript:alert(1)">click</a>'],
    ["data image", '<img src="data:image/svg+xml,<svg onload=alert(1)>">'],
    ["SVG", '<svg><a href="javascript:alert(1)"><text>attack</text></a></svg>'],
    ["MathML", '<math><mtext><img src=x onerror=alert(1)></mtext></math>'],
    ["iframe", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["object", '<object data="https://evil.invalid/payload"></object>'],
    ["form", '<form action="https://evil.invalid"><input name="secret"></form>'],
    ["style", '<p style="background:url(javascript:alert(1))">text</p>'],
    ["meta", '<meta http-equiv="refresh" content="0;url=https://evil.invalid">'],
    ["template", '<template><img src=x onerror=alert(1)></template>'],
  ])("neutralizes %s payloads", (_label, input) => {
    const output = sanitizeRichTextHtml(input);
    expect(output).not.toMatch(/<script|javascript:|data:image|onerror|srcdoc|<svg|<math|<iframe|<object|<form|<input|style=|<meta|<template/i);
  });

  it("removes unknown attributes and active URL schemes", () => {
    const output = sanitizeRichTextHtml([
      '<a href="vbscript:msgbox(1)" target="_blank" onclick="attack()" data-id="1">bad</a>',
      '<a href="//evil.invalid/path">protocol relative</a>',
      '<a href="/id/berita#detail">internal</a>',
      '<a href="#section">fragment</a>',
      '<a href="mailto:unit@example.invalid">mail</a>',
      '<p class="attacker" aria-label="hidden">text</p>',
    ].join(""));

    expect(output).not.toMatch(/vbscript:|target=|onclick=|data-id=|\/\/evil|class=|aria-label=/i);
    expect(output).toContain('href="/id/berita#detail"');
    expect(output).toContain('href="#section"');
    expect(output).toContain('href="mailto:unit@example.invalid"');
  });

  it("is idempotent and repairs malformed markup deterministically", () => {
    const once = sanitizeRichTextHtml('<p><strong>safe<p><img src=x onerror="attack()">');
    const twice = sanitizeRichTextHtml(once);
    expect(twice).toBe(once);
    expect(once).not.toContain("onerror");
  });

  it("uses one non-reflective error for invalid or oversized input", () => {
    for (const input of [null, {html: "<script>secret()</script>"}, "x".repeat(1_048_577)]) {
      try {
        sanitizeRichTextHtml(input);
        throw new Error("Expected sanitization to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(ContentSanitizationError);
        expect(error).toMatchObject({
          name: "ContentSanitizationError",
          message: "Unable to sanitize content.",
        });
        expect(String(error)).not.toMatch(/script|secret|1048577/i);
      }
    }
  });
});

describe("CSV formula injection protection", () => {
  it.each([
    '=HYPERLINK("https://evil.invalid")',
    "+SUM(1,2)",
    "-2+3",
    "@SUM(1,2)",
    "\t=cmd",
    "\r=cmd",
    "\n=cmd",
    "\uFEFF=cmd",
    "  =cmd",
    "\u00a0@cmd",
  ])("prefixes a dangerous cell: %j", (value) => {
    expect(protectCsvFormulaCell(value)).toBe(`'${value}`);
  });

  it.each([
    "FUSPI",
    "2026-07-15",
    "42",
    " https://fuspi.example",
    " already safe text",
    "'=@already-escaped",
    "",
  ])("preserves a safe cell: %j", (value) => {
    expect(protectCsvFormulaCell(value)).toBe(value);
  });
});
