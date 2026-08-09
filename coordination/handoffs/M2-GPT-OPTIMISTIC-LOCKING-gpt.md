# Handoff — M2-GPT-OPTIMISTIC-LOCKING

- Task: `M2-GPT-OPTIMISTIC-LOCKING`
- Branch: `ai/gpt/m2-optimistic-locking`
- Base SHA: `0dafb49`
- Implementation SHA: `c0a7a915d8ca260cceb9ccc686af37f67cabbde5`
- Head: implementation SHA plus the immediately following handoff-only commit

## Summary and files

Added strict optimistic-lock contracts in `src/contracts/operations.ts`, the atomic
Post/Page/Booking version claim and transaction wrapper in `src/lib/db/optimistic-lock.ts`,
and unit/PostgreSQL tests in `tests/platform/optimistic-lock*.test.ts`.

The primitive increments only an exact `id + expectedVersion` match. Missing and stale records
both return `{ok:false, code:"VERSION_CONFLICT"}` without reading current state. The wrapper
keeps the claim and injected parent/translation writes in one transaction.

## Impact

- New internal TypeScript API; no routes, UI, schema, migration, dependency, generated code,
  environment, auth, or CMS workflow change.
- Intended consumers are M3 Post/Page autosave and later Booking mutations.

## Acceptance

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 352 passed, 47 DB-gated skipped |
| `npm run test:integration` | PASS — 47 passed |
| PostgreSQL parallel claim test | PASS — exactly one of two same-version claims succeeded |
| PostgreSQL atomic commit/rollback tests | PASS |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS — 0 High/Critical; 5 Moderate transitive findings |
| `git diff --check` | PASS |

## Untested and follow-up

- Post/Page autosave actions, conflict UX, and Booking workflows remain their dedicated M3/M4
  tasks. They must call this primitive rather than reimplementing version checks.
- The primitive deliberately returns the same conflict for missing and stale IDs; authorization
  and ownership checks must run before mutation in each consuming server action.
