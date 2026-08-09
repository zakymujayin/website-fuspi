---
id: M4-GPT-BACKEND-V1-INVENTORY
milestone: M4
owner: gpt
reviewer: milestone-review
tester: gpt
base_branch: integration/m4-features
base_sha: ffb0e6cc6d44bf8462692f00e62d81e913eb509c
allowed_paths:
  - "coordination/reviews/M4-BACKEND-V1-INVENTORY-gpt.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "coordination/handoffs/M4-GPT-BACKEND-V1-INVENTORY-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
  - ".github/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/01-arsitektur.md"
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "docs/05-halaman-publik.md"
  - "docs/06-autentikasi-role.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/10-menu-branding-referensi.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/13-celah-fitur-keamanan-operasional.md"
  - "docs/14-sistem-tiket-pengaduan-ppks.md"
  - "docs/15-peminjaman-gedung-jadwal.md"
  - "docs/16-audit-kelengkapan.md"
  - "docs/18-beranda-editable.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "docs/23-integrasi-sila-e-layanan.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "src/app/api/**"
  - "src/contracts/**"
  - "src/features/**"
  - "src/lib/**"
  - "tests/**"
  - "coordination/milestones/**"
  - "coordination/reviews/**"
  - "coordination/handoffs/**"
depends_on:
  - M4-GPT-PAGE-BACKEND
contracts:
  - docs/README.md
  - prisma/schema.prisma
acceptance_commands:
  - "test -s coordination/reviews/M4-BACKEND-V1-INVENTORY-gpt.md"
  - "test -s coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "git diff --check"
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-BACKEND-V1-INVENTORY.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: L
status: merged
---

# M4 GPT backend v1 inventory

Produce an evidence-backed inventory of every backend capability required for
FUSPI v1. Distinguish schema presence, migration presence, shared primitives,
domain implementation, transport/API implementation, PostgreSQL proof,
security proof, and release readiness. Do not equate a Prisma model with a
completed backend.

Create an ordered backend-first roadmap of bounded contract and implementation
tasks. Exclude Course/Curriculum, SILA API, SILA SSO, and historical-site import
from v1. Preserve the five-program identity contract. Record dependencies,
security/concurrency blockers, expected API surfaces, and acceptance evidence
so subsequent coding tasks can start without guessing.
