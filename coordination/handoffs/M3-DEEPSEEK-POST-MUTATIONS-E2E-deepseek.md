# Handoff — M3-DEEPSEEK-POST-MUTATIONS-E2E

- **Task:** M3-DEEPSEEK-POST-MUTATIONS-E2E (browser E2E hardening of the post-editor mutation surfaces)
- **Branch:** `ai/deepseek/m3-post-mutations-qa`
- **Base SHA:** `6e42d70` (integration/m3-reference-slice with the task manifest)
- **Head SHA:** `3b02adc`
- **Author:** Claude, standing in for DeepSeek during the 2026-07-23…07-29 usage-limit window (ADR-0002). No independent review yet.

## Summary

Closed the M3 exit criterion "executable mutation browser evidence" for every post-editor
mutation surface added after the basic editor, and repaired the existing editor cases that the
Tiptap rich-text merge had silently broken.

Single file changed: `e2e/m3/admin-post-editor.spec.ts` (+248 / −11), 8 → 15 test bodies
(× chromium + mobile = 30 runs).

### New coverage (7 tests)

1. **Publish now** — DRAFT → PUBLISHED, `publishedAt <= now()`, version 1 → 2.
2. **Schedule** — future `datetime-local` → PUBLISHED with `publishedAt > now()`; a past/empty time is
   rejected client-side with no request.
3. **Archive + return-to-draft** — PUBLISHED → ARCHIVED → DRAFT.
4. **Delete** — AlertDialog confirm → row gone, `ActivityLog` row with `metadata.operation = "DELETE"`,
   navigation back to the list.
5. **Cover picker** — choose the fixture image → `coverMediaId` set; re-open, clear → `coverMediaId` null.
6. **Rich-text bold** — type text, select all, bold via the toolbar → stored `content` matches
   `/<strong>[^<]*TEKSTEBAL[^<]*<\/strong>/` after server sanitization.
7. **Autosave shared version** — dirty the draft, wait the real 30s interval (status → `saved`,
   version 1 → 2), then a **manual save succeeds 2 → 3 with no `VERSION_CONFLICT`** — the load-bearing
   proof that `PostEditorShell` shares one version across autosave and manual save.

All new mutations reuse the existing `editorA` fixture: the RBAC matrix grants EDITOR POST
`PUBLISH`/`SCHEDULE`/`DELETE` on **own** posts, so no new shared user is created or deleted. Same
advisory lock and `cleanupAll()` as the existing suite.

## Defects this task surfaced (all real, all fixed in the spec)

Writing this suite exposed three defects that no unit test and no manual browser probe had caught,
because **CI does not run Playwright** and the earlier "browser-verified" claims for rich-text and
autosave were one-off manual probes, not this suite:

1. **Rich-text merge broke the existing editor E2E — `"Judul"` label collision.**
   `getByLabel("Judul")` began resolving to **3 elements**: the title input plus the rich-text
   toolbar buttons `"Judul tingkat 2"` / `"Judul tingkat 3"` (substring match). Every create/edit
   case that filled the title (originals #1, #3, #4, #5 and new #15) failed with a strict-mode
   violation. Fixed by matching `"Judul"` (and the other labels) with `{ exact: true }`.
2. **Rich-text merge broke the AR RTL assertion.** The Arabic content field is now a Tiptap
   `[role=textbox]` contenteditable, not a `<textarea>`, so `input[dir=rtl], textarea[dir=rtl]`
   counted 2 instead of 3. Fixed by also counting `[role='textbox'][dir='rtl']`.
3. **Auth cookie was coupled to `localhost`.** The spec hardcoded `domain: "localhost"`, but the
   Playwright config default baseURL is `http://127.0.0.1:3004`; a `localhost` cookie is never sent
   to `127.0.0.1`, so every admin route redirected to the login page. Fixed by binding the cookie to
   the resolved base URL (`{ name, value, url: BASE_URL }`).

None of these are product defects in the mutation code — they are test/DOM-contract drift from the
rich-text merge plus a latent host coupling. The mutation code itself behaved correctly once the
suite drove it against the right host.

## How to run (host matters)

```bash
# From the worktree, with the QA .env.local loaded for DATABASE_URL:
set -a && . ./.env.local && set +a
PLAYWRIGHT_BASE_URL=http://localhost:3004 \
  npx playwright test e2e/m3/admin-post-editor.spec.ts --workers=1
```

`PLAYWRIGHT_BASE_URL=http://localhost:3004` is **required**: `isSameOriginRequest`
(`src/lib/auth/runtime/csrf.ts`) compares the request `Origin` to `AUTH_URL`
(`http://localhost:3004`). Navigating at the config's `127.0.0.1` default sends a mismatched Origin
and every mutation is rejected `CSRF_INVALID`. The suite must run where the browser host equals
`AUTH_URL`'s host.

## Results

- `npx tsc --noEmit` — **0 errors**.
- `npx playwright test e2e/m3/admin-post-editor.spec.ts --workers=1` (chromium + mobile) against
  `localhost:3004` — **30/30 passed** (1.9m). Verified twice; the first combined run flaked test #14
  (bold applied but the first keystrokes were dropped by a type-while-refocusing race → stored
  `STEBAL`), fixed by typing first then select-all + bold; the re-run was a clean 30/30.

## Untested areas / risks / follow-ups

- **Local-only host requirement.** CI does not run Playwright, so this evidence is local. The
  `127.0.0.1` config default vs `AUTH_URL=localhost` mismatch is a pre-existing GPT-lane config
  inconsistency (`playwright.config.ts` is outside this task's allowed paths); worth reconciling so
  the suite passes on the config default without an env override.
- **Other admin specs share the two host couplings** (`admin-media-library-browse.spec.ts`,
  `admin-post-list-browse.spec.ts` both hardcode `domain: "localhost"`). Not touched — out of this
  task's allowed paths. They should get the same cookie fix in their own tasks.
- The autosave test spends a real 30s per project; it sets a 120s test timeout. No fake clock was
  used to avoid a React-scheduler interaction.
- **Independence.** Authored and self-reviewed by the Claude stand-in. DeepSeek and Codex must
  re-verify on return before this counts toward the M3 exit gate.

## Contract / dependency changes

None. Test-only change; no schema, API, dependency, or config change.
