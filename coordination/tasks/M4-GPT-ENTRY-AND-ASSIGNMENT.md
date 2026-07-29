---
id: M4-GPT-ENTRY-AND-ASSIGNMENT
milestone: M4
owner: gpt
reviewer: gpt
tester: gpt
base_branch: integration/m3-reference-slice
base_sha: a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0
allowed_paths:
  - "coordination/ownership.yml"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "coordination/tasks/M4-GPT-ENTRY-AND-ASSIGNMENT.md"
  - "coordination/tasks/M4-GPT-PPKS-QUERY-ISOLATION.md"
  - "coordination/tasks/M4-CLAUDE-PUBLIC-SHELL-HARDENING.md"
  - "coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md"
  - "coordination/prompts/M4-CLAUDE-PUBLIC-SHELL-HARDENING.md"
  - "coordination/prompts/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md"
  - "coordination/handoffs/M4-GPT-ENTRY-AND-ASSIGNMENT-gpt.md"
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
  - "docs/README.md"
  - "docs/04-panel-admin.md"
  - "docs/05-halaman-publik.md"
  - "docs/10-menu-branding-referensi.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-EXIT.md"
  - "coordination/reviews/M3-FINAL-ACCEPTANCE-gpt.md"
  - "src/config/institution.ts"
depends_on:
  - M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
contracts:
  - docs/24-implementation-plan-multi-model.md
  - coordination/milestones/M3-REFERENCE-SLICE-EXIT.md
acceptance_commands:
  - git diff --check
  - "test \"$(git rev-parse 'refs/tags/m3-accepted^{}')\" = a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0"
  - "test \"$(git rev-parse origin/integration/m3-reference-slice)\" = a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0"
  - "rg -n 'FUSPI|IAT|IH|AFI|SAA|TASPI' src/config/institution.ts"
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ENTRY-AND-ASSIGNMENT.md TASK_BASE=a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0 npm run check:scope"
risk: high
token_class: M
status: merged
---

# M4 entry and first-wave assignment

Open M4 only from the accepted M3 commit, freeze the milestone branch and gate,
publish two non-overlapping first-wave assignments, and provide exact prompts
that make Claude and DeepSeek work from their committed manifests.

This task is coordination-only. It must not change product code, schema,
dependencies, configuration, tests, or M3 evidence.

## Acceptance criteria

1. `integration/m4-features` is created from the accepted M3 commit
   `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`; no merge to `main` occurs.
2. The M4 entry contract records lane boundaries, dependency policy, mandatory
   evidence, and the absolute PPKS-isolation and booking-concurrency blockers.
3. Claude and DeepSeek receive bounded manifests whose leases do not overlap
   each other or the GPT-owned first sensitive-operation task.
4. Prompts instruct both agents to read only their required context, work in
   their own worktree and branch, run every acceptance command, commit a
   handoff, and stop without merging or changing governance state.
5. The obsolete local `coordination/m4-entry` branch is not treated as
   authority because it predates M3 acceptance and names a superseded
   coordinator/base.
