---
id: M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION
milestone: M2
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 18a26dd
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
  - "coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md"
  - "coordination/reviews/M2-AUTH-UX-SPEC-claude.md"
  - "src/contracts/auth.ts"
  - "src/lib/auth/permission-matrix.ts"
depends_on:
  - M2-DEEPSEEK-SECURITY-TEST-DESIGN
  - M2-GPT-AUTH-CONTRACT
contracts:
  - coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md
  - docs/06-autentikasi-role.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION.md TASK_BASE=coordination/m2-revision-assignment npm run check:scope
risk: high
token_class: S
status: ready
---

# M2 DeepSeek Security Test Design Revision

Correct the existing typed security plan without importing or guessing runtime APIs. This
remains design/meta-test work; do not implement Auth, upload, crypto, PPKS, outbox, schema,
dependencies, fixtures with production identity, executable E2E flows, or M3 work.

## Acceptance criteria

- Every case declares execution readiness. All current cases remain blocked.
- A reusable validator accepts an available-dependency set and rejects a case marked ready
  when its dependency is missing; a meta-test proves the rejection with a synthetic mutation.
- Existing, non-existing, and inactive accounts reach identical rate-limit behavior and
  generic public output. Timing testing specifies statistical tolerance and dummy bcrypt
  work rather than impossible exact nanosecond equality.
- Test fixtures use reserved domains such as `example.invalid`; the PII meta-test rejects
  FUSPI domains, FUDA domains, real-looking phone numbers, secrets, and production identity.
- Duplicate outbox retry with the same key remains idempotent. The separate payload-tamper
  case does not claim a changed key will hit the old unique constraint.
- Guessed PPKS detail access by ADMIN/PETUGAS has one outcome: 404, zero detail bytes/fields,
  and a denied-access audit entry. Aggregates are tested through a separate permitted query.
- No expected outcome uses alternatives such as “403 or empty/redacted”.
- The handoff records the revision implementation SHA and exact acceptance results.

## Handoff requirements

Update the existing DeepSeek handoff. Label `d995fc4` as the original implementation SHA,
then record the revision implementation commit and remaining blocked dependencies. Do not
claim the cases are executable until the implementation contracts are merged.
