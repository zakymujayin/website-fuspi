---
id: M2-DEEPSEEK-AUTH-BRIDGE-REVIEW
milestone: M2
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 02cabd1
allowed_paths:
  - "tests/security/auth-bridge/**"
  - "coordination/reviews/M2-GPT-AUTH-BRIDGE-deepseek.md"
  - "coordination/handoffs/M2-DEEPSEEK-AUTH-BRIDGE-REVIEW-deepseek.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "src/contracts/auth.ts"
  - "src/app/api/auth/credentials/route.ts"
  - "src/app/api/auth/password/route.ts"
  - "src/lib/auth/runtime/credentials.ts"
  - "src/lib/auth/runtime/redirect.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "tests/platform/auth-bridge/**"
  - "coordination/handoffs/M2-GPT-AUTH-BRIDGE-gpt.md"
depends_on:
  - M2-GPT-AUTH-BRIDGE
contracts:
  - docs/06-autentikasi-role.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-DEEPSEEK-AUTH-BRIDGE-REVIEW.md TASK_BASE=origin/coordination/m2-deepseek-auth-bridge-review-assignment npm run check:scope
risk: high
token_class: S
status: merged
---

# M2 DeepSeek Independent Auth Bridge Review

Perform one bounded, independent review of the merged GPT auth bridge. Do not modify runtime,
contracts, UI, schema, dependencies, task status, integration, or M3.

## Review targets

1. Inspect locale normalization for external, protocol-relative, encoded/double-encoded
   separator or control, backslash, auth-loop, malformed encoding, query, and fragment cases.
2. Verify production/dev cookie-name isolation, missing/expired/revoked/inactive session
   rejection, and that route decisions serialize no actor data.
3. Exercise password-route CSRF, malformed JSON/form input, wrong current password, policy
   failure, database failure sanitization where safely testable, successful all-session
   revocation, cookie expiry, and safe localized post-change destination.
4. Check that Credentials keeps generic failures and normalizes the destination server-side
   with valid, missing, and invalid locale hints.
5. Add tests only under `tests/security/auth-bridge/**`; use reserved `.test` fixtures and
   clean MariaDB rows. Record exact evidence in the review and handoff.

Verdict must be `PASS` or `REQUEST_CHANGES`. Request changes only for a reproducible
High/Critical security/system failure or a failing acceptance command. Record Low/Medium
hardening notes as non-blocking follow-up so M2 does not loop. Commit, push, and stop; do not
merge or begin another task.
