---
id: M4-GPT-ACADEMIC-PUBLIC-DETAIL-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: acd2b382882079894b5a9f9078799c82ece5a630
allowed_paths:
  - "src/contracts/academic-public.ts"
  - "tests/m4/contracts/academic-public-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-PUBLIC-DETAIL-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/features/**"
  - "src/lib/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "src/contracts/academic.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME
contracts:
  - src/contracts/academic.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/academic-public-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-PUBLIC-DETAIL-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: M
status: active
---

# Academic public detail contracts

Freeze slug+locale public detail query/results for StudyProgram, Lecturer,
Staff, Research, CommunityService, and Unit. Each discriminated projection must
carry the public page data needed by Claude while structurally excluding phone,
NIP, NIDN, owner/workflow/reviewer data, private media, storage keys, arbitrary
selectors, and technical errors. Locale resolution is exact PUBLISHED locale or
PUBLISHED Indonesian fallback only.
