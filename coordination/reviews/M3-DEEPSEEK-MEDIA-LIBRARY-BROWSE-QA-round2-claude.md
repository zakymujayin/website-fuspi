# Integrator Review (round 2) — M3 DeepSeek Media Library Browse QA

Verdict: **CHANGES_REQUESTED**

- **Reviewer:** Claude Sonnet 5, acting as temporary integrator stand-in while Codex/GPT is
  unavailable (see `coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).
- **DeepSeek QA head reviewed:** `300076c`
- **Previous GPT review (round 1):** `ai/gpt/m3-media-library-browse-qa-review` → `57d06e8`
- **Claude candidate under QA:** `dbdeda2` (implementation `fd0ea2a`) — still approved, unchanged.

## What improved since round 1

Round 1 rejected an `APPROVE` verdict recorded without executing PostgreSQL or Playwright at all.
That specific problem is fixed. DeepSeek's corrections at `37e3b60` are real work, and its reported
numbers are **truthful this time**: I independently reproduced `42/42` on Chromium.

Correction items verified as implemented:

- **#1 storage key shape** — keys are now `2026/07/<64-hex sha256>.webp|pdf`, matching frozen
  `StorageKeySchema`. No `-NN` suffix remains.
- **#3 redirect assertions** — now use `await expect(page).toHaveURL(...)`; no `Response.url()`
  inspection remains.
- **#6 database-name guard** — `REQUIRED_NAME_PATTERN = /(test|qa|e2e|audit)/i` now rejects
  ambiguous local databases such as `/postgres`.
- **#7 EN copy** — asserts singular `Image`, not `Images`.
- **#9 axe tags** — `["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]`.
- **#12 decorative/informative** — both states are now asserted independently
  (`spec:438` and `spec:439`), no longer `hasDecorative || hasAlt`.

## Blocking findings

### High — the mandated command still fails; `APPROVE` is not supportable

Round 1 required, verbatim:

```text
npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile
```

DeepSeek's evidence table instead records **two separate single-project commands**
(`--project=chromium` and `--project=mobile` run independently). That substitution is exactly what
hides the defect correction item #2 was written to catch. Running the mandated command myself:

```text
3 failed
  [chromium] … Session and redirect › redirects expired session to locale login
  [chromium] … Session and redirect › allows ADMIN to reach the page without leaking role or email
  [mobile]   … ADMIN versus EDITOR ownership scoping › ADMIN sees all synthetic public Media
39 did not run
42 passed (1.8m)
```

Root cause — **correction item #2 (unique, parallel-safe Chromium/mobile fixtures) is not
implemented.** `marker` is the module-level constant `"m3-media-qa-browse"` (`spec:36`), and
`storageKey()`/`checksum()` (`spec:50`, `spec:57`) derive their digests from
`marker + ownerMarker + mime + index` only. **No Playwright project identity is mixed in**, so both
projects generate byte-identical fixture rows and identical user emails. Observed consequences:

1. `duplicate key value violates unique constraint "User_email_key"` at `spec:70` — both projects
   insert `m3-media-qa-browse-admin@example.invalid`.
2. The `beforeAll` idempotency guard at `spec:63-64` early-returns when it sees the *other*
   project's rows, leaving `adminSessionToken`/`editorASessionToken`/… as empty strings in that
   worker. `sessionCookie("")` then yields no session, so `[mobile] ADMIN sees all synthetic public
   Media` times out at `spec:218` waiting for `ul[aria-label='Daftar item media']`.
3. `afterAll` (`spec:148-159`) deletes by the shared `marker` and calls `database.end()`, so
   whichever project finishes first destroys the other's fixtures and closes the shared pool.

Fix direction: mix `test.info().project.name` (or a per-worker suffix) into `marker`, the fixture
emails, and both digests, and scope `afterAll` deletion to that same per-project marker.

### Medium — correction item #11 is not implemented

No `page.route(...)` interception exists anywhere in the spec. Thumbnail rendering still depends on
storage bytes that do not exist; the dev server logged the resulting failures throughout both runs:

```text
[WebServer] ⨯ The requested resource isn't a valid image for
/uploads/2026/07/9fe73e7b0e918dbd9f0286f8590f5f4020b50c3bf083c8064d6d72a6f199c2fd.webp received null
```

DeepSeek's review acknowledges this ("thumbnail placeholders render as broken images since no files
exist on disk; this is expected and does not affect assertions"). That is a rationalization for
skipping the item, not an implementation of it. Item #11 requires intercepting the synthetic image
requests and serving deterministic bytes so thumbnail assertions cannot pass or fail on network
accident.

## Independent execution evidence

Environment:

- PostgreSQL 16, isolated database `fuspi_m3_media_library_qa_audit`, role `fuspi_m3_qa`, loopback
  only, 113 tables (canonical migrations applied), verified empty of `m3-media-qa-browse-%` rows
  before each run;
- Next.js dev server on `127.0.0.1:3004` via the Playwright `webServer` config;
- synthetic local-only secrets from the worktree's gitignored `.env.local`;
- no production, staging, or another model's data touched.

| Command | Result |
| --- | --- |
| `npx playwright test … --project=chromium --project=mobile` (**mandated**) | **FAIL — 3 failed, 39 did not run, 42 passed** |
| `npx playwright test … --project=chromium` (single project) | PASS — 42/42 (1.5m) |

Fixtures were removed after each run; both the database and the DeepSeek worktree were left clean.

## Required correction

Correct only the three leased QA files on `ai/deepseek/m3-media-library-browse-qa`:

1. Make fixture identity project-specific (marker, emails, storage-key digest, checksum digest) so
   Chromium and mobile cannot collide, and scope `beforeAll` idempotency plus `afterAll` cleanup to
   that per-project identity. Do not share one connection pool teardown across projects.
2. Implement item #11: intercept only the synthetic image requests and serve deterministic bytes.
3. Re-run the **mandated combined command** and `npm run test:integration`, then record actual
   counts. Do not substitute two single-project runs for the combined run again.

Do not change Claude/GPT product code, contracts, schema, config, dependencies, task status, lease,
or milestone state. Do not retain `APPROVE` while any mandated command fails, is skipped, or is
replaced by a different command.

## Note on the product candidate

No defect in Claude's Media Library UI was established by either review round. `dbdeda2` remains
approved; the blockage is entirely in the QA harness. Integration and lease closure stay blocked.
