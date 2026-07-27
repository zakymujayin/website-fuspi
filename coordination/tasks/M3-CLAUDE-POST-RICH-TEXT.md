---
id: M3-CLAUDE-POST-RICH-TEXT
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: a6316a6
allowed_paths:
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-rich-text-field.tsx"
  - "src/app/globals.css"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-rich-text.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-RICH-TEXT-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/09-fitur-cms-editor.md"
  - "src/contracts/post.ts"
  - "src/lib/security/sanitize.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: medium
token_class: L
status: ready
---

# M3 Claude Post rich-text editor

Replace the plain `content` textarea in the Post editor with a Tiptap rich-text editor. `@tiptap/react`,
`@tiptap/starter-kit`, and `@tiptap/extension-link` are **already installed** — no dependency change.
Presentation only; the server already sanitizes on write (`sanitizeRichTextHtml`).

## Scope

1. A `RichTextField` client component wrapping Tiptap `useEditor` with StarterKit (headings limited to
   2–4) + Link. `immediatelyRender: false` for Next SSR safety.
2. A toolbar exposing only formats the server sanitizer keeps (`src/lib/security/sanitize.ts`
   ALLOWED_TAGS): bold, italic, H2, H3, bullet list, ordered list, blockquote, code, link. **Do not**
   offer underline, text-align, tables, images, or colours — they are stripped on write.
3. The field is controlled by the draft's per-locale `content` (HTML string): initialise from the
   loaded value, and on change write `editor.getHTML()` back to the draft. Replace the three content
   textareas (id/en/ar) in `post-editor-form.tsx` with this field.
4. Arabic authoring is RTL: the AR editor's content area sets `dir="rtl"`. Logical direction utilities
   only; toolbar controls keep the 40px height contract and use `aria-pressed` for active state.
5. Minimal, scoped editor styles may go in `globals.css` (the UI-token hotspot this task is granted);
   keep them additive and semantic.

## Out of scope

Images/media embeds in content, tables, YouTube, autosave (separate), markdown paste rules beyond
StarterKit defaults, collaborative editing.

## Correctness / security note

The editor output is HTML; the server sanitizes it on every write, so the client toolbar is UX, not
a security boundary. Keep the toolbar within the allowlist so authors do not lose formatting silently.

## Verification

Unit-test the extension configuration and toolbar-to-allowlist alignment (source assertions), and
that AR sets dir=rtl. Lint/typecheck/npm test/build. Single-page browser check: open the editor, type
+ bold + a bullet list, save, confirm the sanitized HTML persisted. Do not run the full e2e directory
locally.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). Standing independence caveat; re-review on return.
