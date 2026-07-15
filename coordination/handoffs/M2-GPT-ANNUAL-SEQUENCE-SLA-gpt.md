# Handoff — M2-GPT-ANNUAL-SEQUENCE-SLA

- Task ID: `M2-GPT-ANNUAL-SEQUENCE-SLA`
- Branch: `ai/gpt/m2-annual-sequence-sla`
- Base SHA: `5d4b3579a2679736e18827bc3fc09144221bf013`
- Implementation SHA: `278bff89a7f6ade2f85d58f0f741480dc4ac267a`
- Head SHA represented by this handoff: implementation SHA above plus the immediately following
  handoff-only commit

## Summary

- Added strict Zod contracts for annual counters, Holiday date keys/ranges, priorities,
  deadlines, and pause/resume inputs.
- Added Jakarta-year `TICKET`/`BOOKING` allocation using an atomic PostgreSQL upsert inside a
  Serializable transaction, with at most five retries for Prisma/PostgreSQL concurrency
  codes. A process-local queue serializes requests for the same kind/year; different kinds
  and years remain independent.
- Added `FUSPI-{year}-{minimum 4 digits}` and `PJM-{year}-{minimum 4 digits}` formatting.
- Added deterministic Jakarta business-day SLA calculation for all four priorities, active
  Holiday loading, pause/resume shifts, reprioritization, and SLA assessment.
- Added unit and PostgreSQL integration coverage, including 20 simultaneous allocations.

## Files changed

- `src/contracts/operations.ts`
- `src/lib/sequence/annual.ts`
- `src/lib/sla/ticket.ts`
- `tests/platform/annual-sequence.test.ts`
- `tests/platform/annual-sequence.integration.test.ts`
- `tests/platform/ticket-sla.test.ts`
- `tests/platform/ticket-sla.integration.test.ts`
- `coordination/handoffs/M2-GPT-ANNUAL-SEQUENCE-SLA-gpt.md`

## API, schema, migration, and dependency impact

- New internal TypeScript APIs only; no HTTP route or public UI was added.
- No Prisma schema, migration, generated client, dependency, lockfile, environment contract,
  seed, or root configuration change.
- The implementation consumes the existing `AnnualSequence`, `Holiday`, `SequenceKind`, and
  `TicketPriority` database contracts without changing them.

## Acceptance evidence

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 344 passed, 41 DB-gated skipped |
| `RUN_PLATFORM_DB_TESTS=true npm run test:integration` with isolated PostgreSQL URL and configured local test secrets | PASS — 41 passed |
| targeted annual-sequence + Holiday PostgreSQL suite | PASS — 4 passed; includes 20 same-counter parallel allocations, parallel kinds, year reset, and active/inactive Holiday filtering |
| `npm run prisma:validate` with isolated PostgreSQL URL | PASS |
| `npm run build` with isolated PostgreSQL URL and configured local test secrets | PASS — production build and 19 static/dynamic route entries generated |
| `npm audit --audit-level=high` | PASS — 0 High/Critical; 5 Moderate transitive findings remain |
| `git diff --check origin/coordination/m2-gpt-sequence-sla-assignment...HEAD` | PASS |
| task `npm run check:scope` against `origin/coordination/m2-gpt-sequence-sla-assignment` | PASS — 7 implementation files within lease before this handoff |

## Corrected failure found during implementation

The first real PostgreSQL run exhausted five immediate Serializable retries under 20
same-row requests (`40001`). The implementation was corrected with a per-counter local queue
and bounded jittered retry for cross-process conflicts. The same 20-request test and the full
integration suite then passed.

## Untested areas, risks, and follow-ups

1. The v1 VPS is a single Node application process. A multi-process/multi-host deployment
   should add a staging load test across processes; PostgreSQL Serializable transactions and
   five bounded retries remain the cross-process correctness boundary.
2. Ticket creation, booking submission/approval, immutable priority/status history, and
   persistence of computed deadlines are M4 domain tasks and were intentionally not added.
3. Holiday admin CRUD and operational calendar ownership are later CMS work. This primitive
   reads only active rows.
4. Official PPKS handling deadlines still require owner/Satgas policy verification before
   go-live as required by `docs/14-sistem-tiket-pengaduan-ppks.md`.
