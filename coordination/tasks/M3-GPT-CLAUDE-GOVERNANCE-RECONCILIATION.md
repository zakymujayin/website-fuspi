---
id: M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION
milestone: M3
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: f8a40ebe5b0279d08f45864863f2642f56dedeae
allowed_paths:
  - "coordination/reviews/M3-CLAUDE-GOVERNANCE-RECONCILIATION-gpt.md"
  - "coordination/handoffs/M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md"
  - "coordination/reviews/M3-CLAUDE-INDEPENDENT-REVIEW-gpt.md"
  - "coordination/tasks/M3-CLAUDE-POST-EDITOR-NAVIGATION.md"
  - "coordination/handoffs/M3-CLAUDE-POST-EDITOR-NAV-FIX-claude.md"
  - "coordination/tasks/M3-CLAUDE-POST-COVER-PICKER.md"
  - "coordination/handoffs/M3-CLAUDE-POST-COVER-PICKER-claude.md"
depends_on:
  - M3-GPT-CLAUDE-INDEPENDENT-REVIEW
contracts:
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION.md TASK_BASE=origin/coordination/m3-review-corrections npm run check:scope"
risk: medium
token_class: S
status: assigned
---

# M3 Claude governance reconciliation

Create an auditable, non-retroactive reconciliation for two governance violations found by the
independent review:

1. the merged Post editor navigation-fix commit has no task manifest or active lease record;
2. the cover-picker task changed `tests/m3/ui/admin-post-editor.test.tsx` outside its allowed paths.

## Required work

1. Identify exact commit SHAs, changed paths, author/committer, task/handoff claims, and functional
   evidence for both changes.
2. State plainly that a later document cannot create a historical lease or erase the violation.
3. Determine whether either change introduced unauthorized product scope, contract drift, or
   security risk, and record the evidence.
4. Recommend either retention with a human-approved governance exception or reversion with a new
   correctly leased implementation task.
5. Record preventive controls for future scope checks and assignment creation.
6. Obtain explicit `human-owner` disposition before calling the issue reconciled. Without that
   disposition, the verdict must remain `PENDING_HUMAN_DECISION`.

Do not create a backdated task manifest, edit the historical handoffs, or modify product code.
