---
id: M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 69f25c16abf16d956efa18d9f213040bfccce22f
allowed_paths:
  - "src/contracts/academic.ts"
  - "tests/m4/contracts/academic-directory-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/13-celah-fitur-keamanan-operasional.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "src/contracts/admin-foundation.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/config/institution.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ADMIN-USERS-TAXONOMY-RUNTIME
contracts:
  - src/contracts/cms.ts
  - src/config/institution.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/academic-directory-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# M4 GPT academic directory contracts

Freeze strict ADMIN and safe public boundaries for StudyProgram, Lecturer,
Staff, Research, CommunityService, and Unit. Preserve exactly the five v1 study
program codes and order from `src/config/institution.ts`; no S2/S3, Course,
Curriculum, bibliographic expansion, or external-system sync.

Require neutral fields at parents, ID translation for activation/publication,
optional non-empty EN/AR, safe PUBLIC media/document views, governance,
pagination/filtering, active/public projections, relation IDs, and deterministic
CRUD conflicts. Public people views expose only approved institutional contact
fields and never private phone, storage keys, or inactive records. Contracts
must be strict and bounded without Prisma selectors or technical errors.
