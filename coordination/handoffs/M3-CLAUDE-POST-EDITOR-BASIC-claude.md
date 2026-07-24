# Handoff — M3-CLAUDE-POST-EDITOR-BASIC

- **Task ID:** `M3-CLAUDE-POST-EDITOR-BASIC`
- **Branch:** `ai/claude/m3-post-editor-basic`
- **Base SHA:** `75d45dd`
- **Author:** Claude Sonnet 5, standing in for the Claude lane while Codex and DeepSeek are out of
  usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Independence caveat — strongest so far

This is the **first mutation surface** in the project: it touches CSRF, optimistic locking, and
ownership. The manifest names GPT as reviewer and DeepSeek as tester; neither could run. The same
model wrote it, tested it, and merged it. Codex should re-review this task specifically before M3
exit. Runtime evidence below is reproducible.

## Summary

Basic Berita authoring: create a draft and edit an existing post. Adds **no server behaviour** —
submits to the already-merged `POST /api/admin/posts` boundary using the frozen `CREATE`/`UPDATE`
commands and loads through `getAdminPostEditor`.

## Files changed

- `src/app/[locale]/admin/posts/new/page.tsx` — create route (Server Component)
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx` — edit route
- `src/components/admin/posts/post-editor-form.tsx` — the Client Component form
- `src/components/admin/posts/post-editor-payload.ts` — draft → frozen payload builders
- `src/components/admin/posts/post-editor-view.ts` — editor view → draft projection
- `src/components/admin/posts/post-editor-errors.ts` — failure-code → message-key mapping
- `src/components/admin/posts/post-editor-labels.ts` — server-resolved label bundle
- `src/components/ui/textarea.tsx`, `src/components/ui/checkbox.tsx` — added via
  `npx shadcn@latest add`; both build on the already-installed `@base-ui/react`. **No dependency
  change** (`package.json`/`package-lock.json` untouched — verified).
- `messages/{id,en,ar}.json` — additive `AdminPostEditor` namespace
- `tests/m3/ui/admin-post-editor.test.tsx` — 41 tests

## Carried-field preservation (the correctness risk this task carried)

`AdminPostUpdatePayloadSchema` requires `categoryId`, `coverMediaId`, and `tagIds` on every update,
but this form edits none of them and no category/tag/media picker exists. Sending `null`/`[]` would
have silently erased them. The edit page therefore round-trips the loaded values unchanged.

Proven twice:

- **Unit:** three tests fail if the round-trip is broken (verified by mutating
  `categoryId: carried.categoryId` → `null`; 3 of 41 tests failed, then reverted).
- **Runtime:** attached a real category, ran an update through the API with the round-tripped value,
  and confirmed `categoryId` survived (`ed-cat` before → `ed-cat` after, version 3 → 4).

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx vitest run tests/m3/ui/admin-post-editor.test.tsx` | PASS — 41/41 |
| `npm test` | PASS — 45 files, 669 passed, 0 failed |
| `npm run build` | PASS — both routes registered |
| `git diff --check` | clean |

### Runtime evidence against the real mutation boundary

Dev server + isolated PostgreSQL, three synthetic users (ADMIN, EDITOR-A, EDITOR-B):

| Case | Result |
| --- | --- |
| CREATE as EDITOR-A, same-origin | `ok`, version 1, status `DRAFT` |
| CREATE cross-origin (`Origin: https://evil.example`) | `CSRF_INVALID` |
| CREATE with no session cookie | `SESSION_INVALID` |
| UPDATE with correct `expectedVersion` | `ok`, version 2 |
| UPDATE with **stale** `expectedVersion` | `VERSION_CONFLICT` |
| **EDITOR-B updating EDITOR-A's post** | `NOT_FOUND` — no existence disclosure |
| ADMIN updating EDITOR-A's post | `ok` |
| Edit page prefill | slug and current title rendered in the form |
| `/ar/admin/posts/new` | `dir="rtl"` with genuine Arabic copy |

All fixtures were deleted afterwards; database and worktree left clean.

## Known gap — the editor is not reachable from the UI yet

`src/app/[locale]/admin/posts/page.tsx` (the list) is **not** in this task's `allowed_paths`, so no
"Write news" button or per-row "Edit" link was added. Both routes work by direct URL only. The
list's existing test also asserts the read-only list renders no mutation affordance, and that test
file is outside this lease too. Wiring navigation needs its own small task — see follow-ups. I chose
not to widen my own lease mid-task, since that is exactly the discipline the process exists to keep.

## Operational note discovered during testing

`isSameOriginRequest` compares the request `Origin` against `AUTH_URL`. With
`AUTH_URL=http://localhost:3004`, a browser session opened on `http://127.0.0.1:3004` fails every
mutation with `CSRF_INVALID` — the host must match exactly, not merely resolve to the same machine.
Correct behaviour, but a real deployment/dev footgun worth documenting in the env contract.

## Untested areas and risks

- **No browser E2E for the editor.** All runtime evidence above is API-level plus page-render
  checks; there is no Playwright suite driving the actual form. That is the top follow-up.
- Client-side validation mirrors the shared Zod schemas, but the server remains the authority; no
  test asserts the two stay in step if the contract changes.
- `content` is a plain textarea. It accepts raw HTML that the server sanitizes; the editor gives no
  preview or guardrail, so a non-technical author sees markup.
- Autosave, publish/schedule/archive, delete, and pickers remain unbuilt by design.

## Follow-ups

1. Wire navigation: "Write news" on the list page and a per-row "Edit" link (needs the list page and
   its test in the lease).
2. Playwright E2E for create/edit including the `VERSION_CONFLICT` reload path and EDITOR ownership.
3. Rich-text editor for `content`.
4. Category/tag/media pickers — until then the round-trip above is load-bearing.

## Requested contract/dependency change

None.
