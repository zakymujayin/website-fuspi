---
id: M3-DEEPSEEK-BUILD-TRACING-REVIEW-R2
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: 4db53c431447677a68b20c2925eae43f0555aed5
supersedes: M3-DEEPSEEK-BUILD-TRACING-REVIEW
quarantined_commit: c778df3579c5e3afb79a7833795e36c6998ff231
review_branch: ai/deepseek/m3-build-tracing-review-r2
verified_head: eada22e75138184ef6cae5d3c173a13b41989c9b
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
  - "coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md"
  - "coordination/tasks/M3-GPT-BUILD-TRACING-WARNING.md"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-gpt.md"
  - "next.config.ts"
  - "src/lib/storage/staged-file.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/app/api/admin/media/route.ts"
depends_on:
  - M3-GPT-BUILD-TRACING-WARNING
  - M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2
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
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-BUILD-TRACING-REVIEW-R2.md TASK_BASE=4db53c431447677a68b20c2925eae43f0555aed5 npm run check:scope"
risk: high
token_class: M
status: complete
---

# M3 build tracing review — R2 replacement

Replacement for the quarantined review `c778df3`, which had three independently
disqualifying defects: verdict `APPROVED` while `npm run test:integration` was
recorded as "18/20 files fail"; the mandatory `RUN_PLATFORM_DB_TESTS=true npm test`
was not evidenced, only plain `npm test`; and the mandatory authenticated
standalone media smoke was never completed, being filed as a residual risk
instead. The superseded manifest stated explicitly that a build-only proof
without standalone runtime evidence must not be accepted.

Candidate under review: `5535c1c44f4b758f27b318b8d501482507bdc06f`.

## Correction requirements

1. Documentation-only branch with exactly one parent, based on `4db53c4`.
2. The candidate must never be a parent or ancestor of the review branch.
3. Fresh, uniquely named PostgreSQL database with the same pre-flight and
   environment checks as `M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2`.
4. `RUN_PLATFORM_DB_TESTS=true npm test` must be run as that exact string.
5. Zero-warning production build.
6. NFT inspection: list what was excluded, prove the exclusion is narrowly
   scoped, show no source, docs, tests, or prisma entries were swept in, and
   report the actual file count.
7. Authenticated standalone smoke covering media LIST, UPLOAD, and DELETE. The
   session must be obtained by logging in through the standalone server itself
   with a seeded user. Forging or hand-crafting a session cookie is not
   acceptable evidence. Record the HTTP status of each operation.
8. If the authenticated smoke cannot be completed, the verdict is
   `CHANGES_REQUESTED`. Recording it as "untested", "pre-existing", or a
   residual risk is not permitted.
9. Banned cleanup: `git checkout -- .`, `git reset` to discard work,
   `git clean -fd`, force checkout. Build artifacts are removed with
   `rm -rf .next`.

## Escalation rule

Identical to `M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2`. GPT platform/auth
lane failures are escalated as a new GPT task, never fixed by DeepSeek.

## Review content

Unchanged from the superseded manifest: verify the diff is within the GPT task
lease and uses a documented Next.js 16 tracing mechanism; confirm no storage
boundary, symlink defense, path containment check, or upload behavior changed;
prove the tracing exclusion is narrowly scoped; reject any generic warning
suppression.

## Outcome

Verdict `APPROVED`, agent-attested. Structural checks coordinator-verified and
passing. Reported zero-warning build, NFT reduced to 235 runtime-only files, and
authenticated standalone LIST, UPLOAD, and DELETE each returning HTTP 200 after
a real login. The coordinator independently confirmed that the endpoints named
in that smoke exist with the methods used. The results themselves were not
re-run by the coordinator; see
`coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md` section 4.
