---
id: M2-GPT-ANNUAL-SEQUENCE-SLA
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 3ee4841
allowed_paths:
  - "src/contracts/operations.ts"
  - "src/lib/sequence/**"
  - "src/lib/sla/**"
  - "tests/platform/annual-sequence.test.ts"
  - "tests/platform/annual-sequence.integration.test.ts"
  - "tests/platform/ticket-sla.test.ts"
  - "tests/platform/ticket-sla.integration.test.ts"
  - "coordination/handoffs/M2-GPT-ANNUAL-SEQUENCE-SLA-gpt.md"
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
  - "src/lib/outbox/**"
  - "src/lib/security/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/client.ts"
depends_on:
  - M2-GPT-POSTGRESQL-PLATFORM-MIGRATION
contracts:
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/15-peminjaman-gedung-jadwal.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - RUN_PLATFORM_DB_TESTS=true npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-ANNUAL-SEQUENCE-SLA.md TASK_BASE=origin/coordination/m2-gpt-sequence-sla-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M2 GPT Annual Sequence and Ticket SLA/Holiday Primitives

Implement the two remaining concurrency/time shared capabilities without connecting them to
ticket or booking mutations. Domain routes and workflows remain M4 work.

## Required implementation

1. Add strict contracts for sequence kind, Jakarta-year allocation, ticket priority, holiday
   date keys, SLA deadlines, pause/resume input, and bounded outputs. Invalid dates, years,
   counters, pause intervals, and holiday keys must fail closed.
2. Allocate `AnnualSequence(kind, year)` inside a PostgreSQL Serializable transaction. Derive
   the year from the supplied event time in `Asia/Jakarta`, increment atomically, and retry at
   most five times only for Prisma `P2034` or PostgreSQL serialization/deadlock errors.
3. Return unique, gap-free committed values and format references as
   `FUSPI-{year}-{minimum 4 digits}` for tickets and `PJM-{year}-{minimum 4 digits}` for
   bookings. `TICKET` and `BOOKING` counters and different Jakarta years are independent.
4. Encode the frozen SLA policy: URGENT response is 24 elapsed hours with a non-business-day
   landing rolled forward; all other response targets and every resolution target use whole
   business days. Preserve Jakarta wall-clock time while skipping Saturday, Sunday, and
   active `Holiday` dates.
5. Provide deterministic initial/reprioritization deadline calculation, pause/resume shifting,
   cumulative whole-second pause accounting, and response/resolution assessment. Completed
   SLA legs are not shifted. Callers remain responsible for persisting immutable history.
6. Load only active Holiday rows in an inclusive date range and expose normalized `YYYY-MM-DD`
   keys. Do not add Holiday CRUD or change schema.
7. Add unit tests for Jakarta year boundaries, validation, formatting, weekend/holiday rules,
   every priority, pause/resume, reprioritization, and SLA assessment. Add PostgreSQL tests
   with at least 20 same-counter parallel allocations, parallel counter kinds, year reset,
   and active/inactive Holiday filtering.

This task must not implement ticket creation, booking approval/overlap, route handlers, UI,
email, admin Holiday CRUD, schema/migrations, dependencies, or environment changes.
