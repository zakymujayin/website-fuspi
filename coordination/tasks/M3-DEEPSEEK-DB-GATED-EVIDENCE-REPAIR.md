---
id: M3-DEEPSEEK-DB-GATED-EVIDENCE-REPAIR
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 8312635
allowed_paths:
  - "tests/m3/runtime/media-persistence.integration.test.ts"
  - "tests/m3/runtime/media-admin-transport.integration.test.ts"
  - "vitest.config.ts"
  - "coordination/handoffs/M3-DEEPSEEK-DB-GATED-EVIDENCE-REPAIR-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/storage.ts"
  - "src/lib/storage/staged-file.ts"
  - "src/app/api/admin/media/upload/route.ts"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - git diff --check
risk: high
token_class: M
status: ready
---

# M3 DB-gated evidence repair

## Why this is High risk despite being test-only

Most of M3's **carried mandatory security evidence** lives in 18 files gated behind
`RUN_PLATFORM_DB_TESTS`. That variable is **not set** in the default `npm test`, and CI
(`.github/workflows/ci.yml`) does not set it either. The suite has therefore been reporting green
while the Media ownership, staged-file rollback, upload-validation, auth-adversarial, optimistic
lock, and rate-limit evidence never executed.

Turning the gate on exposes real failures:

```text
npm test                              → 669 passed, 18 files skipped   (green by omission)
RUN_PLATFORM_DB_TESTS=true npm test   → 740 passed, 4 failed
```

## Diagnosed root cause (already isolated — do not re-litigate, verify)

The failures are in `tests/m3/runtime/media-persistence.integration.test.ts` and
`tests/m3/runtime/media-admin-transport.integration.test.ts`. They are a **test-environment defect,
not a product defect**:

- `vitest.config.ts` sets `environment: "jsdom"` for the whole project.
- Under jsdom, the global `Uint8Array` belongs to the jsdom realm, while Node's `Buffer` does not
  inherit from it. `z.instanceof(Uint8Array)` in `src/contracts/storage.ts` therefore rejects a
  `Buffer` with `expected Uint8Array, received Buffer`.
- `stageUpload` wraps everything in a broad `catch` and rethrows `StorageBoundaryError`, which hid
  the Zod cause entirely.
- **Production is correct:** `src/app/api/admin/media/upload/route.ts:124` builds
  `new Uint8Array(await file.arrayBuffer())` in the Node runtime. The contract is right; the tests
  feed it the wrong type under the wrong environment.

## Required work

1. Make the two Media runtime tests pass real `Uint8Array` values (or run those files under the
   `node` environment via a vitest `environmentMatchGlobs`/per-file `@vitest-environment` pragma).
   Prefer whichever keeps the assertion honest — do **not** loosen `src/contracts/storage.ts`; it is
   forbidden here and it is correct.
2. Confirm no other gated file depends on the same jsdom/Buffer confusion.
3. `RUN_PLATFORM_DB_TESTS=true npm test` must pass with **zero** failures.
4. Report, in the handoff, exactly which security evidence each previously-skipped file proves, so
   the integrator can tick off the M3 carried-evidence list.

## Do not

- Do not change `src/**`, contracts, schema, or the upload route.
- Do not weaken or delete an assertion to make a test pass.
- Do not enable the gate in CI — that is a GPT/CI contract change and is raised separately.

## Known adjacent issue (report, do not fix here)

`tests/security/auth-runtime/credentials-route.integration.test.ts` leaks `m2-route-*@example.test`
`User` rows; six were resident in the QA database. Record it; the platform lane owns the fix.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). The standing independence caveat
applies to anything the stand-in approves.
