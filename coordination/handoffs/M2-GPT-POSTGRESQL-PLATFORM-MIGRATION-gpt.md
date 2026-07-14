# Handoff — M2-GPT-POSTGRESQL-PLATFORM-MIGRATION

- Branch: `ai/gpt/m2-postgresql-platform-migration`
- Base branch: `integration/m2-security`
- Assignment base: `8b35ab2`
- Implementation head SHA: `518f10d` (`2e04f3b` platform cutover + `518f10d` clean-runner CI fix)
- Writer/tester: GPT
- Date: 2026-07-15

## Summary

- Replaced the MariaDB runtime and packages with Prisma PostgreSQL and
  `@prisma/adapter-pg`/`pg`.
- Added bounded pool parsing, PostgreSQL protocol validation, loopback-only plaintext, and
  mandatory TLS modes for non-local connections.
- Converted the Prisma provider/native long-text types and generated one PostgreSQL baseline.
- Preserved the two already-merged MariaDB SQL files byte-for-byte in a non-executable archive.
- Updated CI to provision PostgreSQL 17, generate Prisma Client on a clean runner, deploy the
  migration, run the seed twice, and execute database integration tests.
- Replaced active MariaDB/Hostinger planning assumptions with PostgreSQL/VPS contracts,
  deployment, persistent storage, backup, restore, and operational gates.

## Files changed

- Runtime/dependencies: `package.json`, `package-lock.json`, `.env.example`, `README.md`,
  `src/lib/db/client.ts`, `src/lib/db/config.ts`.
- Database: `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/**`,
  `prisma/migrations-mariadb-archive/**`.
- CI/tests: `.github/workflows/ci.yml`, database config test, platform/auth integration test
  labels.
- Current plans: docs 01, 02, 07, 08, 09, 13, 20, 24, 25, docs README, and M1/M2 gate files.

## Schema and migration impact

- Prisma datasource is now `postgresql`; `@db.LongText` became PostgreSQL `@db.Text`.
- Active migration history starts at `20260714182351_init_postgresql`.
- The old MariaDB history is not executable and must not be copied back into
  `prisma/migrations`.
- This is a pre-production provider baseline cutover. An external MariaDB containing real data
  requires the documented export/transform/import/reconciliation process; no such data was
  present or modified by this task.

## Verification evidence

Local database: PostgreSQL `16.14`, isolated cluster, loopback port `55432`.
CI contract: PostgreSQL `17` service; staging/production must use the same supported major.

| Command/evidence | Result |
|---|---|
| `npm ci` | PASS — 890 packages installed from lockfile |
| `npm run prisma:format` | PASS |
| `npm run prisma:validate` | PASS |
| `npx prisma migrate dev --name init_postgresql` | PASS — baseline generated/applied |
| fresh DB `npx prisma migrate deploy` | PASS — 1 migration applied |
| `npm run prisma:seed` twice | PASS — both runs completed |
| post-seed counts | PASS — User 1, StudyProgram 5, Category 2, HomeSection 13, Statistic 3, QuickLink 6 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 167 passed, 23 database cases skipped by unit config |
| `npm run test:integration` | PASS — 23/23 on PostgreSQL |
| `npm run build` | PASS — 13 static pages plus dynamic auth routes |
| `npm run test:e2e` | PASS — 136/136 desktop/mobile |
| `git diff --check` | PASS |
| task scope check | PASS — 32 changed files within lease |
| `npm audit --json` | 0 critical/high; 5 moderate in Prisma dev tooling and Next/PostCSS chains |

The first E2E invocation pointed Playwright at an empty temporary browser cache and therefore
failed to launch Chromium. No test reached application assertions. Re-running with the installed
browser cache passed all 136 tests.

## Untested areas and risks

- PostgreSQL 17 is configured in CI but local runtime evidence is PostgreSQL 16.14. The
  integration branch push/CI must provide the PostgreSQL 17 evidence before accepting the gate.
- VPS staging TLS, role grants, reverse proxy, SMTP worker, persistent storage, backup/PITR, and
  restore drill remain environment-dependent and are not claimed as complete.
- Search `tsvector`/GIN, booking concurrency, upload/PPKS crypto, annual sequence, and outbox
  worker remain their existing M2 feature tasks; this migration does not implement them.
- The five moderate audit findings have no safe same-major automatic fix in the current report;
  do not use `npm audit fix --force`.

## Follow-ups

- Push/merge one-at-a-time into `integration/m2-security` and require green PostgreSQL 17 CI.
- Provision staging with a non-superuser role, TLS, and the same PostgreSQL major as production.
- If any external MariaDB has real records, inventory it before cutover and create a dedicated
  ETL/reconciliation task; never point PostgreSQL migrations at MariaDB.
- Continue the remaining M2 capabilities only after this provider contract is merged.
