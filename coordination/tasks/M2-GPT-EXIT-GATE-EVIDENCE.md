---
id: M2-GPT-EXIT-GATE-EVIDENCE
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 8d804f1
allowed_paths:
  - "coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md"
  - "coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md"
  - "coordination/handoffs/M2-GPT-EXIT-GATE-EVIDENCE-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M2-*.md"
  - "coordination/handoffs/M2-*.md"
  - ".github/workflows/ci.yml"
depends_on:
  - M2-GPT-REDIRECT-REGISTRY-SAFETY
contracts:
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
  - coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm run test:e2e
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-EXIT-GATE-EVIDENCE.md TASK_BASE=origin/coordination/m2-gpt-exit-gate-evidence-assignment npm run check:scope
risk: medium
token_class: S
status: merged
---

# M2 GPT Exit Gate Evidence

Audit the exact M2 integration head after the final shared-capability merge. Record durable,
test-linked evidence for every exit item, distinguish platform-complete checks from
feature-route checks whose implementation belongs to M3/M4, and list external staging evidence
that cannot be manufactured locally.

Do not weaken a security invariant, mark an unexecuted check as passed, implement a feature, or
open M3. Update the transition document so its status and next actions reflect current evidence
without retaining stale delivery-sequence instructions.
