# Handoff — M2-GPT-REDIRECT-REGISTRY-SAFETY

- Task: `M2-GPT-REDIRECT-REGISTRY-SAFETY`
- Branch: `ai/gpt/m2-redirect-registry-safety`
- Base SHA: `a977ea9`
- Implementation SHA: `941ce57c1f2fc2924cd63e56c219fe387c181209`
- Head: implementation SHA plus the immediately following handoff-only commit

## Summary

Added strict local/canonical redirect contracts, one-hop graph validation, serialized
PostgreSQL registry writes, idempotent source upsert, fail-closed resolution, and safe hit
counting. Exclusive advisory locks serialize writes; shared locks allow concurrent resolutions
without racing registry changes.

Adversarial coverage rejects domains, protocol-relative/missing-leading-slash paths, query,
fragment, controls, backslash, repeated separators, traversal/encoded traversal, reserved
sources, non-locale destinations, equality, chain, and loop.

## Impact

- New internal API in `src/lib/redirect/registry.ts` and contracts in
  `src/contracts/operations.ts`.
- No request route, proxy, importer, admin UI, schema/migration, dependency, environment, or
  external redirect support.

## Acceptance

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 376 passed, 54 DB-gated skipped |
| `npm run test:integration` | PASS — 54 passed |
| concurrent opposite-edge PostgreSQL test | PASS — exactly one accepted, loop prevented |
| idempotent save, inactive isolation, fail-closed resolution, hitCount | PASS |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS — 0 High/Critical; 5 Moderate transitive findings |
| `git diff --check` | PASS |

## Corrected implementation issue

The first PostgreSQL run showed Prisma adapter 7 cannot deserialize the advisory-lock
function's `void` return. The query now selects a supported integer from the lock function;
targeted and full integration suites pass.

## Follow-up

- M5 importer and request routing must use these save/resolve primitives rather than direct
  Redirect writes. Crawl/reconciliation remains a staging/go-live gate.
