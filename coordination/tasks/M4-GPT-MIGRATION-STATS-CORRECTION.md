---
id: M4-GPT-MIGRATION-STATS-CORRECTION
milestone: M4
title: Reconcile local migration history and restore centered homepage statistics
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 706f56c
depends_on:
  - M4-GPT-FACILITY-HOMEPAGE-ADMIN
spec_refs:
  - docs/18-beranda-editable.md
  - docs/26-fuspi-public-ia-design-brief.md
allowed_paths:
  - "coordination/tasks/M4-GPT-MIGRATION-STATS-CORRECTION.md"
  - "coordination/handoffs/M4-GPT-MIGRATION-STATS-CORRECTION-gpt.md"
  - "prisma/migrations/20260811052302_add_site_setting_logo/migration.sql"
  - "src/components/public/stats-section.tsx"
contracts: []
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
token_class: S
status: active
---

## Intent

Local database migration history includes Claude's
`20260811052302_add_site_setting_logo`, but this branch already carries the
same schema effect in `20260810002000_home_video_facility_site_media`. Add a
no-op compatibility migration folder to let Prisma reconcile history without
duplicating DDL.

Also restore the centered public homepage statistics layout from Claude's
approved public UI snapshot.
