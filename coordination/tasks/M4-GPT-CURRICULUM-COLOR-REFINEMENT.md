---
id: M4-GPT-CURRICULUM-COLOR-REFINEMENT
milestone: M4
title: Refine curriculum program-card color hierarchy
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: a40a21c
depends_on: []
allowed_paths:
  - src/app/[locale]/(public)/akademik/kurikulum/page.tsx
  - tests/m4/ui/curriculum-page.test.tsx
  - coordination/tasks/M4-GPT-CURRICULUM-COLOR-REFINEMENT.md
  - coordination/handoffs/M4-GPT-CURRICULUM-COLOR-REFINEMENT-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - src/components/public/academic-topic-shell.tsx
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/app/globals.css
  - src/components/ui/**
  - messages/**
contracts: []
acceptance_commands:
  - npx vitest run tests/m4/ui/curriculum-page.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-CURRICULUM-COLOR-REFINEMENT.md TASK_BASE=a40a21c npm run check:scope"
status: active
---

## Intent

Give each curriculum program section a stronger visual anchor by aligning its
header with the shared navy table-header treatment, while keeping the metric
cells white and readable.

## Acceptance criteria

- Each program section has a navy header using the shared `bg-navy-800` color.
- Program title and link remain readable with explicit light text and focus state.
- Curriculum statistics remain white and retain the existing compact grid.
- No schema, data, translation, or shared token changes are introduced.
