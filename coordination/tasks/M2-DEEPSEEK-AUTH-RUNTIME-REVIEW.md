---
id: M2-DEEPSEEK-AUTH-RUNTIME-REVIEW
milestone: M2
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: d61ea00
allowed_paths:
  - "tests/security/auth-runtime/**"
  - "coordination/reviews/M2-GPT-AUTH-RUNTIME-deepseek.md"
  - "coordination/handoffs/M2-DEEPSEEK-AUTH-RUNTIME-REVIEW-deepseek.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "prisma/**"
  - "src/**"
  - "tests/platform/auth-runtime/**"
  - "tests/security/m2-threat-plan.ts"
  - "coordination/adr/**"
readonly_paths:
  - "src/auth.ts"
  - "src/app/api/auth/**"
  - "src/lib/auth/runtime/**"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/security/hmac.ts"
  - "src/contracts/auth.ts"
  - "src/types/next-auth.d.ts"
  - "tests/platform/auth-runtime/**"
  - "tests/security/m2-threat-plan.ts"
  - "coordination/handoffs/M2-GPT-AUTH-RUNTIME-gpt.md"
  - "coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md"
depends_on:
  - M2-GPT-AUTH-RUNTIME
contracts:
  - docs/06-autentikasi-role.md
  - docs/20-test-acceptance-go-live.md
  - coordination/adr/ADR-0002-auth-dependency-contract.md
  - coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-DEEPSEEK-AUTH-RUNTIME-REVIEW.md TASK_BASE=origin/coordination/m2-auth-runtime-review-assignment npm run check:scope
risk: critical
token_class: L
status: assigned
---

# M2 DeepSeek Independent Auth Runtime Review

Perform an adversarial review of the exact GPT runtime candidate on
`coordination/m2-auth-runtime-review-assignment`. Add independent executable tests without
editing the writer's source or platform tests. Do not silently fix source, merge, implement
UI, start other shared-security work, or begin M3.

## Required review

1. Verify from installed Auth.js source that the documented beta limitation is accurate:
   Credentials-only database strategy is rejected and the Credentials callback uses JWT.
   Confirm the server-owned endpoint plus Auth.js database adapter is an honest no-JWT
   boundary; reject fake providers, encoded identity cookies, or misleading claims.
2. Exercise `POST /api/auth/credentials` and database-session primitives against MariaDB.
   Check exact success/failure status and body, opaque token row, eight-hour expiry, cookie
   flags, safe redirect, and absence of PII/token/hash/raw errors in public responses.
3. Test known, unknown, inactive, deleted, malformed, and blocked login paths. Each valid
   attempt must perform one cost-12 comparison; attempts 1–5 and attempt 6 behavior must be
   identical across account categories. Test concurrent increments for lost updates and
   ensure raw email/IP never persists.
4. Test expired, missing, inactive, password-changed, role-changed, and deactivated sessions.
   Confirm current database role/active state is used and all relevant rows are revoked in
   the same transaction.
5. Test default deny, EDITOR ownership, non-PPKS ticket scope, PPKS detail isolation, missing
   context, and role escalation. No caller may rely on `proxy.ts` for authorization.
6. Test same-origin enforcement for missing, malformed, alternate-port, alternate-scheme,
   subdomain, and hostile origins. Confirm rejected requests do not mutate counters/sessions.
7. Adversarially inspect failure ordering: limiter cleanup failure must not issue a cookie;
   database/adapter failures must become sanitized public results; no credential, token,
   HMAC, IP, or technical error may be logged.
8. Review transaction and race behavior, test cleanup isolation, reserved `.test` fixtures,
   and whether the tests overclaim timing equivalence. Timing checks must use documented
   distribution tolerance and must not assert nanosecond equality.

## Output and verdict

- Add focused tests under `tests/security/auth-runtime/**`; do not duplicate all writer
  tests mechanically.
- Write findings ordered Critical/High/Medium/Low with file and line references.
- `APPROVE` requires zero Critical/High findings and all executable tests green.
- `REQUEST_CHANGES` must describe the smallest writer-owned fix; do not implement it.
- Record exact reviewed candidate SHAs, commands/results, audit observations, residual risks,
  untested browser behavior, and a complete handoff.

Commit, push the DeepSeek review branch, and stop. Do not merge or begin Claude/M3 work.
