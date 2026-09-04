---
id: M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN
milestone: M5
title: Redesign the public leadership profile page for contrast and proportion
risk: low
writer_model: claude
reviewer_model: human
tester_model: claude
base_branch: ai/claude/m5-lecturer-profile-redesign
base_sha: b936c4f
depends_on: []
spec_refs:
  - docs/17-komponen-ui-detail.md
  - docs/26-fuspi-public-ia-design-brief.md
allowed_paths:
  - coordination/tasks/M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN.md
  - coordination/handoffs/M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN-claude.md
  - "src/app/[locale]/(public)/profil/pimpinan/page.tsx"
  - tests/m5/ui/public-leadership-page.test.tsx
forbidden_paths:
  - .env*
  - prisma/**
  - src/contracts/**
  - src/lib/**
  - src/components/ui/**
  - src/app/globals.css
  - messages/**
readonly_paths:
  - AGENTS.md
  - docs/README.md
  - docs/17-komponen-ui-detail.md
  - docs/26-fuspi-public-ia-design-brief.md
  - src/components/public/dean-avatar-plate.tsx
  - src/lib/data/dummy-dean.ts
  - src/lib/data/dummy-leadership.ts
acceptance_commands:
  - npx vitest run tests/m5/ui/public-leadership-page.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
status: active
---

# Public leadership page redesign

Improve the public `/id/profil/pimpinan` page so names, positions, and the
dean's message read as distinct editorial content with clear contrast against
their surfaces. Keep existing data, locale fallback, image behavior, and page
semantics unchanged.
