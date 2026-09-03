---
id: M4-GPT-DATE-FORMAT-STANDARDIZATION
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 745a28e
allowed_paths:
  - "src/lib/format/date.ts"
  - "src/components/public/post/format.ts"
  - "src/components/public/public-content-card.tsx"
  - "src/components/public/complaint/complaint-track-form.tsx"
  - "src/components/public/booking/booking-track-form.tsx"
  - "src/components/admin/posts/post-format.ts"
  - "src/components/admin/pages/page-format.ts"
  - "src/components/admin/media/media-format.ts"
  - "src/components/admin/lecturer/lecturer-academic-records-manager.tsx"
  - "src/app/[locale]/admin/peminjaman/page.tsx"
  - "src/app/[locale]/admin/pengaduan/ppks/page.tsx"
  - "src/app/[locale]/admin/pengaduan/ppks/[id]/page.tsx"
  - "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"
  - "src/app/[locale]/(public)/album/[slug]/page.tsx"
  - "src/app/[locale]/(public)/agenda/[slug]/page.tsx"
  - "src/app/[locale]/(public)/beasiswa/[slug]/page.tsx"
  - "src/app/[locale]/(public)/kegiatan/[slug]/page.tsx"
  - "src/app/[locale]/(public)/kerjasama/[slug]/page.tsx"
  - "src/app/[locale]/(public)/prestasi/[slug]/page.tsx"
  - "src/app/[locale]/(public)/pengumuman/page.tsx"
  - "src/app/[locale]/(public)/kolom/page.tsx"
  - "tests/m4/ui/date-format-standardization.test.ts"
  - "tests/m3/ui/admin-post-list.test.tsx"
  - "tests/m3/ui/public-post-experience.test.tsx"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "tests/m4/ui/public-content/public-content-card.test.tsx"
  - "coordination/tasks/M4-GPT-DATE-FORMAT-STANDARDIZATION.md"
  - "coordination/handoffs/M4-GPT-DATE-FORMAT-STANDARDIZATION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "src/generated/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "coordination/ownership.yml"
depends_on: []
contracts: []
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
risk: medium
token_class: L
status: complete
---

# Date format standardization

Standardize user-facing date and timestamp presentation to `dd/mm/yyyy` and
`dd/mm/yyyy HH:mm` in Asia/Jakarta, while preserving machine-readable ISO
values used by APIs, storage keys, exports, and native date inputs.
