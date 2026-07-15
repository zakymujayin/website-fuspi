---
id: M2-GPT-THREAT-REGISTRY-RECONCILIATION
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: c8d2c63
allowed_paths:
  - "tests/security/m2-threat-plan.ts"
  - "tests/security/m2-threat-plan.test.ts"
  - "coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md"
  - "coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md"
  - "coordination/handoffs/M2-GPT-THREAT-REGISTRY-RECONCILIATION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "e2e/**"
readonly_paths:
  - "tests/platform/**"
  - "tests/security/auth-bridge/**"
  - "tests/security/auth-runtime/**"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
depends_on:
  - M2-GPT-EXIT-GATE-EVIDENCE
contracts:
  - coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md
  - coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-THREAT-REGISTRY-RECONCILIATION.md TASK_BASE=origin/coordination/m2-gpt-threat-registry-assignment npm run check:scope
risk: medium
token_class: M
status: merged
---

# M2 GPT Threat Registry Reconciliation

Replace the obsolete all-blocked registry assertion with an explicit execution state, owning
milestone, and exact evidence paths for every threat case. Mark `covered` only when the complete
case invariant is executable now. Use `partial` for tested platform primitives whose final route
does not exist, and `blocked` for feature-boundary cases with no executable path.

Do not implement routes or weaken invariants. Meta-tests must reject missing evidence, impossible
state combinations, unknown milestones, and accidental claims that future M3/M4 cases are M2
complete.
