---
id: M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN
milestone: M4
title: Redesign the public lecturer detail page into a tidy identity-card layout
risk: low
writer_model: claude
reviewer_model: human
tester_model: claude
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: ec608aa8cfa7933711d397cf08ebec3f4a348e77
depends_on: []
spec_refs:
  - docs/17-komponen-ui-detail.md
allowed_paths:
  - coordination/tasks/M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN.md
  - coordination/handoffs/M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN-claude.md
  - "src/app/[locale]/(public)/dosen/[id]/page.tsx"
  - src/components/public/lecturer-academic-records.tsx
  - src/components/public/lecturer-profile-utils.ts
  - src/components/public/lecturer-profile-utils.test.ts
  - tests/m4/ui/public-lecturer-detail-redesign.test.tsx
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
  - docs/17-komponen-ui-detail.md
acceptance_commands:
  - npx vitest run tests/m4/ui/public-lecturer-detail-redesign.test.tsx src/components/public/lecturer-profile-utils.test.ts
  - npm run lint
  - npx tsc --noEmit
  - npm run test
  - git diff --check
token_class: M
status: complete
---

## Intent

The public lecturer detail page (`/dosen/[id]`) carried its identity fields
(NIP/NIDN, expertise, position) as loose paragraphs and a bare header, and the
publication list read as an unbroken wall of text. The user supplied an
external reference layout (a university-faculty lecturer profile with a
tinted hero band, a compact photo/identity card, and hairline-separated
record panels) and asked for the same idea, tidied up, in FUSPI's own visual
language.

## Acceptance criteria

- A tinted hero band above the two-column layout carries the study-program
  code, name, and position.
- The sticky identity card shows NIP and NIDN as separate labeled rows (not
  collapsed into one line), plus chips for study program, each expertise tag,
  and position/jabatan.
- Publications and the academic-record panels (research, community service,
  HKI) render inside a shared hairline-separated panel shell instead of an
  unbroken list.
- No behavior change to data fetching, sorting, semester filtering, or the
  academic-records navigation anchors.

## Handoff requirements

Use `coordination/handoffs/M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN-claude.md`.
