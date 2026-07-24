---
id: M3-DEEPSEEK-E2E-CROSS-SUITE-ISOLATION
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 3f0a2c1
allowed_paths:
  - "e2e/m3/admin-post-list-browse.spec.ts"
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "e2e/m3/public-post-experience.spec.ts"
  - "coordination/handoffs/M3-DEEPSEEK-E2E-CROSS-SUITE-ISOLATION-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "playwright.config.ts"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "npx playwright test e2e/m3/ --project=chromium --project=mobile"
  - git diff --check
risk: medium
token_class: S
status: ready
---

# M3 E2E cross-suite isolation

Running the whole M3 browser directory in one invocation fails 12 cases:

```text
npx playwright test e2e/m3/ --project=chromium --project=mobile
→ 12 failed, 212 passed
```

Each suite passes alone, so this is **fixture interference, not a product defect**.

## Root cause

All three suites assert **global ADMIN-visible counts** against one shared database:

- `admin-media-library-browse` expects 35 Media, observes 36;
- `admin-post-list-browse` expects 26 Berita, observes 43;
- `public-post-experience` creates ~17 Posts, a Category, and a Media, and holds them for its whole
  run. It cleans up in `afterAll` but takes **no advisory lock at all**.

`admin-media-library-browse` and `admin-post-list-browse` each serialize their own two Playwright
projects with an advisory lock, but they use **different keys** (`883112045` and `883112046`), so
the suites do not exclude each other and `public-post-experience` excludes nobody. Concurrent
workers therefore keep two suites' fixtures resident at once.

The distinct-key choice made when `admin-post-list-browse` was added was wrong: a different key
avoids blocking, which is exactly what must **not** happen here.

## Required fix

1. Use **one shared advisory-lock key** across all three suites, so only one suite's fixtures are
   resident at any time. Name it once per file with an explaining comment; do not invent a new key
   per suite.
2. Give `public-post-experience` the same acquire-in-`beforeAll` / release-after-cleanup-in-`afterAll`
   lifecycle the admin suites already use, including a hook timeout raised enough to wait for
   another suite to finish.
3. Release the lock only **after** fixture cleanup, so the next suite starts from a clean database.
4. Do not weaken any existing assertion to make it pass. The counts are correct; the isolation is
   what is broken.

## Verification

`npx playwright test e2e/m3/ --project=chromium --project=mobile` must pass with **zero** failures
and zero did-not-run, and each suite must still pass when run alone.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`); the standing independence caveat
applies.
