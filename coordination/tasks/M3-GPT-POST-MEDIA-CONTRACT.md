---
id: M3-GPT-POST-MEDIA-CONTRACT
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: gpt
base_sha: f83a00e6816a91f72b9ade654b012be8a1a0b2d0
allowed_paths:
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "tests/m3/contracts/**"
  - "coordination/handoffs/M3-GPT-POST-MEDIA-CONTRACT-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/lib/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/security.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/security/sanitize.ts"
  - "src/lib/storage/staged-file.ts"
depends_on:
  - M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY
  - M2-GPT-NPM10-FINAL-LOCK-CORRECTION
contracts:
  - prisma/schema.prisma
  - src/contracts/auth.ts
  - src/contracts/platform.ts
  - src/contracts/storage.ts
  - src/lib/auth/permission-matrix.ts
  - src/lib/db/optimistic-lock.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-POST-MEDIA-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-post-media-contract-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 GPT Post + Media Contract Freeze

Define and test the frozen trust-boundary contract for the M3 reference slice. Use the existing
Prisma schema and M2 platform primitives as immutable dependencies; do not create a parallel
domain model or change a dependency.

The contract must cover:

- Post create, update, draft autosave, publish-now, schedule, archive, and public query inputs;
- Media record/upload intent and staged-file commit/rollback result contracts;
- ID as the mandatory content translation, optional EN/AR translations, and explicit fallback
  metadata without duplicating a parent record;
- strict Post type/status/locale/slug/SEO/rich-text/Media identifiers and bounded pagination;
- caller-owned `authorId`, `uploaderId`, roles, permissions, and bypass flags excluded from every
  untrusted payload;
- an explicit `expectedVersion` on conflict-sensitive mutations and a stable conflict outcome;
- stable, non-sensitive result/error codes usable by server actions, UI, and adversarial tests;
- public-read semantics that expose only `PUBLISHED` content whose `publishedAt` is not future;
- ownership/data-scope intent for ADMIN versus EDITOR without treating UI visibility as
  authorization.

Write focused contract tests that reject unknown fields, privilege injection, missing Indonesian
content, invalid transitions, invalid dates, unsafe pagination, and malformed Media metadata.
Do not implement services, database queries, route handlers, Server Actions, Tiptap, UI, or M3
feature E2E in this task. Finish with a committed handoff and stop for independent review.
