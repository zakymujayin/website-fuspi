---
id: M4-GPT-FACILITY-HOMEPAGE-ADMIN
milestone: M4
title: Wire homepage facilities to Facility backend and add admin management pages
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: main
base_sha: 1c3df17ed99cdbe6c04f24b20a30836e3d6f518a
depends_on: []
spec_refs:
  - docs/18-beranda-editable.md
allowed_paths:
  - "coordination/tasks/M4-GPT-FACILITY-HOMEPAGE-ADMIN.md"
  - "coordination/handoffs/M4-GPT-FACILITY-HOMEPAGE-ADMIN-gpt.md"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "prisma/seed.ts"
  - "src/contracts/facility.ts"
  - "src/contracts/home-nav.ts"
  - "src/contracts/post-admin.ts"
  - "src/features/facility/**"
  - "src/features/public-content/shared.ts"
  - "src/features/home-nav/public-query.ts"
  - "src/features/home-nav/admin-detail.ts"
  - "src/lib/content/post-admin-transport.ts"
  - "src/app/[locale]/admin/kolom/**"
  - "src/app/api/admin/posts/route.ts"
  - "src/app/api/admin/posts/[postId]/route.ts"
  - "src/app/[locale]/(public)/page.tsx"
  - "src/app/[locale]/(public)/profil/fasilitas/page.tsx"
  - "src/app/[locale]/admin/fasilitas/**"
  - "src/app/[locale]/admin/posts/page.tsx"
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/app/api/admin/facilities/route.ts"
  - "src/components/admin/admin-sidebar-data.ts"
  - "src/components/admin/facility/**"
  - "src/components/admin/media/media-thumbnail-resolver.ts"
  - "src/components/admin/posts/**"
  - "src/components/admin/home-nav/home-slider-editor-payload.ts"
  - "src/components/admin/home-nav/home-slider-editor-form.tsx"
  - "src/components/public/flow-line.tsx"
  - "src/components/public/facilities-section.tsx"
  - "messages/**"
  - "tests/m3/contracts/post-admin-transport-contract.test.ts"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "tests/m3/ui/admin-post-cover-picker.test.tsx"
  - "tests/m3/ui/admin-post-delete.test.tsx"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "tests/m3/ui/admin-post-list.test.tsx"
  - "tests/m3/ui/admin-post-publication-actions.test.tsx"
  - "tests/m4/contracts/facility-contracts.test.ts"
  - "tests/m4/runtime/facility-domain.test.ts"
  - "tests/m4/ui/admin-legacy-media-preview.test.ts"
  - "tests/m4/ui/home-slider-editor-form.test.ts"
contracts:
  - src/contracts/facility.ts
  - src/contracts/home-nav.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
  - npm run build
token_class: M
status: active
---

## Intent

Facilities shown on the homepage must be managed from the CMS instead of the
legacy `fasilitas-kampus` album photo shortcut. Reuse the existing `Facility`
schema/domain/API, add the missing admin pages/actions, and expose a homepage
loader that respects locale, publication state, ordering, and the editable home
section visibility/limit.
