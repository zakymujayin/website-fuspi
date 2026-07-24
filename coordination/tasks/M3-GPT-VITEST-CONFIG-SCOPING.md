---
id: M3-GPT-VITEST-CONFIG-SCOPING
milestone: M3
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: 165d00f
allowed_paths:
  - "vitest.config.ts"
  - "coordination/handoffs/M3-GPT-VITEST-CONFIG-SCOPING-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "vitest.integration.config.ts"
  - "package.json"
  - ".github/workflows/ci.yml"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run test:integration
  - git diff --check
risk: medium
token_class: S
status: ready
---

# M3 GPT vitest unit-config scoping

`vitest.config.ts` (the unit config, `environment: "jsdom"`) sets no `include` and excludes only
`e2e/**` and `node_modules/**`. Two concrete problems follow:

1. **It collects every `*.integration.test.ts`**, which belong to `vitest.integration.config.ts`
   (`environment: "node"`, run by `npm run test:integration`, which CI runs). Under the unit config
   they self-skip on `RUN_PLATFORM_DB_TESTS`, producing the misleading `18 skipped` line in
   `npm test`. That signal caused a false "CI does not run the gated evidence" alarm — since
   withdrawn, see `coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md`. Worse, forcing them through
   the unit config runs integration tests under jsdom, where Node's `Buffer` is not `instanceof` the
   jsdom realm's `Uint8Array`.
2. **It collects `.next/standalone/**`** after any production build, so vitest picks up copied specs
   and reports phantom failures. This has now happened twice.

## Required change

Scope the unit config so it collects only unit/component tests:

- exclude `**/*.integration.test.ts` — owned by the integration config;
- exclude `.next/**` (and any other build output) so build artifacts are never collected.

Keep `environment: "jsdom"`, `globals`, and the existing setup file. Do not add an `include` so
narrow that current unit tests stop running — verify counts before and after.

## Must not change

Coverage. `npm test` must still execute **every** unit/component test it does today, and
`npm run test:integration` must still execute all 20 integration files. Record both counts before
and after in the handoff.

## Expected outcome

- `npm test` → same passing unit tests, **0 skipped** (the 18 skips disappear because those files
  are no longer collected here, not because they stopped running).
- `npm run test:integration` → unchanged, 20 files.
- A stale `.next/` no longer affects either run.

## Stand-in note

Codex is out of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).
This is a root-config hotspot normally reserved to GPT; the standing independence caveat applies.
