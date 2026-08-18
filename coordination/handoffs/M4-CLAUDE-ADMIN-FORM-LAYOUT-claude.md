# Handoff — M4-CLAUDE-ADMIN-FORM-LAYOUT (Phase 1) — claude

- Branch: `ai/claude/m4-admin-form-layout`
- Base SHA: `e951a79` (`ai/gpt/m4-facility-homepage-admin`)
- Head SHA: `98245d546547732ac1b153234d6cbdfe005471cb`

No formal task manifest for this one — user asked directly, in discussion
first (plan mode), then approved direct implementation without a
`coordination/tasks/*.md` lease (same pattern as the admin sidebar restore).

## Result

User complaint: admin create/edit pages are one long single column, content
stretches edge to edge, not "user friendly like WordPress". Root-caused to
two things: (1) `<main>` had no width cap at all, and (2) every editor form
is a flat vertical stack with no visual grouping. Fixed both:

- Capped admin `<main>` at `max-w-[1200px]` (matches `docs/03`/`docs/17`'s
  documented admin content width) — independent, immediate fix for the
  literal "melebar" complaint.
- Built `AdminFormLayout`, a WordPress-style split: wide main content
  column + narrow sticky sidebar of short/boxed fields. `docs/17` explicitly
  specifies single-column for long forms and reserves 2-column layouts for
  short paired fields — this respects that by keeping each column
  single-column internally, just splitting *sections* into two columns, not
  individual fields. Mirrors the 12-col grid pattern already used on
  `src/app/[locale]/(public)/berita/[slug]/page.tsx`.
- Applied it to 2 of 17 editor forms as Phase 1 proof (see below). The other
  15 are queued for Phase 2, same mechanical pattern.

## Files changed

- `src/components/admin/admin-form-layout.tsx` (new) — the shared
  `AdminFormLayout({main, sidebar})` component.
- `src/components/admin/admin-layout-shell.tsx` — wrapped `{children}` in
  `<div className="mx-auto w-full max-w-[1200px]">`.
- `src/components/admin/posts/post-editor-form.tsx` — converted from 3
  simultaneous locale `FieldSet`s to the tabbed locale-switcher pattern
  already used by every other editor form (added `AdminPostEditor.localeTabs`
  i18n key, id/en/ar). Main column: locale tabs + title/excerpt/content.
  Sidebar: Publish card (save/cancel/autosave status) → Details card
  (slug/featured) → cover picker card → taxonomy card (category/tags).
- `src/components/admin/facility/facility-editor-form.tsx` — main column:
  translations (already tabbed). Sidebar: Publish card (save/cancel/delete)
  → Details card (slug/type/order/isActive) → media picker card.
- `messages/{id,en,ar}.json` — added `AdminPostEditor.localeTabs` (the other
  16 forms already had an equivalent key in their own namespace).

## Contract/schema/migration impact

None. Pure UI restructuring; no `prisma/**`, `src/features/**`,
`src/contracts/**`, or `src/app/api/**` touched.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Pass — no issues |
| `npx tsc --noEmit -p tsconfig.json` | Pass — no errors |
| `npm run test` | Pass — 91 files, 1151 tests |

Manual browser verification: minted a real session directly via
`createDatabaseSession` against the isolated `fuspi_dev_claude` dev database
(no password reset, no shared-DB risk — this DB is per-worktree per
`docs/24`). That database was never fully migrated/seeded before this
session; with the user's explicit consent, ran `prisma migrate reset
--force` + seed against it (affects only this worktree's own dev DB).

Screenshotted `/id/admin/posts/new` and `/id/admin/fasilitas/baru` at
390/768/1024/1440px: zero horizontal overflow at every width, sidebar
correctly stacks below main under `lg` (1024px), sticky sidebar visible and
not overlapping the header at `lg`+. Confirmed the icon-collapsed mobile
sidebar rail doesn't cause overflow either.

RTL: computed a bounding-rect diagnostic on `/ar/admin/posts/new` — the
grid's `direction` is `rtl`, sidebar column renders at the visual left
(x=24–387px), main column at the visual right (x=410–1160px), fully inside
the 1136px-wide capped content area. The layout math is correct.

## Untested areas

- Phase 2 (15 remaining forms) not started yet — see follow-ups.
- No axe/automated a11y run; relied on reusing existing `Field`/`Card`
  primitives and the already-established locale-tab pattern.
- English/mixed-locale visual check not done (only `id` screenshotted
  directly; `ar` was geometry-only, not full visual inspection because of
  the pre-existing overlap bug below making full-page screenshots
  misleading).

## Risks and follow-ups

- **Found, not fixed (pre-existing, out of this task's scope):** in Arabic
  (`dir="rtl"`), the admin shell's dark sidebar nav (`src/components/ui/
  sidebar.tsx` / `admin-layout-shell.tsx`, from the earlier
  `M4-CLAUDE-ADMIN-SIDEBAR-RESTORE` task) renders at a fixed **physical**
  left position instead of a logical inline-start position, so it visually
  overlaps the left edge of any page's content in RTL. Confirmed this is
  unrelated to this task's changes by screenshotting the untouched `/ar/
  admin` dashboard — same overlap there. This needs its own fix in the
  sidebar/shell components, not here.
- Phase 2: roll out `AdminFormLayout` to the remaining 15
  `src/components/admin/**/*editor-form.tsx` files (`home-section`,
  `home-slider`, `site-setting`, `statistic`, `page`, and the 10 under
  `public-content/`). Same split rule: locale-tabbed content → main,
  everything else (status/order/visibility/media/relations) + save/cancel →
  sidebar Cards. Skip the sidebar entirely (keep single column) for any form
  with nothing sidebar-worthy left over.
- Deferred by explicit user choice, not part of this round: converting
  admin list pages from `<ul><li>` cards to a real `DataTable` (matches
  `docs/04-panel-admin.md`'s own spec, which the current list pages already
  don't meet — pre-existing, unrelated to this task).

## Requested shared changes

None.
