---
id: M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: e3b8592
allowed_paths:
  - "package.json"
  - "package-lock.json"
  - "e2e/auth/**"
  - "src/app/[locale]/(auth)/**"
  - "src/app/[locale]/admin/**"
  - "src/app/api/auth/**"
  - "src/components/auth/**"
  - "src/contracts/**"
  - "src/lib/auth/**"
  - "src/lib/rate-limit/**"
  - "src/lib/security/**"
  - "src/lib/storage/**"
  - "src/lib/outbox/**"
  - "src/lib/redirect/**"
  - "tests/platform/**"
  - "tests/security/**"
  - "coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md"
  - "coordination/reviews/M2-FINAL-SECURITY-REVIEW-gpt.md"
  - "coordination/reviews/M2-AUTH-ACCESSIBILITY-EVIDENCE-gpt.md"
  - "coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md"
  - "coordination/handoffs/M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY-gpt.md"
forbidden_paths:
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/[locale]/(public)/**"
  - "src/components/experience/**"
  - "src/app/globals.css"
readonly_paths:
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "prisma/schema.prisma"
  - ".github/workflows/ci.yml"
depends_on:
  - M2-GPT-THREAT-REGISTRY-RECONCILIATION
contracts:
  - coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md
  - coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - npm run test:e2e
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY.md TASK_BASE=origin/coordination/m2-gpt-final-closure-assignment npm run check:scope
risk: high
token_class: L
status: assigned
---

# M2 GPT Final Closure and M3 Entry

Close the locally actionable M2 evidence gaps without weakening security. Add automated axe
coverage to the implemented auth/admin flow, perform a fresh consolidated-head security review,
fix confirmed Critical/High defects if found, and record exact evidence.

Operational VPS proof remains mandatory for staging/go-live, but it must be classified separately
from the development milestone gate. M3 may open only when the local platform, security, browser,
and accessibility gates are green and every future route-dependent threat case remains a hard
merge blocker in its owning milestone.

If these conditions pass, update the transition contract to `M2 development accepted; M3 ready`.
Do not implement M3 features in this task.
