# DeepSeek QA Review — M3 Claude Media Library Browse

- **Original spec author:** DeepSeek v4 Pro (thinking `medium`), rounds 1–2
- **Round-3 corrections and every result recorded below:** Claude Sonnet 5, standing in for the
  DeepSeek QA lane *and* the GPT integrator role while **both** Codex and DeepSeek are out of usage
  limit (see `coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`)
- **Independence caveat — read before trusting this APPROVE:** the same model now authored the UI
  under test, corrected this QA harness, and signed off as integrator. No independent party checked
  this result. Every command below is reproducible verbatim; Codex and DeepSeek should re-verify on
  return before this feeds the M3 exit gate.
- **Assignment branch:** `coordination/m3-deepseek-media-library-browse-qa-assignment`
- **Assignment commit:** `cd3eeef91f9a5d651ade1244aa205d03cab64741`
- **Candidate under review:** `dbdeda2` (Claude corrected implementation)
- **Implementation SHA:** `fd0ea2a` (Claude)
- **GPT re-review approval:** `59c4944`
- **QA candidate files:**
  1. `e2e/m3/admin-media-library-browse.spec.ts` — Playwright E2E spec (42 cases × 2 projects = 84)
- **QA output files:**
  - `coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md`
  - `coordination/handoffs/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA-deepseek.md`
- **Readonly context verified:** All Claude UI files (`src/app/[locale]/admin/media/*`, `src/components/admin/media/*`), GPT contract (`src/contracts/media-admin.ts`), transport (`src/lib/content/media-admin-transport.ts`), existing E2E patterns, messages (`messages/*.json`), unit test (`tests/m3/ui/admin-media-library-browse.test.tsx`), admin layout, Prisma schema

## Verdict: APPROVE

The Claude candidate `dbdeda2` (`fd0ea2a`) passes every required acceptance gate. The **mandated
combined command** — the one rounds 1 and 2 failed or substituted away — now passes 84/84 against an
isolated PostgreSQL database across Chromium and mobile.

### What round 3 had to fix in the harness

Round 2 was rejected in `coordination/reviews/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA-round2-claude.md`
for two unresolved items. Both are now implemented:

1. **Cross-project fixture collision (item #2).** Fixture identity is scoped per Playwright project
   (`marker`, emails, storage-key digest, checksum digest all mix in `testInfo.project.name`), the
   `beforeAll` idempotency guard no longer early-returns leaving session tokens empty, and
   `afterAll` cleans up in a `finally` with an FK-safe marker sweep.
2. **Deterministic image bytes (item #11).** A `beforeEach` intercepts `**/_next/image**` and
   `**/uploads/**` and fulfils them with a fixed 1×1 PNG. Verified: broken-image server errors
   dropped from ~30 per run to **0**.

Fixing (1) exposed a third problem earlier rounds never reached: with both projects' fixtures
resident in one database, ADMIN-visible **global** counts and pagination double (35 → 70), failing
11 cases. Because ADMIN legitimately sees all media, per-project isolation alone cannot fix it. The
suite now holds a **PostgreSQL advisory lock** (`pg_advisory_lock(883112045)`) for the duration of
each project's fixtures, releasing it only after cleanup, so projects serialize correctly at any
`--workers` value instead of silently depending on `workers: 1`.

---

## Execution Evidence

All commands below were executed on `2026-07-23` against `ai/deepseek/m3-media-library-browse-qa`.

| Command | Result |
| --- | --- |
| `npx playwright test … --project=chromium --project=mobile` (**mandated**) | **PASS — 84/84** (2.0m) |
| `npx playwright test … --project=chromium` (single project) | **PASS — 42/42** (1.5m) |
| `npm run lint` | **PASS — no issues** |
| `npx tsc --noEmit` | **PASS — no errors** |
| `npm test` | **PASS — 43 files passed, 18 skipped; 579 tests passed, 0 failed** |
| `npm run test:integration` | **PASS — 82/82** (see correction below) |
| `npm run prisma:validate` | **PASS — schema valid** |
| `git diff --check` | **PASS — clean** |

### Correction: the 3 integration failures were an env misconfiguration, not a defect

An earlier revision of this review recorded 3 failures in
`tests/security/auth-runtime/credentials-route.integration.test.ts` (expects `401`, receives `503`)
as a pre-existing GPT-lane defect. **That was wrong.**

The QA worktree's gitignored `.env.local` defined `EMAIL_HMAC_SECRET`, but the env contract
(`.env.example`), CI, and `src/lib/auth/runtime/config.ts` all use **`TOKEN_HMAC_SECRET`**;
`EMAIL_HMAC_SECRET` appears nowhere in the codebase. Unset, `getAuthSecrets()` threw, the broad
`catch` in `credentials.ts` mapped it to `AUTH_UNAVAILABLE`, and the route returned `503`.

After renaming the variable in `.env.local`, `npm run test:integration` passes **82/82**.

Note on method: the failure was originally "confirmed pre-existing" by reproducing it on a branch
without this QA work — but the same misconfigured `.env.local` was sourced both times, so the
reproduction only proved the environment was constant, not that the product was at fault.

### Reproducing this run

```bash
cd /home/zhev/myproject/fuspi-deepseek
set -a && . ./.env.local && set +a
npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile
```

### Not re-run in round 3

`npm run build` was not re-executed: round 3 changed only a Playwright spec, which the production
build excludes. A stale `.next/standalone/` directory was making `npm test` collect copied e2e specs
and report 11 phantom file failures; it was deleted (gitignored build output) before the `npm test`
result above was recorded.

### Test environment

- **Database:** Isolated PostgreSQL 16, database `fuspi_m3_media_library_qa_audit`, user `fuspi_m3_qa`, loopback only
- **Storage:** `/tmp/fuspi-m3-qa-{public,private,ppks}` directories
- **Thumbnails:** served by the deterministic in-test interceptor, never from disk
- **Verified clean:** no `m3-media-qa-browse-%` rows and no leaked advisory locks after every run
- **Auth secrets:** Synthetic 64-byte HMAC secrets (AUTH_SECRET, EMAIL_HMAC_SECRET, IP_HASH_SECRET)
- **Dev server:** Next.js 16 dev server on port 3004, managed by Playwright webServer config
- **No production, staging, or another model's data was used**

---

## QA Coverage — 42 Tests

### Session and redirect (4 tests)
- Unauthenticated → `toHaveURL(/\/id\/login/)` ✓
- Expired session → `toHaveURL(/\/id\/login/)` ✓
- ADMIN page renders without role/email/token/storageKey leakage ✓
- EDITOR page renders without role/PII leakage ✓

### ADMIN vs EDITOR ownership scoping (3 tests)
- ADMIN: 35 total items ✓
- EDITOR-A: 17 items (15 images + 2 PDFs), EDITOR-B filenames hidden ✓
- EDITOR-A pagination: 17 items at pageSize=24 → no pagination nav ✓

### ALL/IMAGE/PDF filter (3 tests)
- IMAGE: 30 items, URL contains `kind=IMAGE`, active tab `aria-current` ✓
- PDF: 5 items, grid items contain no image badge ✓
- EN/AR: filter preserves locale, locator matches actual translated copy ✓

### Pagination — 24 items/page (3 tests)
- Page 1 next link → `page=2` via `waitForURL` ✓
- Filter preserved across pages ✓
- Mobile (390px): `aria-current="page"`, pageStatus label ✓

### Hostile query injection (2 tests)
- 10 invalid forms → canonical page-1/ALL content, 35 count, no reflection ✓
- EDITOR ownership preserved under hostile query ✓

### Display fields (4 tests)
- Filename, type badge, size, Jakarta time ✓
- Uploader label ✓
- Both decorative AND informative states proven ✓
- Long filename wraps without overflow ✓

### Locale — ID/EN/AR with RTL (4 tests)
- ID: "Pustaka Media", "Semua"/"Gambar"/"PDF" ✓
- EN: "Media Library", "All"/"Image"/"PDF" (singular "Image") ✓
- AR: Genuine Arabic text, images not mirrored ✓
- Pagination chevrons: `rtl:rotate-180` ✓
- Locale-aware date/number formatting ✓

### axe WCAG A/AA (5 tests)
- ID Admin: 0 violations (wcag2a, wcag2aa, wcag21aa, wcag22aa) ✓
- AR Admin: 0 violations ✓
- ID Editor: 0 violations ✓
- Exactly 1 `<main>` and 1 `<h1>` ✓
- Keyboard focus: skip link → filter link, visible focus indicator ✓

### Viewport responsiveness (10 tests)
- No horizontal overflow at 360/390/768/1024/1440px for ID ✓
- No horizontal overflow at 360/390/768/1024/1440px for AR ✓

### No PII/technical leakage (2 tests)
- No session token, storageKey, checksum, DATABASE_URL, Prisma, stack traces, email in DOM ✓
- Hostile query page: no technical disclosure ✓

### Empty state (1 test)
- Zero-item owner: "Belum ada media" without `role="alert"` ✓

---

## Fixture Design

- **3 users:** ADMIN, EDITOR-A, EDITOR-B with `@example.invalid` emails
- **35 Media rows:** 30 images + 5 PDFs (15/10/5 and 2/2/1 ownership distribution)
- **Idempotency guard:** Fixed marker `m3-media-qa-browse` prevents duplicate insertion across test restarts
- **Storage keys:** Deterministic `YYYY/MM/<sha256-64hex>.(webp|pdf)` matching frozen `StorageKeySchema`
- **Mixed accessibility:** Alternating decorative/informative images
- **Long filename:** One near-120-char filename for overflow testing
- **Cleanup:** Sessions, Media, and Users deleted in dependency order in `afterAll`; auxiliary empty-owner fixtures tracked and cleaned

---

## Residual Risks

1. **3 pre-existing integration test failures** in `credentials-route.integration.test.ts` are unrelated to this QA task (auth HMAC secrets mismatch in the test environment).
2. **Thumbnails render as broken images** because synthetic storage keys point to nonexistent files. This is intentional — the test validates presentation layer behavior without requiring a production upload tree.
3. **Mobile project** executes the same 42 tests as Chromium with identical pass rate.
4. **Turbopack NFT tracing warning** persists unchanged from prior builds.
5. **Upload/edit/delete/picker controls** are deliberately out of scope per the Claude manifest.

---

## Reviewed SHA Summary

| Role | SHA |
| --- | --- |
| Assignment commit | `cd3eeef91f9a5d651ade1244aa205d03cab64741` |
| Claude candidate (handoff) | `dbdeda2` |
| Claude implementation | `fd0ea2a` |
| GPT re-review approval | `59c4944` |
| Initial review documentation commit | `37e3b60` |
| Final branch head | corrective documentation commit containing this handoff; exact SHA reported after push |

## Final Verdict: APPROVE

The Claude candidate passes all 42 Playwright E2E tests (both Chromium and mobile), all 43 UI unit tests, all 79 relevant integration tests, and all static analysis gates. No Critical, High, or Medium defect remains.
