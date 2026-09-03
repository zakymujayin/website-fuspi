---
id: M4-GPT-PUBLIC-IA-MENU-REMAP
milestone: M4
title: Remap public IA header and academic landing
risk: medium
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-history-page-narrative
base_sha: e29a9f17036838333350de19b8da92ceb818c2a8
depends_on: []
spec_refs:
  - docs/05-halaman-publik.md
  - docs/22-calon-mahasiswa-akademik-discoverability.md
  - docs/26-fuspi-public-ia-design-brief.md
allowed_paths:
  - AGENTS.md
  - docs/README.md
  - docs/02-database-schema.md
  - docs/05-halaman-publik.md
  - docs/17-komponen-ui-detail.md
  - docs/20-test-acceptance-go-live.md
  - docs/22-calon-mahasiswa-akademik-discoverability.md
  - docs/24-implementation-plan-multi-model.md
  - docs/26-fuspi-public-ia-design-brief.md
  - src/components/public/nav-items.ts
  - src/components/public/site-header.tsx
  - src/components/public/nav-items.test.ts
  - src/app/[locale]/(public)/akademik/page.tsx
  - src/app/[locale]/(public)/sitemap/page.tsx
  - src/app/sitemap.ts
  - messages/id.json
  - messages/en.json
  - messages/ar.json
  - coordination/tasks/M4-GPT-PUBLIC-IA-MENU-REMAP.md
  - coordination/handoffs/M4-GPT-PUBLIC-IA-MENU-REMAP-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - docs/10-menu-branding-referensi.md
  - docs/12-multibahasa-rtl.md
  - src/config/institution.ts
  - src/components/public/desktop-nav.tsx
  - src/components/public/mobile-nav.tsx
  - src/components/ui/container.tsx
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - next.config.ts
  - prisma/**
  - src/generated/**
  - src/contracts/**
  - src/features/**
  - src/proxy.ts
  - src/app/globals.css
  - src/components/ui/**
contracts: []
acceptance_commands:
  - npx vitest run src/components/public/nav-items.test.ts tests/m4/ui/public-shell-hardening.test.tsx src/test/identity-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-IA-MENU-REMAP.md TASK_BASE=e29a9f17036838333350de19b8da92ceb818c2a8 npm run check:scope"
token_class: M
status: active
---

## Intent

Remap the public header and academic landing page so the site behaves like a
faculty website: academic resources are grouped under Akademik, repeated
homepage shortcuts are removed from the Academic page, public content channels
are grouped under Berita & Informasi, and Kolom is renamed Sorotan Akademik.
Synchronize lingering project instructions to the owner-confirmed three active
study programs: IAT, IH, and AFI.

## Acceptance criteria

- `Akademik` is a dropdown containing Program Studi, the three program links,
  jadwal perkuliahan, kalender akademik, kurikulum, mata kuliah per tahun
  ajaran, dokumen akademik, akreditasi, and pedoman akademik.
- Program Studi is no longer a separate top-level primary nav item.
- `Publikasi` is replaced by `Berita & Informasi` for public content channels.
- Public `Kolom` labels become `Sorotan Akademik`.
- `/akademik` no longer repeats homepage shortcuts such as general agenda,
  SILA/e-layanan, or generic services cards; it presents academic-only resources.
- Project instructions that still claim five v1 study programs are corrected to
  three active v1 study programs without changing schema or seed code in this
  task.

## Handoff requirements

Use `coordination/handoffs/TEMPLATE.md` and commit it with the task.
