# M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS — GPT handoff

## Identity

- Task: `M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS`
- Branch: `ai/gpt/m4-admin-users-taxonomy-contracts`
- Manifest base: `42aa17beb910b61520c522395d5e8c532defd8da`
- Assignment base: `0b58a54`
- Implementation head: `8df794d2bd299f3e7fa89dab22ae1f171d9c9ec2`

## Summary

Froze strict ADMIN-only User and Category/Tag contracts. User contracts provide
safe list filtering/views, normalized credentials, mandatory first-login
password change, expected-`updatedAt` concurrency, CREATE/UPDATE only, trusted
ADMIN actor shape, and deterministic self-lockout/last-ADMIN/conflict failures.
Taxonomy contracts provide Category/Tag CRUD, neutral slugs, mandatory ID plus
optional EN/AR translations, workflow metadata, usage counts, duplicate-aware
queries and in-use conflicts.

## Files changed

- `src/contracts/admin-foundation.ts`
- `tests/m4/contracts/admin-foundation-contracts.test.ts`
- `coordination/handoffs/M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS-gpt.md`

## Impact

- Contract-only addition; no route, runtime, schema, migration, generated code,
  dependency, configuration, auth implementation, UI, or message change.
- User views cannot contain password/session/credential/token fields. There is
  no user DELETE command and actor identity is not accepted from request body.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m4/contracts/admin-foundation-contracts.test.ts` | PASS — 1 file, 9/9 tests |
| `npm run lint` | PASS — exit 0 after removing one unused import warning |
| `npm run typecheck` | PASS — exit 0 |
| `npm run test` | PASS — 57 files, 877/877 tests |
| `npm run build` with isolated GPT development DB environment | PASS — 35/35 static pages |
| `git diff --check` | PASS |
| scope-check | PASS — 2 implementation files within lease before handoff |

## Follow-ups

- The next task implements PostgreSQL domains and ADMIN API routes. Runtime must
  derive the actor from the database session before lookup/mutation, prevent
  self deactivation/demotion and removal of the last active ADMIN, hash initial
  passwords, revoke sessions on role/active changes, and map Prisma conflicts
  without technical disclosure.
- Category/Tag parent and translations must mutate in one transaction. Deletes
  must reject referenced rows instead of cascading through Posts.
- `expectedUpdatedAt` is used for User concurrency because the frozen User
  schema has no integer version. Category/Tag have no version/timestamp update
  field, so their runtime relies on transactional uniqueness and explicit
  reference checks rather than invented optimistic state.
