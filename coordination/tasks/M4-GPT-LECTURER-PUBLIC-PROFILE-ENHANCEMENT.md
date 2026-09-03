---
id: M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT
milestone: M4
owner: gpt
reviewer: frontend-review
tester: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 32f321b7a71772ab7c04c9482f40848924df3412
allowed_paths:
  - "src/app/[locale]/(public)/dosen/[id]/page.tsx"
  - "src/app/[locale]/(public)/akademik/mata-kuliah/page.tsx"
  - "src/components/public/lecturer-academic-records.tsx"
  - "src/components/public/academic-course-catalog.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "coordination/tasks/M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT.md"
  - "coordination/handoffs/M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT-gpt.md"
forbidden_paths:
  - ".env*"
  - "prisma/**"
  - "src/contracts/**"
  - "src/features/**"
  - "src/lib/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "coordination/ownership.yml"
readonly_paths:
  - "AGENTS.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "src/contracts/academic-public.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME
contracts:
  - src/contracts/academic-public.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
risk: medium
token_class: M
status: active
---

# Lecturer public profile enhancement

Refine the public lecturer profile into a compact editorial layout, expose the
existing published research and community-service relations, reserve honest
empty states for HKI and teaching assignments until their data contracts land,
and add a working semester filter to the course catalog placeholder view.
