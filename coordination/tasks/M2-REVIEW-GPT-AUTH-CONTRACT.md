---
id: M2-REVIEW-GPT-AUTH-CONTRACT
milestone: M2
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: c8550d8
allowed_paths:
  - "coordination/reviews/M2-GPT-AUTH-CONTRACT-deepseek.md"
  - "coordination/handoffs/M2-REVIEW-GPT-AUTH-CONTRACT-deepseek.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "coordination/adr/**"
readonly_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "src/contracts/auth.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "tests/platform/auth-contracts/**"
  - "coordination/adr/ADR-0002-auth-dependency-contract.md"
  - "coordination/handoffs/M2-GPT-AUTH-CONTRACT-gpt.md"
  - "coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md"
depends_on:
  - M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION
  - M2-GPT-AUTH-CONTRACT
contracts:
  - docs/06-autentikasi-role.md
  - docs/20-test-acceptance-go-live.md
  - coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-REVIEW-GPT-AUTH-CONTRACT.md TASK_BASE=coordination/m2-auth-contract-review-assignment npm run check:scope
risk: high
token_class: M
status: ready
---

# M2 Independent Review — GPT Auth and RBAC Contract

Perform an adversarial, read-only review of the exact candidate contained in
`coordination/m2-auth-contract-review-assignment`. Do not implement fixes, edit the target,
change dependencies, or begin runtime Auth/M3 work.

## Review requirements

1. Verify the dependency pins and peer graph are compatible with Next.js 16/React 19 and do
   not introduce High/Critical audit findings. Do not recommend `npm audit fix --force`.
2. Verify `LoginCredentialsSchema`, public failure codes, login result, password-change input,
   active database-session metadata, authorization context, and safe redirect schema expose
   no PII, hashes, raw tokens, or technical errors.
3. Confirm the contracts can implement the binding decisions in
   `M2-AUTH-SECURITY-CROSS-LANE-gpt.md`: unknown/inactive login indistinguishability,
   rate-limit response, dummy bcrypt timing work, typed session-invalid handling, strict
   revoked/PPKS behavior, and mandatory current password.
4. Review every role/resource/action cell in the permission matrix. Deny must be the default;
   EDITOR ownership and ticket scopes must be explicit; ADMIN/PETUGAS must never gain PPKS
   detail; SATGAS_PPKS must not inherit unrelated CMS/booking access.
5. Inspect table-driven tests for missing roles, actions, resources, ownership/scope negative
   cases, strict parsing, redirect attacks, and accidental mutation of exported contracts.
6. Separate contract-task gaps from runtime implementation work. Do not reject this contract
   merely because Auth.js handlers, database session persistence, rate limiting, proxy, or UI
   correctly belong to later M2 implementation tasks.

## Review output

Write findings ordered by severity with exact file/line references and an explicit verdict:

- `APPROVE` only when no blocking/high finding remains;
- `REQUEST_CHANGES` when the writer must correct the GPT branch.

The review must include commands/results, residual risks, dependency/audit observations, and
the exact reviewed target SHAs. Create the required handoff, commit both allowed files, push
the review branch, and stop. Do not merge.

