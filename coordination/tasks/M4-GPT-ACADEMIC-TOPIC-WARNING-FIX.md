---
id: M4-GPT-ACADEMIC-TOPIC-WARNING-FIX
milestone: M4
title: Remove unused academic topic translation binding
risk: low
writer_model: gpt
reviewer_model: human
tester_model: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 5ef1373cbe93b145455228d01c43b91438d97d96
depends_on: []
spec_refs:
  - docs/README.md
allowed_paths:
  - coordination/tasks/M4-GPT-ACADEMIC-TOPIC-WARNING-FIX.md
  - coordination/handoffs/M4-GPT-ACADEMIC-TOPIC-WARNING-FIX-gpt.md
  - coordination/ownership.yml
  - src/components/public/academic-topic-shell.tsx
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/components/ui/**
  - src/app/globals.css
  - messages/**
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - git diff --check
status: active
---

## Intent

Remove the unused `tAcademic` translation binding reported by ESLint without
changing the academic topic page output.

## Acceptance criteria

- `academic-topic-shell.tsx` no longer declares an unused translation binding.
- Lint and typecheck pass without introducing new warnings or errors.
