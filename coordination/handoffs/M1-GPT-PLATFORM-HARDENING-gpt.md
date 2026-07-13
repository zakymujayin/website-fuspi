# HANDOFF — M1-GPT-PLATFORM-HARDENING

- Task: `M1-GPT-PLATFORM-HARDENING`
- Branch: `ai/gpt/m1-platform-hardening`
- Base SHA: `b9fdaff`
- Implementation SHA: `76f42ba`
- Owner: GPT Platform
- Reviewer/tester requested: DeepSeek
- Status: ready for review; not merged

## Summary

- Seed and application client now share `parseDatabaseUrl`, eliminating adapter configuration drift.
- Corrected the shared loopback IPv6 contract to match the WHATWG URL hostname form `[::1]` and added a regression test.
- `npm run test:integration` now discovers `tests/**/*.integration.test.ts`, enables the explicit platform DB gate, and fails instead of silently succeeding with zero tests.
- Added recursive revision-key and audit depth/array boundary coverage.
- Replaced the CODEOWNERS placeholder with the repository owner `@zakymujayin`.

## Files changed

- `.github/CODEOWNERS`
- `package.json`
- `prisma/seed.ts`
- `src/lib/db/config.ts`
- `tests/platform/audit.test.ts`
- `tests/platform/db-config.test.ts`
- `tests/platform/revision-outbox.test.ts`
- `vitest.integration.config.ts`

## API, schema, migration, and dependency impact

- No schema, migration, generated client, dependency, or lockfile change.
- CI callers of `npm run test:integration` must provide `DATABASE_URL` for an isolated migrated test database; the script intentionally no longer accepts an empty integration suite.

## Verification

All commands passed against the isolated local database `fuspi_m1_verify`:

- `npm run lint`
- `npm run typecheck`
- `npm run prisma:validate`
- `npm test`: 88 passed, 2 database tests skipped in the unit run
- `npm run test:integration`: 2 passed; platform transaction/idempotency suite was discovered and executed
- `TASK_MANIFEST=coordination/tasks/M1-GPT-PLATFORM-HARDENING.md TASK_BASE=b9fdaff npm run check:scope`: 8 changed files, all within lease

## Risks and follow-ups

- Database evidence remains local MySQL-compatible execution. Fresh migration, double seed, JSON/ENUM/index behavior, and transaction tests still require an isolated Hostinger MariaDB staging environment before the deployment gate.
- The integration script uses POSIX environment syntax, matching the documented Linux/Hostinger/CI target; it is not portable to bare Windows `cmd.exe` without a wrapper.
- No production data, secret, tracking token, or PPKS fixture was used.
