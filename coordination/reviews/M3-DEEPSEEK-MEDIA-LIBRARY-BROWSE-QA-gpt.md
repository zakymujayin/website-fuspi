# GPT Review — M3 DeepSeek Media Library Browse QA

Verdict: **CHANGES_REQUESTED**

- DeepSeek QA head: `ffd4f00efb4818338565843f6a23804ab960051c`
- DeepSeek spec/review commit: `435eb69`
- Claude candidate under QA: `dbdeda28152043cebe47bd9d0ce0c1754c21b612`
- Claude implementation: `fd0ea2a`

The Claude UI candidate remains GPT-approved. This verdict rejects the QA evidence/spec, not the
product UI: the required browser suite was never executed by DeepSeek and fails under independent
PostgreSQL-backed execution.

## High

### `coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md`

- `coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md:25` — verdict is `APPROVE` while
  the same document records both PostgreSQL integration and Playwright as BLOCKED/unexecuted. The
  manifest explicitly requires actual PostgreSQL-backed browser execution. Independent execution
  on local PostgreSQL 16 produced **5 failed, 1 interrupted, 74 did not run, and 2 passed** before
  repeated 30-second timeouts forced a controlled stop. Change the review/handoff to
  `CHANGES_REQUESTED` until every required command actually runs and passes; do not describe
  unexecuted cases with check marks.

## Medium

### `e2e/m3/admin-media-library-browse.spec.ts`

- `e2e/m3/admin-media-library-browse.spec.ts:90` and `:121` — storage keys append `-NN` after a
  64-hex checksum, violating frozen `StorageKeySchema` (`YYYY/MM/<64hex>.(webp|pdf)`). They are also
  identical across Chromium/mobile project setup, causing the observed PostgreSQL
  `Media_storageKey_key` duplicate-key failure. Derive one deterministic 64-hex digest from the
  project-specific marker + MIME + index and use the exact frozen key form.
- `e2e/m3/admin-media-library-browse.spec.ts:168` and `:182` — redirect assertions inspect the
  original navigation `Response.url()` rather than the settled page URL/UI. Both failed even when
  the route can render/redirect through Next navigation semantics. Assert `page` with
  `toHaveURL(/\/id\/login/)` plus the localized login heading/status after navigation.
- `e2e/m3/admin-media-library-browse.spec.ts:360` — invalid-query cases require hostile parameters
  to disappear from the browser URL, but the product contract normalizes server input without a
  canonical redirect. Assert canonical page-1/ALL content, count, active filter, ownership, and no
  reflection/technical disclosure; do not require URL mutation the implementation never promises.
- `e2e/m3/admin-media-library-browse.spec.ts:666` — the temporary empty owner/session is cleaned
  only after assertions. An assertion failure leaves rows behind. Track every auxiliary user/token
  in suite-level collections and clean them in `afterAll`/`finally`, including partial `beforeAll`
  failure. Make cleanup idempotent for both Playwright projects.
- `e2e/m3/admin-media-library-browse.spec.ts:13` — safety validation rejects production/staging
  strings but still accepts ambiguous local databases such as `/postgres`. Enforce an explicit
  test/qa/e2e/audit-scoped database name as required by the manifest.

## Low

### `e2e/m3/admin-media-library-browse.spec.ts`

- `e2e/m3/admin-media-library-browse.spec.ts:475` — English test looks for “Images”, while frozen
  copy is singular “Image”. Use role/name assertions against actual translated copy.
- `e2e/m3/admin-media-library-browse.spec.ts:580` — pressing Tab once lands on the existing skip
  link, not the first filter. Exercise the real keyboard order and verify a computed visible focus
  indicator, not only `toBeFocused()` twice.
- `e2e/m3/admin-media-library-browse.spec.ts:535` — axe tags omit the WCAG 2.1/2.2 AA tags used by
  existing project QA. Match the established `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` set.
- Fixture coverage does not include the required near-limit filename/alt text, and the image test
  relies on nonexistent storage bytes. Add one frozen-valid long-text row and deterministically
  intercept only synthetic image optimization/upload requests so thumbnail assertions do not pass
  or fail based on broken network images.
- Decorative/informative coverage currently accepts either state (`hasDecorative || hasAlt`);
  deterministic fixtures contain both, so require both.

## Independent execution evidence

Environment:

- isolated PostgreSQL 16 cluster on loopback port 55435;
- isolated database `fuspi_m3_media_library_qa_audit` with both canonical migrations;
- dev server from the DeepSeek worktree on port 3004;
- synthetic 64-byte auth/HMAC secrets and loopback upload URL;
- no production/staging data or credentials.

Command:

```text
npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile
```

Observed before controlled interruption:

- Chromium setup: duplicate `Media_storageKey_key` at line 109; remaining Chromium cases skipped.
- Mobile unauthenticated and expired-session assertions failed at lines 168/182.
- Mobile ADMIN/EDITOR grid cases timed out because invalid storage keys make the frozen Media result
  fail closed instead of producing a grid.
- Summary: 5 failed, 1 interrupted, 74 did not run, 2 passed; exit 130 after controlled interruption
  to avoid dozens of redundant 30-second timeouts.
- The temporary cluster was stopped and deleted after evidence capture. Working tree remained clean.

## Required correction

DeepSeek must correct only its three leased QA files on `ai/deepseek/m3-media-library-browse-qa`,
run both browser projects and the full integration suite against an isolated database until green,
then update review/handoff with actual counts and final SHA. Do not change Claude/GPT product code,
contracts, schema, config, dependencies, task status, lease, or milestone state. Do not retain
`APPROVE` if any required PostgreSQL/browser command is blocked, skipped, interrupted, or failing.
