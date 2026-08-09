# Handoff — M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING — GPT

- Branch: `ai/gpt/m4-public-content-locking-hardening`
- Base SHA: `b6f8f2887f3196bc4c7632f1eac17695dd7faaef`
- Implementation head SHA: `d3cf237201e2b4978cf1d4aaeb09fc27a24cf4eb`

## Result

Closed the public-content lost-update gap by making all ten public content resources versioned. Partnership, scholarship, achievement, student activity, album, and testimonial now match service/document/event/FAQ behavior for optimistic locking, admin version visibility, and revision history.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260809113000_public_content_version_hardening/migration.sql`
- `src/features/public-content/administration.ts`
- `src/features/public-content/admin-query.ts`
- `src/features/public-content/admin-detail.ts`
- `src/lib/db/revision.ts`
- `tests/m4/runtime/public-content-administration.test.ts`
- `tests/m4/runtime/public-content-domains.integration.test.ts`
- `coordination/tasks/M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING.md`

## Contract/schema/migration impact

- Added `version Int @default(1)` to `Partnership`, `Scholarship`, `Achievement`, `StudentActivity`, `Album`, and `Testimonial`.
- Added migration `20260809113000_public_content_version_hardening`.
- Public content admin mutation responses now return non-null versions for every resource.
- Update/delete commands now require `expectedVersion` for every public-content resource and return `VERSION_CONFLICT` on stale claims.
- Create/update/delete/reorder paths now write `ContentRevision` for all versioned public content resources.

## Verification

| Command | Result |
|---|---|
| `npm ci` | PASS |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/fuspi_dummy npm run prisma:generate` | PASS |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/fuspi_dummy npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS, 73 files / 972 tests |
| `npm run test:integration` | BLOCKED by missing `DATABASE_URL`, `TOKEN_HMAC_SECRET`, and `IP_HASH_SECRET` in this temporary worktree |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING.md TASK_BASE=b6f8f2887f3196bc4c7632f1eac17695dd7faaef npm run check:scope` | PASS, 10 changed files within lease |

## Untested areas

- PostgreSQL integration assertions for this branch were not executed because the temporary worktree has no database/auth secret environment. The command failed before domain assertions ran, at Prisma client/auth-secret initialization.

## Risks and follow-ups

- Apply the new migration before deploying code that expects `version` on the six newly hardened models.
- Run `npm run test:integration` in a configured GPT/integration environment before merge queue.
- npm reported existing dependency advisories during `npm ci`; no dependency changes were made in this task.

## Requested shared changes

- None.
