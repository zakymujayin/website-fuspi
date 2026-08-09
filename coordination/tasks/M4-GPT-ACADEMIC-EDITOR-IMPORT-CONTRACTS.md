---
id: M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: fe06ce4ad7b760f5eb07ba92fc34ecc9df72b7aa
allowed_paths:
  - "src/contracts/academic-editor.ts"
  - "tests/m4/contracts/academic-editor-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS-gpt.md"
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
  - "docs/04-panel-admin.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "src/contracts/academic.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/config/institution.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS
  - M4-GPT-ACADEMIC-PEOPLE-RUNTIME
  - M4-GPT-ACADEMIC-CONTENT-RUNTIME
contracts:
  - src/contracts/academic.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/academic-editor-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: M
status: merged
---

# Academic editor detail and people import contracts

Freeze strict editor-detail projections for all six v1 academic resources and
bounded Lecturer/Staff import preview/commit contracts. Detail projections must
contain editable domain fields, locale content/workflow, governance/version,
safe public assets/links, and never storage keys or technical errors.

Import contracts must support a maximum 500 normalized rows, explicit PREVIEW
or COMMIT intent, deterministic per-row results, duplicate identity detection,
formula-safe export cells, all-or-nothing commit reporting, and no arbitrary
Prisma selectors or opaque executable mappings.
