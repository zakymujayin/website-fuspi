---
id: M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: 13909c53f04c91871ed3af70381460908e82b373
allowed_paths:
  - "coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md"
  - "coordination/handoffs/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING-gpt.md"
  - "src/app/[locale]/(public)/page.tsx"
  - "tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts"
forbidden_paths:
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "package.json"
  - "package-lock.json"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "next-env.d.ts"
readonly_paths:
  - "docs/README.md"
  - "docs/18-beranda-editable.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md"
  - "node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md"
contracts:
  - docs/18-beranda-editable.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md TASK_BASE=13909c53f04c91871ed3af70381460908e82b373 npm run check:scope"
risk: medium
token_class: S
status: active
---

# M4 GPT Homepage CMS Dynamic Rendering

Fix the public homepage so CMS-driven sections such as Berita Terbaru and Sorotan/Kolom Akademik are rendered from current database state at request time instead of a stale prerender snapshot.
