# Handoff — M3-DEEPSEEK-POST-ADMIN-LIST-QA

- **Task ID:** `M3-DEEPSEEK-POST-ADMIN-LIST-QA`
- **Branch:** `ai/deepseek/m3-post-admin-list-qa`
- **Base SHA:** `cb78a3f`
- **Candidate under test:** `c93c5ae` (`M3-CLAUDE-POST-ADMIN-LIST`)
- **Author:** Claude Sonnet 5, standing in for the DeepSeek QA lane while Codex and DeepSeek are both
  out of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Independence caveat

Same model authored the UI under test, this QA harness, and the integrator sign-off. No independent
review. Reproduction command is in the review; re-verify on Codex/DeepSeek return before this counts
toward M3 exit.

## Summary

Added `e2e/m3/admin-post-list-browse.spec.ts`: a PostgreSQL-backed Playwright suite mirroring the
frozen Media Library QA harness (per-project markers, advisory-lock serialization, FK-safe cleanup)
for the read-only Post admin list. **Verdict: APPROVE.**

## Files changed

- `e2e/m3/admin-post-list-browse.spec.ts` — 40 cases × chromium + mobile = 80
- `coordination/reviews/M3-CLAUDE-POST-ADMIN-LIST-deepseek.md`
- `coordination/handoffs/M3-DEEPSEEK-POST-ADMIN-LIST-QA-deepseek.md`

## Verification

| Command | Result |
| --- | --- |
| `npx playwright test … --project=chromium --project=mobile` (**mandated**) | **PASS — 80/80** (1.8m) |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 628 passed, 75 skipped, 0 failed |
| `git diff --check` | clean |

First combined run failed 4 count-assertion cases — a **harness** selector bug
(`p:has-text("berita")` matched the description paragraph). Fixed with `getByText(/^\d+ berita$/)`;
the product counts were correct throughout. That the harness surfaced a real mismatch is evidence
the assertions bite against live data rather than passing vacuously.

## Environment

- PostgreSQL 16, isolated `fuspi_m3_media_library_qa_audit`, role `fuspi_m3_qa`, loopback only.
- Next.js dev server on `127.0.0.1:3004` via Playwright `webServer`.
- Synthetic local-only secrets from the gitignored `.env.local`.
- Fixtures and advisory locks verified absent from the DB after the run; worktree left clean.

## API / schema / migration impact

None. One new E2E spec plus two coordination docs. No product, contract, schema, dependency, config,
or message change.

## Untested areas and risks

- Read-only route: EDITOR **mutation** ownership/IDOR is not covered here and remains on the M3 exit
  list against the future editor UI.
- Advisory lock key `883112046` is distinct from the Media suite's `883112045`; a future suite
  sharing this database must pick yet another key or it will block.
- No visual-regression snapshots.

## Requested contract/dependency change

None.
