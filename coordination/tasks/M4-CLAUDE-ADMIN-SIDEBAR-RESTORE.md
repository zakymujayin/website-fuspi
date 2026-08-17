---
id: M4-CLAUDE-ADMIN-SIDEBAR-RESTORE
milestone: M4
title: Restore admin sidebar shell and remove top menu navigation
risk: medium
owner: claude
reviewer: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 8bc5cce7ed63e7aa20a282ed14d2c3954f27b353
depends_on:
  - M4-GPT-FACILITY-HOMEPAGE-ADMIN
spec_refs:
  - docs/03-design-system.md
  - docs/04-panel-admin.md
allowed_paths:
  - "src/app/[locale]/admin/layout.tsx"
  - "src/components/admin/admin-header.tsx"
  - "src/components/admin/admin-layout-shell.tsx"
  - "src/components/admin/admin-sidebar-data.ts"
  - "src/components/admin/admin-sidebar.tsx"
  - "src/components/admin/admin-nav.tsx"
  - "src/components/ui/avatar.tsx"
  - "src/components/ui/dropdown-menu.tsx"
  - "src/components/ui/separator.tsx"
  - "src/components/ui/sheet.tsx"
  - "src/components/ui/sidebar.tsx"
  - "src/components/ui/skeleton.tsx"
  - "src/components/ui/tooltip.tsx"
  - "src/hooks/use-mobile.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "coordination/handoffs/M4-CLAUDE-ADMIN-SIDEBAR-RESTORE-claude.md"
readonly_paths:
  - "coordination/tasks/M4-CLAUDE-ADMIN-SIDEBAR-RESTORE.md"
  - "src/app/[locale]/admin/fasilitas/**"
  - "src/components/admin/facility/**"
  - "src/features/facility/**"
  - "src/contracts/facility.ts"
  - "prisma/**"
forbidden_paths:
  - "package*.json"
  - ".env*"
  - "src/features/**"
  - "src/contracts/**"
  - "src/app/api/**"
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
status: assigned
---

## GPT approval

Approved direction: admin navigation must be the Claude sidebar shell, not the
legacy wrapped top menu. The top menu is only present because current `main`
still renders `AdminNav` in `src/app/[locale]/admin/layout.tsx`.

## Required change

Port the admin shell/sidebar implementation from
`ai/claude/review-dirty-work-20260817` onto the current branch/base:

- `src/app/[locale]/admin/layout.tsx`
- `src/components/admin/admin-layout-shell.tsx`
- `src/components/admin/admin-sidebar.tsx`
- `src/components/admin/admin-sidebar-data.ts`
- `src/components/admin/admin-header.tsx`
- required shadcn/sidebar support files already listed in `allowed_paths`

Remove the top-menu experience from admin pages. `AdminNav` may be deleted or
left unused only if there is no dead import/render path.

## Must keep

- Keep the newly added facility admin route `/admin/fasilitas`.
- Add `Fasilitas` to the sidebar data, preferably in a relevant homepage/content
  group, pointing to `/admin/fasilitas`.
- Keep existing facility backend/schema/domain/API untouched.
- Do not reintroduce the stale dirty-branch schema changes for SiteSetting,
  HomeVideo, Facility, or public-content version fields.

## Notes

The reference sidebar work exists in commit `419e94c` on
`ai/claude/review-dirty-work-20260817`, but that branch must not be merged
wholesale. Port only the admin shell/sidebar UI pieces and reconcile messages
with current branch state.
