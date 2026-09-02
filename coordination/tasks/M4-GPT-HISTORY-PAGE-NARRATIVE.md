---
id: M4-GPT-HISTORY-PAGE-NARRATIVE
milestone: M4
title: Replace public history placeholder with FUSPI narrative
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: feat/lecturer-portal-complaint-booking
base_sha: c16133d5841886fb0d5cade820c39aff5fb11096
depends_on: []
spec_refs:
  - docs/05-halaman-publik.md
  - docs/26-fuspi-public-ia-design-brief.md
allowed_paths:
  - src/app/[locale]/(public)/profil/sejarah/page.tsx
  - coordination/tasks/M4-GPT-HISTORY-PAGE-NARRATIVE.md
  - coordination/handoffs/M4-GPT-HISTORY-PAGE-NARRATIVE-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - AGENTS.md
  - docs/README.md
  - docs/05-halaman-publik.md
  - docs/24-implementation-plan-multi-model.md
  - docs/26-fuspi-public-ia-design-brief.md
  - src/components/public/dean-welcome-section.tsx
  - src/lib/data/dummy-dean.ts
  - public/images/leadership/dekan-masykur.webp
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - next.config.ts
  - prisma/**
  - src/generated/**
  - src/contracts/**
  - src/features/**
  - src/lib/**
  - src/proxy.ts
  - src/app/globals.css
  - src/components/ui/**
contracts: []
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HISTORY-PAGE-NARRATIVE.md TASK_BASE=HEAD~1 npm run check:scope"
token_class: S
status: active
---

## Intent

Replace the placeholder public history page with a FUSPI-specific narrative based
only on owner-provided facts: FUSPI was established on 1 July 2026, previously
the institutional home was Fakultas Ushuluddin dan Adab, and Fakultas Adab dan
Humaniora separated as a new faculty. Include the first dean, Dr. Masykur, using
the same portrait asset referenced by the dean welcome section.

## Acceptance criteria

- The page no longer contains placeholder historical dates, accreditation
  claims, or invented service transformation claims.
- The history copy clearly states FUSPI's establishment on 1 July 2026.
- The copy explains the separation from Fakultas Ushuluddin dan Adab without
  copying external FUDA content.
- The page displays Dr. Masykur as the first dean using
  `/images/leadership/dekan-masykur.webp`.
- The page remains a Server Component with ID/EN/AR fallback copy and logical
  direction-safe layout utilities.

## Handoff requirements

Use `coordination/handoffs/TEMPLATE.md` and commit it with the task.
