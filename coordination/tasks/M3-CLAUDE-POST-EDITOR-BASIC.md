---
id: M3-CLAUDE-POST-EDITOR-BASIC
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: d08d6fd
allowed_paths:
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/**"
  - "src/components/ui/textarea.tsx"
  - "src/components/ui/checkbox.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-EDITOR-BASIC-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "src/proxy.ts"
  - ".github/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "src/contracts/post.ts"
  - "src/contracts/post-admin.ts"
  - "src/lib/content/post-admin-transport.ts"
  - "src/app/api/admin/posts/route.ts"
  - "src/components/ui/input.tsx"
  - "src/components/ui/field.tsx"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-ADMIN-LIST
  - M3-DEEPSEEK-POST-ADMIN-LIST-QA
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: high
token_class: L
status: ready
---

# M3 Claude Post Editor — basic create/edit

Deliver the **minimum** Berita authoring surface: create a draft and edit an existing post. This is
the first mutation UI in the project, so scope is deliberately narrow and every excluded capability
below stays excluded until its own manifest.

## Scope

1. `/[locale]/admin/posts/new` — create form. Publication intent is **`SAVE_DRAFT` only**.
2. `/[locale]/admin/posts/[postId]/edit` — edit form, loaded through the frozen
   `getAdminPostEditor` transport.
3. Fields: `slug`, `isFeatured`, and translations — Indonesian `title`/`excerpt`/`content`
   required, English and Arabic optional.
4. Submit as JSON to the **existing** `POST /api/admin/posts` boundary using the frozen
   `CREATE` / `UPDATE` commands. Do not add a route handler, server action, or any other mutation
   entry point.
5. Optimistic locking: send `expectedVersion` from the loaded editor view and surface
   `VERSION_CONFLICT` as a clear, non-technical message telling the editor to reload.
6. Map every `AdminPostTransportFailureCodeSchema` code to translated, non-technical copy. Never
   render a raw code, stack, or transport detail.
7. Validate client-side with the shared Zod payload schemas before submitting; the server remains
   the authority.

## Round-trip requirement (correctness, not optional)

`AdminPostUpdatePayloadSchema` requires `categoryId`, `coverMediaId`, and `tagIds` on **every**
update. There is no category/tag/media picker in this task and no category-list transport exists.
The edit form must therefore **round-trip the loaded values unchanged** — sending `null`/`[]` would
silently erase an existing category, cover image, or tags. Create sends `categoryId: null`,
`coverMediaId: null`, `tagIds: []`. Cover a regression test for this.

## Explicitly out of scope

Autosave, publish-now, scheduling, archive, delete, rich-text/Tiptap editing, media picker, tag
picker, category picker, SEO fields (`metaTitle`/`metaDesc`/`coverCaption`), and revision history.
`content` is a plain multi-line field in this task.

## Constraints

- No dependency change. `@base-ui/react` is already installed; new UI primitives must build on it or
  on native elements. If a control genuinely needs a new package, stop and raise a GPT contract task.
- Server Components by default; the form itself is a Client Component.
- Forms use `FieldGroup` + `Field`; controls keep the 40px height contract.
- Logical direction utilities only; Arabic must render RTL from the first implementation.
- Do not expose author email, session token, or technical errors.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). This is the **highest-risk task
attempted without independent review so far** — it is the first mutation surface, touching CSRF,
optimistic locking, and ownership. Approval by the stand-in carries the standing independence
caveat, and this task in particular should be re-reviewed by Codex before M3 exit.
