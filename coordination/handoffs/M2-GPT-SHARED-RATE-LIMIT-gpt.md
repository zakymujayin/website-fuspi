# Handoff — M2-GPT-SHARED-RATE-LIMIT

- Task: `M2-GPT-SHARED-RATE-LIMIT`
- Branch: `ai/gpt/m2-shared-rate-limit`
- Base SHA: `0f21711`
- Implementation SHA: `909cd6e1c7ad0641b0a7d75890ba706f729238d7`
- Head: implementation SHA plus the immediately following handoff-only commit

## Summary

Added frozen shared policies and strict contracts in `src/contracts/operations.ts`, the
domain-separated HMAC key and atomic PostgreSQL fixed-window consumer in
`src/lib/rate-limit/persistent.ts`, plus unit/integration tests. Policies cover contact,
survey, PPKS submission, autocomplete, and ticket tracking per IP/number.

Twenty-five simultaneous contact attempts produced exactly five allowed and twenty generic
`RATE_LIMITED` results; the persisted count was 25 with no lost updates. Only the HMAC digest,
scope, UTC window, count, and block boundary are stored.

## Impact

- New internal TypeScript API only. Login limiting remains unchanged.
- No route, trusted-proxy parsing, Turnstile, UI, schema/migration, dependency, environment,
  auth, logging, or domain mutation changes.

## Acceptance

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 356 passed, 50 DB-gated skipped |
| `npm run test:integration` | PASS — 50 passed |
| 25-request PostgreSQL concurrency test | PASS — exactly 5 allowed, 20 blocked, count 25 |
| policy/window isolation and raw-identifier absence | PASS |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS — 0 High/Critical; 5 Moderate transitive findings |
| `git diff --check` | PASS |

## Follow-up

- Public routes must derive identifiers from the later trusted-proxy boundary, call this
  primitive server-side, and return localized supportive copy without exposing counters.
- Turnstile and PPKS UX remain route/UI tasks; this primitive does not add CAPTCHA.
