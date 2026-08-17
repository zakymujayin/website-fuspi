---
id: M4-GPT-FACILITY-REVISION-FIX
milestone: M4
title: Allow Facility content revisions so admin facility create/update can persist
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 8e29690
depends_on:
  - M4-GPT-FACILITY-HOMEPAGE-ADMIN
spec_refs:
  - docs/21-tata-kelola-privasi-alert.md
allowed_paths:
  - "coordination/tasks/M4-GPT-FACILITY-REVISION-FIX.md"
  - "coordination/handoffs/M4-GPT-FACILITY-REVISION-FIX-gpt.md"
  - "src/lib/db/revision.ts"
  - "tests/platform/revision-outbox.test.ts"
contracts:
  - src/lib/db/revision.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
token_class: S
status: active
---

## Intent

Facility admin mutations create `ContentRevision` records with
`resourceType: "Facility"`. The platform revision allowlist must include that
CMS resource type; otherwise create/update rolls back and surfaces
`UNAVAILABLE`.
