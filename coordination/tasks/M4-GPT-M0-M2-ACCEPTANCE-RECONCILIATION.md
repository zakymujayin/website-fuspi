---
id: M4-GPT-M0-M2-ACCEPTANCE-RECONCILIATION
milestone: M4
owner: gpt
reviewer: human-owner
tester: gpt
base_branch: integration/m4-features
base_sha: 81a95d6a8e8cd4698353d7f083e53dd0dda0ec5e
allowed_paths:
  - "coordination/ownership.yml"
  - "coordination/tasks/M4-GPT-M0-M2-ACCEPTANCE-RECONCILIATION.md"
  - "coordination/milestones/M0-FOUNDATION-EXIT.md"
  - "coordination/milestones/M1-PLATFORM-EXIT.md"
  - "coordination/reviews/M0-M2-ACCEPTANCE-RECONCILIATION-gpt.md"
  - "coordination/handoffs/M4-GPT-M0-M2-ACCEPTANCE-RECONCILIATION-gpt.md"
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
  - "docs/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/adr/ADR-0001-m0-platform-baseline.md"
  - "coordination/adr/ADR-0003-postgresql-vps-platform.md"
  - "coordination/handoffs/M0-GPT-FOUNDATION-gpt.md"
  - "coordination/milestones/M1-CODE-COMPLETE.md"
  - "coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-EXIT.md"
  - "coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md"
  - "coordination/reviews/M3-FINAL-ACCEPTANCE-gpt.md"
depends_on:
  - M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
contracts:
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - "test \"$(git rev-parse planning-baseline-v1^{})\" = 77f2901454be2699144241accee3e9a3805f2b02"
  - "test \"$(git rev-parse origin/integration/m1-platform)\" = ebd2a6d16689f1520fea073d1db631d5868e9500"
  - "test \"$(git rev-parse origin/integration/m2-security)\" = f83a00e6816a91f72b9ade654b012be8a1a0b2d0"
  - "test \"$(git rev-parse m0-accepted^{})\" = 77f2901454be2699144241accee3e9a3805f2b02"
  - "test \"$(git rev-parse m1-accepted^{})\" = f83a00e6816a91f72b9ade654b012be8a1a0b2d0"
  - "test \"$(git rev-parse m2-accepted^{})\" = f83a00e6816a91f72b9ade654b012be8a1a0b2d0"
  - "test \"$(git rev-parse m3-accepted^{})\" = a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-M0-M2-ACCEPTANCE-RECONCILIATION.md TASK_BASE=81a95d6a8e8cd4698353d7f083e53dd0dda0ec5e npm run check:scope"
risk: medium
token_class: M
status: active
---

# M0–M2 acceptance reconciliation

Reconcile the missing milestone acceptance records and tags using immutable Git
history and already-approved evidence. Preserve the original M0/M1 documents as
historical records, distinguish development acceptance from M6 deployment and
human-device gates, create annotated `m0-accepted`, `m1-accepted`, and
`m2-accepted` tags at the evidence-backed cumulative heads, and leave product
code, `main`, and the concurrent DeepSeek lease untouched.
