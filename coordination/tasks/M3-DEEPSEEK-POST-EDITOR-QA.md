---
id: M3-DEEPSEEK-POST-EDITOR-QA
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: d7faca1
allowed_paths:
  - "e2e/m3/admin-post-editor.spec.ts"
  - "coordination/reviews/M3-CLAUDE-POST-EDITOR-BASIC-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-EDITOR-QA-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
readonly_paths:
  - "AGENTS.md"
  - "e2e/m3/admin-post-list-browse.spec.ts"
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-payload.ts"
  - "src/contracts/post-admin.ts"
  - "src/lib/auth/runtime/csrf.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
  - M3-CLAUDE-POST-EDITOR-NAVIGATION
  - M3-DEEPSEEK-POST-LIST-FOCUS-ORDER
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile"
  - "npx playwright test e2e/m3/ --project=chromium --project=mobile"
  - git diff --check
risk: high
token_class: L
status: ready
---

# M3 DeepSeek Post editor QA

Independent PostgreSQL-backed browser QA of the basic Post editor
(`M3-CLAUDE-POST-EDITOR-BASIC`, `src/components/admin/posts/post-editor-form.tsx` and its two
routes). This is the **first mutation UI** and the last major unverified surface in the Post slice —
its only evidence so far is API-level and page-render checks, with no test driving the actual form.

## READ FIRST — two hard constraints that will otherwise waste the whole run

### 1. Origin/AUTH_URL mismatch breaks every form submit unless you fix the invocation

The form POSTs same-origin to `/api/admin/posts`. The server's `isSameOriginRequest` compares the
request `Origin` against `AUTH_URL`. In the QA env `AUTH_URL=http://localhost:3004`, but
`playwright.config.ts` navigates the browser to `http://127.0.0.1:3004`. Those origins differ, so a
browser form submit returns **`CSRF_INVALID`** and every create/update case fails.

You may **not** edit `.env*` or `playwright.config.ts`. Resolve it at invocation and inside the spec:

- run with `PLAYWRIGHT_BASE_URL=http://localhost:3004` so the browser navigates to the same host as
  `AUTH_URL`;
- set the auth session cookie `domain` to `localhost` (not `127.0.0.1`), or a cookie set for
  `127.0.0.1` will not be sent to `localhost` and the page will redirect to login.

Verify one successful create early. If a green form submit is genuinely unreachable without touching
a forbidden file, **stop and report** — that becomes a GPT config task (`AUTH_URL`/baseURL
alignment), not something to force.

### 2. Field ids are `useId()`-generated and unpredictable

Target controls by their label, not by id: `getByLabel("Judul")`, `getByLabel("Slug")`,
`getByLabel("Ringkasan")`, `getByLabel("Isi")`, the featured checkbox `getByLabel("Jadikan berita
unggulan")`, and submit by role/name `getByRole("button", { name: "Simpan draf" | "Simpan
perubahan" })`. The Indonesian editor heading is "Tulis Berita" (create) / "Sunting Berita" (edit).

## Required coverage

1. **Create success:** open `/id/admin/posts/new` as EDITOR-A, fill Indonesian title/excerpt/content
   and a valid slug, submit, and assert the browser lands back on `/id/admin/posts` and the new post
   appears in the list. Confirm the row was actually written (query the DB by your marker).
2. **Client validation:** submit with an empty Indonesian title (and/or an invalid slug like
   `Not Valid!`); assert a per-field error appears, the form-level alert shows the
   `VALIDATION_FAILED` copy, and **no network POST is sent** (client Zod rejects first). No raw code
   or stack in the DOM.
3. **Optimistic locking / `VERSION_CONFLICT`:** create a post, open its edit page, then mutate its
   `version` directly in the DB to simulate a concurrent edit, submit, and assert the translated
   `VERSION_CONFLICT` message appears (form-level, telling the editor to reload) with no data loss
   and no technical detail.
4. **Slug conflict:** create post A with a slug, then create post B with the same slug; assert the
   translated `SLUG_CONFLICT` message appears **attached to the slug field**, not the form alert.
5. **Edit round-trip preservation:** the editor cannot edit category/cover/tags. Create a post,
   attach a Category + coverMedia + a tag directly in the DB, open the edit page, change only the
   title, submit, and assert in the DB that `categoryId`, `coverMediaId`, and the tag row are
   **unchanged**. This is the load-bearing correctness guarantee of the basic editor.
6. **Ownership on the editor route:** EDITOR-B opening EDITOR-A's `/edit` URL must get the
   unavailable notice (the transport returns `NOT_FOUND`), never the populated form and never a
   distinction between "missing" and "not yours".
7. **AR authoring is RTL:** on `/ar/admin/posts/new`, the Arabic content fields carry `dir="rtl"`.
8. **No disclosure:** author email, session token, and `Prisma`/`DATABASE_URL` strings never appear
   in the editor DOM; the empty/unavailable notice is not `role="alert"` misused.

## Fixture and isolation rules (match the frozen harness)

- Enforce an isolated `test|qa|e2e|audit` database; refuse production/staging.
- Per-project markers so chromium and mobile never collide on `User_email_key` / `Post_slug_key`.
- **Share the same advisory lock key `883112045`** the other M3 browser suites use. This suite
  creates and edits real Post rows, so it must not run concurrently with a suite that asserts global
  ADMIN counts. Acquire in `beforeAll`, release after cleanup in `afterAll`/`finally`.
- Clean up every row you create (Posts, translations, tags, categories, media, users, sessions) in
  FK-safe order, even on assertion failure.

## Honest scope limit to record, not to fix

The basic editor only saves drafts (`SAVE_DRAFT`); it cannot publish. A draft is not publicly
visible, so **stored-XSS-through-the-form-to-public-render is not reachable here** and must not be
faked. Server-side sanitization on write is already proven by
`tests/m3/runtime/post-mutations.integration.test.ts`, and safe public render by
`e2e/m3/public-post-experience.spec.ts`. State this boundary in the review rather than inventing a
test that cannot exist yet.

## Deliverables and evidence rules

- One new spec `e2e/m3/admin-post-editor.spec.ts`, plus the review and handoff.
- Every claimed result MUST include pasted raw command output. Do not describe results you did not
  run. Any per-file inventory must be generated from source, not from memory.
- Before any run: `set -a && . ./.env.local && set +a`.
- Do not APPROVE if any required command is blocked, skipped, interrupted, or failing. Report actual
  counts from the mandated combined chromium+mobile run.
- Change only the three leased files. No product, contract, schema, message, or config change.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). The named reviewer/tester cannot
run; whoever executes this carries the standing independence caveat, and this task — QA of the first
mutation surface — should be re-verified by Codex on return before M3 exit.
