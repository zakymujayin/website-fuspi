# Handoff — M3-CLAUDE-POST-RICH-TEXT

- **Branch:** `ai/claude/m3-post-rich-text`  •  **Base:** integration `4ed1066`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Summary

Replaces the plain `content` textarea in the Post editor with a Tiptap rich-text editor. **No
dependency change** — `@tiptap/react`, `@tiptap/starter-kit` (which bundles Link/Underline/heading/
lists/blockquote/code in v3) were already installed. Presentation only; the server sanitizes on write
(`sanitizeRichTextHtml`), so the toolbar is UX, not a security boundary.

## Files

- `src/components/admin/posts/post-rich-text-field.tsx` — `RichTextField` (StarterKit, headings 2–4,
  `immediatelyRender: false`, `useEditorState` for toolbar active state). Toolbar exposes only formats
  the sanitizer keeps: bold, italic, H2, H3, bullet/ordered list, blockquote, code.
- `post-editor-form.tsx` — the three content textareas (id/en/ar) become `RichTextField`; AR sets
  `dir="rtl"`.
- `messages/{id,en,ar}.json` — `AdminPostRichText` (toolbar labels); `AdminPostEditor.contentDescription`
  updated (rich text is now present).
- `src/app/globals.css` — (granted UI-token hotspot) no change needed; editor styling is via Tailwind
  `prose` classes on the editor attributes.
- `tests/m3/ui/admin-post-rich-text.test.tsx` — 11 tests.

## Deliberate scope

Toolbar is limited to the **sanitizer allowlist** (`src/lib/security/sanitize.ts`): no underline
(no `<u>`), no text-align, tables, images, or colours — they are stripped on write, so exposing them
would lose formatting silently. Link is deferred (needs a URL affordance); noted as follow-up.

## Verification

| Command | Result |
| --- | --- |
| `tsc` / `eslint` | exit 0 |
| `npm test` | **728 passed** |
| `npm run build` | Compiled successfully (Tiptap SSR builds clean) |

### Runtime (real browser + PostgreSQL)

Three editors (id/en/ar) render with toolbars, **0 page errors**. Typed text, applied **bold** and a
**bullet list**, saved. DB content persisted as sanitised HTML:

```html
<ul><li><p>Halo dunia <strong>tebalbutir satu</strong></p></li></ul>
```

`<strong>`, `<ul>`, `<li>`, `<p>` all survived the server sanitizer — rich formatting round-trips
editor → API → sanitizer → DB.

## Note for the eventual E2E (DeepSeek)

The content editors are `getByRole("textbox", { name: "Isi" })` (there are 3 — id/en/ar; use
`.first()`/`.nth()`). Toolbar buttons are named by `AdminPostRichText.tool.*` ("Tebal", "Miring", …).

## Out of scope / follow-ups

Link toolbar (URL affordance), image/media embeds in content, tables, autosave (separate manifest),
`globals.css` prose theming refinements.

## Requested contract/dependency change

None (Tiptap already present).
