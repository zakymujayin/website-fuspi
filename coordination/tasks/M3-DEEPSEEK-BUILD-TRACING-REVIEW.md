---
id: M3-DEEPSEEK-BUILD-TRACING-REVIEW
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: f8a40ebe5b0279d08f45864863f2642f56dedeae
allowed_paths:
  - "coordination/reviews/M3-GPT-BUILD-TRACING-WARNING-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-BUILD-TRACING-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/tasks/M3-GPT-BUILD-TRACING-WARNING.md"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-gpt.md"
  - "next.config.ts"
  - "src/lib/storage/staged-file.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/app/api/admin/media/route.ts"
  - "node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md"
depends_on:
  - M3-GPT-BUILD-TRACING-WARNING
contracts:
  - docs/07-upload-media-hostinger.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-BUILD-TRACING-REVIEW.md TASK_BASE=origin/coordination/m3-review-corrections npm run check:scope"
risk: high
token_class: M
status: assigned
---

# M3 independent review of the build-tracing correction

Independently review `ai/gpt/m3-build-tracing-warning` at its handed-off candidate SHA. This is a
read-only review: do not fix source, configuration, tests, dependencies, or schema.

## Required review

1. Verify the diff is within the GPT task lease and uses a documented Next.js 16 tracing mechanism.
2. Confirm no storage boundary, symlink defense, path containment check, or upload behavior changed.
3. Inspect the produced NFT/standalone contents and prove the exclusion is narrowly scoped.
4. Re-run a zero-warning production build and the documented standalone media list/upload/delete
   smoke test with isolated PostgreSQL and upload directories.
5. Run the listed static, unit, and integration commands.
6. Record exact evidence and give one verdict: `APPROVED` only if every command and standalone smoke
   passes with no High/Critical finding; otherwise `CHANGES_REQUESTED`.

Do not accept a warning suppression or a build-only proof without standalone runtime evidence.
