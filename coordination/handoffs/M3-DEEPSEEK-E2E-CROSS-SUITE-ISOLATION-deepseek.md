# Handoff — M3-DEEPSEEK-E2E-CROSS-SUITE-ISOLATION

- **Task ID:** `M3-DEEPSEEK-E2E-CROSS-SUITE-ISOLATION`
- **Branch:** `ai/deepseek/m3-e2e-cross-suite-isolation`
- **Base SHA:** `7efc60a`
- **Author:** Claude Sonnet 5, standing in while Codex and DeepSeek are out of usage limit
  (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Summary

Running the whole M3 browser directory in one invocation failed 12 cases. Every suite passed alone,
so this was **fixture interference, not a product defect**. Fixed by making all three M3 browser
suites share one PostgreSQL advisory lock.

| | Before | After |
| --- | --- | --- |
| `npx playwright test e2e/m3/ --project=chromium --project=mobile` | 12 failed, 212 passed | **224 passed, 0 failed** |

## Root cause

All three suites assert **global ADMIN-visible counts** against one shared database:

- `admin-media-library-browse` expected 35 Media, observed 36;
- `admin-post-list-browse` expected 26 Berita, observed 43;
- `public-post-experience` creates ~17 Posts, a Category, and a Media, holds them for its whole run,
  and took **no advisory lock at all**.

The two admin suites each serialized their own Playwright projects, but with **different keys**
(`883112045` and `883112046`), so they did not exclude each other, and nothing excluded the public
suite. Concurrent workers kept two suites' fixtures resident simultaneously.

The distinct-key decision made when `admin-post-list-browse` was added was wrong. That suite's own
handoff reasoned a different key "avoids cross-suite blocking" — but blocking is exactly what is
required here. Correcting the reasoning as well as the code: **any suite asserting a global count
against the shared database must share one lock.**

## Changes

- `e2e/m3/admin-post-list-browse.spec.ts` — key `883112046` → `883112045`, comment rewritten to
  state the shared-key rule.
- `e2e/m3/public-post-experience.spec.ts` — acquires the same lock in `beforeAll` (with the hook
  timeout raised to wait for another suite), and releases it in `afterAll` **after** cleanup, inside
  a `try`/`finally`. Its teardown body moved into a `cleanupFixtures()` helper so the `finally` can
  guarantee both cleanup and release; the stray `pool.end()` inside the cleanup body moved to the
  `finally`.

No assertion was weakened. The counts were always correct; the isolation was broken.

## Verification

| Command | Result |
| --- | --- |
| `npx playwright test e2e/m3/ --project=chromium --project=mobile` | **PASS — 224/224** (4.9m) |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | clean |

Database after the run: **0 Posts, 0 Media, 0 advisory locks** — full teardown confirmed.

## Separate finding (not fixed here — outside this lease)

Six `m2-route-*@example.test` `User` rows remain in the QA database. They are leaked by
`tests/security/auth-runtime/credentials-route.integration.test.ts`, not by any browser suite, and
do not affect Post/Media counts. Minor test-hygiene follow-up for the platform lane.

## Risks and follow-ups

- All M3 browser suites now serialize end to end, so the directory run is slower (≈4.9m vs ≈3.3m).
  That is the cost of correctness against a shared database; per-suite databases would be the
  faster long-term fix.
- Any **future** suite touching Post/Media counts must reuse `883112045`. This is now stated in a
  comment in all three files, but nothing enforces it mechanically.

## Requested contract/dependency change

None.
