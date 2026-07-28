---
id: M3-GPT-CLAUDE-OPERATIONAL-CONTROL
milestone: M3
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 887b2d8ef833aa3cc4a9cd61b5ed6795dfec3b08
allowed_paths:
  - "coordination/adr/ADR-0004-claude-operational-control-handoff.md"
  - "coordination/ownership.yml"
  - "coordination/handoffs/M3-GPT-CLAUDE-OPERATIONAL-CONTROL-gpt.md"
forbidden_paths:
  - ".env*"
  - "AGENTS.md"
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
  - "coordination/reviews/M3-CLAUDE-GOVERNANCE-RECONCILIATION-gpt.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md"
  - "docs/24-implementation-plan-multi-model.md"
depends_on:
  - M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION
contracts:
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-CLAUDE-OPERATIONAL-CONTROL.md TASK_BASE=origin/coordination/m3-claude-control-assignment npm run check:scope"
risk: high
token_class: S
status: assigned
---

# Temporary Claude operational-control handoff

Create a durable, auditable control contract for Claude to act as the sole M3 coordinator and
integration operator while Codex is unavailable.

## Required contract

1. Define the exact activation point, authority, reserved human-only actions, and explicit handback
   procedure.
2. Prevent split-brain: while active, another model may review or advise but may not operate the
   merge queue or mutate leases unless the human owner revokes this delegation.
3. Preserve task manifests, non-overlapping leases, model worktrees, independent review, FUSPI
   identity, security contracts, and the prohibition on direct `main` merge or production go-live.
4. Give Claude authority to create tasks, assign lanes, operate `integration/*`, close leases, and
   execute milestone evidence. Any product change still requires a task-specific lease.
5. Record the exact current integration head, open candidate/review branches, immediate next
   actions, and a copy-ready activation prompt.
6. Update `coordination/ownership.yml` so the durable coordinator field matches the contract.

This is operational delegation, not permission to disclose secrets, weaken security, bypass
governance, destructively modify data, merge to `main`, or deploy production without the human
owner.
