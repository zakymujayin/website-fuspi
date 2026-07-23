---
id: M3-CLAUDE-MEDIA-LIBRARY-BROWSE
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek-v4-pro
base_sha: d3b32d5
allowed_paths:
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/app/[locale]/admin/media/loading.tsx"
  - "src/components/admin/media/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "src/app/globals.css"
  - "src/app/[locale]/layout.tsx"
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/[locale]/admin/page.tsx"
  - "src/components/ui/**"
  - "src/components/public/**"
  - "tests/m3/runtime/**"
  - "tests/security/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "src/contracts/media.ts"
  - "src/contracts/media-admin.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/lib/db/client.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/redirect.ts"
  - "src/components/ui/button.tsx"
  - "src/components/ui/card.tsx"
  - "src/components/ui/container.tsx"
  - "src/components/ui/spinner.tsx"
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/globals.css"
  - "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/03-components/image.md"
depends_on:
  - M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME
  - M3-DEEPSEEK-MEDIA-ADMIN-TRANSPORT-RUNTIME-REVIEW
contracts:
  - src/contracts/media.ts
  - src/contracts/media-admin.ts
  - src/lib/content/media-admin-transport.ts
acceptance_commands:
  - npx vitest run tests/m3/ui/admin-media-library-browse.test.tsx
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-CLAUDE-MEDIA-LIBRARY-BROWSE.md TASK_BASE=origin/coordination/m3-claude-media-library-browse-assignment npm run check:scope
risk: medium
token_class: L
status: assigned
---

# M3 Claude Media Library Browse

Implement the first bounded admin Media presentation at `/{locale}/admin/media`: a read-only,
server-rendered library grid with kind filters, bounded pagination, useful metadata, loading,
empty, and unavailable states. This task deliberately excludes picker dialogs, upload, metadata
editing, copy-to-clipboard, deletion, Tiptap integration, Post editor work, and browser E2E. Those
mutating/interactive slices open separately after the required UI primitives and toast dependency
are leased.

Before changing framework behavior, read the three listed local Next.js 16 guides completely.
Run `npx shadcn@latest info` only to inspect project context; do not add or modify shadcn components
in this task.

## Data and trust-boundary requirements

1. Keep `page.tsx` a Server Component. Resolve async `params` and `searchParams`, validate locale
   through the existing auth locale helper, and enforce the same protected-route session decision
   as the current admin landing page before loading any Media data.
2. Consume only `listAdminMedia(getPrismaClient(), session, query, UPLOAD_PUBLIC_URL)`. Never query
   Prisma directly, call the internal HTTP route from the server, widen the frozen contracts, or
   infer ownership in the UI. ADMIN sees the server-authorized page; EDITOR remains uploader-owned.
3. Accept only one bounded `page` and `kind=ALL|IMAGE|PDF`, with fixed `pageSize=24`. Unknown,
   repeated, array, empty, negative, fractional, or excessive parameters must fail safely to a
   canonical default without reflecting untrusted input or exposing whether hidden Media exists.
4. Catch environment/database/contract failures at the route boundary and render translated,
   non-technical unavailable copy. Never expose database details, filesystem roots, storage keys,
   session values, stack traces, raw exceptions, or internal failure codes in HTML/RSC payloads.
5. Treat `AdminMediaListResult` as the only display shape. Do not add uploader email/ID, direct
   database fields, reference counts, delete eligibility, or totals outside the returned contract.

## Presentation requirements

1. Use a restrained **academic editorial archive** direction: crisp typographic hierarchy,
   generous breathing room, an orderly but not generic dashboard grid, Royal Blue used sparingly,
   and one quiet brass rule/detail. Reuse the installed FUSPI fonts/tokens and existing components;
   no gradients, decorative blobs, fake analytics, oversized KPI numerals, or new global styles.
2. Provide one H1, a short translated explanation, total count, accessible ALL/IMAGE/PDF filter
   links, a responsive grid, and server pagination. Preserve the active locale and filter in links.
   At 360 px the page must not scroll horizontally; at wide sizes the content should remain calm
   and readable rather than stretching cards excessively.
3. Each item shows a safe thumbnail or an intentional PDF/image placeholder, original filename,
   type, human-readable size, dimensions when present, accessibility state/alt text, uploader label
   when present, and `Asia/Jakarta` creation time formatted for ID/EN/AR. Long names and alt text
   wrap or clamp without layout breakage.
4. Render an image only when the frozen validated URL can be converted to a same-origin/local
   `/uploads/...` source compatible with the existing Next image configuration. Otherwise render
   a meaningful placeholder. Do not modify `next.config.ts`, bypass image validation, or expose a
   private/raw path.
5. Empty and unavailable states must be visually intentional and accessible. Loading skeletons
   should resemble the grid and remain hidden appropriately from assistive technology. Do not show
   upload/edit/delete controls that do nothing in this read-only slice.
6. Add only the required `AdminMediaLibrary` strings to all three message files. Arabic copy must
   be genuine Arabic and the markup must use logical direction utilities only. No `ml/mr/pl/pr`,
   `left/right`, or physical directional styling; directional icons mirror in RTL, media does not.
7. Preserve the admin layout's landmark ownership: do not add a second `<main>`. Keep visible focus,
   descriptive link names, semantic list/grid structure, WCAG AA contrast, and reduced-motion-safe
   behavior from the first commit.

## Focused verification

Add deterministic tests for query normalization, locale-preserving filter/pagination links,
Jakarta date and byte formatting, safe local thumbnail conversion versus placeholder, empty and
unavailable copy without technical disclosure, accessible item semantics, and Arabic logical/RTL
markup. Tests must not require production data or contain personal information.

Finish with a committed handoff and stop. Do not merge, edit task status/lease, open the picker or
mutation slice, start a reviewer task, or change any backend/shared contract.
