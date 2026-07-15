---
id: M2-GPT-OPTIMISTIC-LOCKING
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 0b0d3bf
allowed_paths:
  - "src/contracts/operations.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "tests/platform/optimistic-lock.test.ts"
  - "tests/platform/optimistic-lock.integration.test.ts"
  - "coordination/handoffs/M2-GPT-OPTIMISTIC-LOCKING-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/auth/**"
  - "src/lib/security/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/client.ts"
depends_on:
  - M2-GPT-POSTGRESQL-PLATFORM-MIGRATION
contracts:
  - docs/02-database-schema.md
  - docs/09-fitur-cms-editor.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-OPTIMISTIC-LOCKING.md TASK_BASE=origin/coordination/m2-gpt-optimistic-lock-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M2 GPT Optimistic Locking Primitive

Implement the frozen `id + version` concurrency boundary used later by Post/Page autosave and
Booking mutations. Do not implement CMS actions or UI in this task.

## Required implementation

1. Add strict resource/id/expected-version contracts for exactly Post, Page, and Booking.
2. Atomically claim a version through `updateMany(where: {id, version}, increment version)`.
   Return the next version only when exactly one row changes.
3. Treat a missing ID and a stale version as the same bounded `VERSION_CONFLICT`; do not read
   or expose the current version, existence, database error, or record data.
4. Provide a transaction wrapper that claims the version and runs injected parent/translation
   mutations in the same transaction. A downstream error must roll back the version claim.
5. Add PostgreSQL tests proving two parallel claims for one version yield exactly one success,
   stale/missing inputs are indistinguishable, callback is skipped on conflict, successful
   parent+translation work commits, and callback failure rolls everything back.
6. No schema, migration, dependency, route, auth, CMS workflow, autosave timer, or UI changes.
