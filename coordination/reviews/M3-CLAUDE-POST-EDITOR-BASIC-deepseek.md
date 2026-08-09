# QA Review — M3 Claude Post Editor (basic create/edit)

Verdict: **APPROVE (after three product fixes this QA forced)**

- **QA author:** Claude Sonnet 5, standing in for the DeepSeek QA lane (ADR-0002).
- **Under test:** the basic Post editor (`/admin/posts/new`, `/admin/posts/[postId]/edit`,
  `PostEditorForm`) plus the frozen `getAdminPostEditor` transport.
- **Independence caveat:** the same model wrote the editor, wrote this QA, fixed the defects, and
  signed off. No independent party checked it. Every result below is reproducible; Codex must
  re-verify on return — especially the transport fix, a platform-lane change.

## This QA drove the real editor and found three product defects self-review had missed

The editor's original "verification" was API-level only (curl + grepping the streamed RSC payload),
so it never loaded the page. Driving the actual form in a browser exposed:

1. **RSC boundary crash** (Claude lane, fixed `M3-CLAUDE-POST-EDITOR-RSC-FIX`). The pages passed a
   labels object of functions into the client form; RSC cannot serialize functions, so every load
   rendered "This page couldn't load".
2. **No navigation after save** (Claude lane, fixed `M3-CLAUDE-POST-EDITOR-NAV-FIX`). The form used
   `next/navigation`'s router with an unprefixed `/admin/posts`; with `localePrefix: "always"` a
   successful save left the editor stranded on `/new`.
3. **`NOT_FOUND` for every cover-bearing post** (GPT lane, fixed `M3-GPT-EDITOR-COVER-VIEW-FIX`).
   `safeCover` spread `storageKey`/`storageClass` into the strict `PublicMediaViewSchema`; the
   editor could not open any post with a cover image. A regression case was added to
   `tests/m3/runtime/post-admin-transport.integration.test.ts` (integration 82 → 83).

## Result after the fixes

The mandated combined command passes 8 cases × 2 projects = **16/16**:

```text
PLAYWRIGHT_BASE_URL=http://localhost:3004 \
  npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile
→ 16 passed (35.0s)
chromium alone → 8 passed (28.0s)
```

## Coverage (8 cases)

- create draft via the form → row written, lands on the localized list;
- client validation (empty ID title / invalid slug) → per-field error + form alert, no POST sent;
- `VERSION_CONFLICT` on a concurrently bumped version → translated form-level message;
- `SLUG_CONFLICT` attached to the slug field, not the form alert;
- **carried-field round-trip:** edit only the title on a post with category + cover + tag; assert in
  the DB that `categoryId`, `coverMediaId`, and the tag are unchanged (this case is what surfaced
  defect #3);
- EDITOR-B opening EDITOR-A's edit route → unavailable notice, never the populated form, never a
  missing-vs-not-yours distinction;
- Arabic content fields carry `dir="rtl"`;
- no author email / session token / `Prisma`/`DATABASE_URL` disclosure in the editor DOM.

## Harness constraints handled (from the task's READ FIRST)

- The `AUTH_URL=localhost` vs Playwright `127.0.0.1` origin mismatch is resolved by running with
  `PLAYWRIGHT_BASE_URL=http://localhost:3004` and setting the session cookie `domain` to `localhost`.
- Field ids are `useId()`-generated, so content fields are targeted via
  `getByRole("group", { name: /Bahasa Indonesia/ }).getByLabel("Judul")` — the three content
  sections (id/en/ar) each carry a "Judul" label.

## Honest scope limit (recorded, not faked)

The basic editor only saves drafts (`SAVE_DRAFT`), so stored-XSS-through-the-form-to-public-render
is not reachable here. Server-side sanitization on write is proven by
`tests/m3/runtime/post-mutations.integration.test.ts`; safe public render by
`e2e/m3/public-post-experience.spec.ts`.

## Operational caveat

The suite serializes its two Playwright projects on advisory lock `883112045` and raises the
`beforeAll` hook timeout to 300s to wait for the other project. If a run is **killed** (SIGKILL)
mid-flight, the lock and some fixtures can leak until a connection reset — inherent to session-level
advisory locks, not a suite defect.
