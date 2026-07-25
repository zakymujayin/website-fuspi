# Handoff — M3-GPT-EDITOR-COVER-VIEW-FIX

- **Branch:** `ai/gpt/m3-editor-cover-view-fix`  •  **Base:** integration `dc05ad0`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in for the GPT lane).

## Severe defect (found by DeepSeek editor QA's round-trip case)

`getAdminPostEditor` returned `{ok:false, code:"NOT_FOUND"}` for **every** post with a
`coverMediaId`. The editor edit page then showed the "unavailable" notice, so no cover-bearing post
could be opened for editing.

Isolated at runtime (real PostgreSQL, integration head):

```text
GET /api/admin/posts/<post-with-cover>       -> {"ok":false,"code":"NOT_FOUND"}
GET /api/admin/posts/<same-post, cover NULL> -> full editor view
```

## Root cause

`safeCover` in `src/lib/content/post-admin-transport.ts`:

```ts
const parsed = PublicMediaViewSchema.safeParse({...media, url: `${uploadBase}/${media.storageKey}`});
```

`media` carries `storageKey` and `storageClass`; `PublicMediaViewSchema` is `.strict()` and declares
neither, so the spread's extra keys failed parsing → `safeCover` returned `null` →
`AdminPostEditorViewSchema`'s superRefine fired "Missing safe cover view" → the whole view failed →
mapped to `NOT_FOUND`. Latent because no test drove `getAdminPostEditor` on a cover-bearing post.

## Fix

Pass the strict schema only its declared fields (destructure, don't spread the whole row):

```ts
const {id, mimeType, size, alt, isDecorative, width, height} = media;
const parsed = PublicMediaViewSchema.safeParse({
  id, mimeType, size, alt, isDecorative, width, height,
  url: `${uploadBase}/${media.storageKey}`,
});
```

`PublicMediaViewSchema` was left `.strict()` — the caller was wrong, not the contract. No
`src/contracts/**` change.

## Regression test added

`tests/m3/runtime/post-admin-transport.integration.test.ts`: a new case creates an EDITOR-owned
Berita with a valid PUBLIC cover Media and asserts `getAdminPostEditor` returns `ok`, `cover` is
present with `cover.id === coverMediaId` and the expected `/uploads/...` url, and that the safe view
carries **no** `storageKey`/`storageClass`.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run test:integration` | **83 passed** (was 82; +1 regression case) |
| `RUN_PLATFORM_DB_TESTS=true npm test` | 669 passed |

**Runtime (real browser + PostgreSQL) on the fix:**

```text
GET /api/admin/posts/<cover post> -> ok, cover keys = [alt,height,id,isDecorative,mimeType,size,url,width]
/id/admin/posts/<cover post>/edit -> h1 "Sunting Berita", form renders, title field = "Judul Cover"
```

No more `NOT_FOUND`, no storage internals in the cover view.

## Note

This unblocks the round-trip case in `M3-DEEPSEEK-POST-EDITOR-QA` (which uses a cover fixture to
prove carried-field preservation). Re-review by Codex on return.
