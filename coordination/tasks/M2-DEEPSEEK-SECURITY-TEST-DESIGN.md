---
id: M2-DEEPSEEK-SECURITY-TEST-DESIGN
milestone: M2
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: ebd2a6d
allowed_paths:
  - "tests/security/m2-threat-plan.ts"
  - "tests/security/m2-threat-plan.test.ts"
  - "coordination/handoffs/M2-DEEPSEEK-SECURITY-TEST-DESIGN-deepseek.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "tests/foundation/threat-matrix.ts"
  - "tests/foundation/fixtures/**"
  - "coordination/milestones/M1-CODE-COMPLETE.md"
depends_on:
  - M1-DEEPSEEK-QA
contracts:
  - docs/06-autentikasi-role.md
  - docs/07-upload-media-hostinger.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
risk: medium
token_class: S
status: ready
---

# M2 DeepSeek Security Test Design

Turn the pending M1 threat inventory into a typed, executable M2 test plan without importing or guessing future implementation APIs. Each case must declare ID, area, severity, actor, precondition, attack/action, invariant, expected generic outcome, required fixture, implementation dependency, and intended test level.

Cover at minimum session revocation, inactive users, role/ownership IDOR, CSRF, login enumeration/rate limiting, upload spoof/path traversal, encrypted-payload tampering, PPKS isolation, annual sequence concurrency, outbox idempotency, and CSV injection. Add meta-tests that reject duplicate IDs, missing Critical invariants, real PII/domains, or a case marked executable before its dependency exists.

Do not implement Auth, security helpers, schema, fixtures that imitate production secrets, or tests coupled to unmerged APIs. Commit the test plan and handoff, push the task branch, and stop.
