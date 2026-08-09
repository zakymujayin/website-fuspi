---
id: M3-GPT-EDITOR-COVER-VIEW-FIX
milestone: M3
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: 40095b1
allowed_paths:
  - "src/lib/content/post-admin-transport.ts"
  - "tests/m3/runtime/post-admin-transport.integration.test.ts"
  - "coordination/handoffs/M3-GPT-EDITOR-COVER-VIEW-FIX-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/app/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/media.ts"
  - "src/contracts/post-admin.ts"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - git diff --check
risk: high
token_class: M
status: ready
---

# M3 GPT editor cover-view fix

## Severe defect: the Post editor cannot open any post that has a cover image

`getAdminPostEditor` returns `{ok:false, code:"NOT_FOUND"}` for every post whose
`coverMediaId` is set. The edit page then shows the "unavailable" notice instead of the form, so
**no cover-bearing post is editable**.

Isolated at runtime (integration head, real PostgreSQL):

```text
GET /api/admin/posts/<post-with-cover>    -> {"ok":false,"code":"NOT_FOUND"}
GET /api/admin/posts/<same-post,cover=NULL> -> full editor view
```

## Root cause

`safeCover` in `src/lib/content/post-admin-transport.ts`:

```ts
const parsed = PublicMediaViewSchema.safeParse({...media, url: `${uploadBase}/${media.storageKey}`});
```

`media` carries `storageKey` and `storageClass`. `PublicMediaViewSchema` (src/contracts/media.ts)
is `.strict()` and declares neither field, so the spread's extra keys make `safeParse` fail →
`safeCover` returns `null` → `AdminPostEditorViewSchema`'s superRefine fires
"Missing safe cover view" → the whole editor view fails validation → `getAdminPostEditor` maps it
to `NOT_FOUND`.

Why it was latent: no test exercised `getAdminPostEditor` on a post **with** a cover, and the
editor UI was only ever manually checked with cover-less drafts.

## Required fix

Pass `PublicMediaViewSchema` exactly the fields it declares — do not spread `storageKey` /
`storageClass` into a strict schema. e.g. destructure and build the view object explicitly:

```ts
const {id, mimeType, size, alt, isDecorative, width, height} = media;
const parsed = PublicMediaViewSchema.safeParse({
  id, mimeType, size, alt, isDecorative, width, height,
  url: `${uploadBase}/${media.storageKey}`,
});
```

Do not relax `PublicMediaViewSchema` to `.passthrough()` — strictness is the contract; the caller
is wrong, not the schema. Do not change `src/contracts/**`.

## Required test (this is the gap that hid the bug)

Add a case to `tests/m3/runtime/post-admin-transport.integration.test.ts` that:
- creates an EDITOR-owned Berita with a valid PUBLIC cover Media (storageKey
  `YYYY/MM/<64hex>.webp`, alt non-null, width/height set);
- calls `getAdminPostEditor` and asserts `ok === true`, `cover !== null`,
  `cover.id === coverMediaId`, and that `cover` carries **no** `storageKey`/`storageClass`;
- keep the existing cover-less path covered too.

## Verification

- `RUN_PLATFORM_DB_TESTS=true npm test` green, including the new case.
- Browser/runtime: a cover-bearing post's edit page renders the form (not the unavailable notice).
  Record the raw evidence.

## Stand-in note

Codex is out of usage limit (ADR-0002). This is a GPT platform-lane defect found by DeepSeek's editor
QA (`M3-DEEPSEEK-POST-EDITOR-QA`), whose round-trip test cannot pass until this is fixed. Re-review
by Codex on return.
