# Handoff — M4-CLAUDE-ADMIN-FORM-LAYOUT (Phase 1–4) — claude

- Branch: `ai/claude/m4-admin-form-layout`
- Base SHA: `e951a79` (`ai/gpt/m4-facility-homepage-admin`)
- Head SHA: `fd8196155efbfa0c64428971a6321a5a89043813`

No formal task manifest for this one — user asked directly, in discussion
first (plan mode), then approved direct implementation without a
`coordination/tasks/*.md` lease (same pattern as the admin sidebar restore).

## Result

User complaint: admin create/edit pages are one long single column, content
stretches edge to edge, not "user friendly like WordPress". Root-caused to
two things: (1) `<main>` had no width cap at all, and (2) every editor form
is a flat vertical stack with no visual grouping. Fixed both, then rolled
the fix out to all 17 admin editor forms in two commits:

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
- **Phase 1** (`98245d5`): proved the pattern on 2 forms
  (`posts/post-editor-form.tsx`, `facility/facility-editor-form.tsx`).
- **Phase 2** (`4026786`): rolled the identical pattern out to the
  remaining 15 forms — `home-section`, `home-slider`, `site-setting`,
  `statistic`, `page`, and the 10 `public-content/*-editor-form.tsx` files
  (service, partnership, scholarship, achievement, activity, album,
  document, event, faq, testimonial). All 17 editor forms now use
  `AdminFormLayout`.
- **Phase 3** (`43e4670`): visual QA during Phase 2 found all 10
  `public-content/*-editor-form.tsx` forms rendering literal untranslated
  key paths on screen (pre-existing, not caused by the layout change —
  see the finding recorded below at the time). User asked to continue
  refining and picked this as the top priority. Filled all 56 missing
  `AdminPublicContent.*` keys (id/en/ar) plus 20
  `createDescription`/`editDescription` pairs for the 10 resources' create/
  edit page subtitles, and fixed a doubled-parentheses bug the missing
  `localeOptional` key had been masking. See "Result" detail below.
- **Phase 4** (`fd81961`): fixed the RTL sidebar-overlap bug flagged as a
  known issue since Phase 1. Root cause: `src/components/ui/sidebar.tsx`'s
  fixed-position container keys its physical `left`/`right` offset off an
  explicit `side` prop (default `"left"`), which `AdminSidebarServer`
  never set — so the sidebar always rendered at physical `left:0`
  regardless of `dir="rtl"`, overlapping content that had correctly
  shifted right in the RTL-aware flex flow. Fix: `AdminSidebarServer` now
  reads the locale via `useLocale()` and passes
  `side={locale === "ar" ? "right" : "left"}` — the component's own
  designed, already-tested mechanism for right-hand sidebars (border/rail/
  offcanvas mirroring already key off the same `data-side` attribute).

## Files changed

- `src/components/admin/admin-form-layout.tsx` (new, Phase 1) — the shared
  `AdminFormLayout({main, sidebar})` component: 12-col grid, main
  `lg:col-span-8`, sidebar `lg:col-span-4 lg:sticky lg:top-20`, single
  column below `lg`.
- `src/components/admin/admin-layout-shell.tsx` (Phase 1) — wrapped
  `{children}` in `<div className="mx-auto w-full max-w-[1200px]">`.
- `src/components/admin/posts/post-editor-form.tsx` (Phase 1) — converted
  from 3 simultaneous locale `FieldSet`s to the tabbed locale-switcher
  pattern already used by every other editor form (added
  `AdminPostEditor.localeTabs` i18n key, id/en/ar). Sidebar: Publish card
  (save/cancel/autosave status) → Details card (slug/featured) → cover
  picker card → taxonomy card (category/tags).
- `src/components/admin/facility/facility-editor-form.tsx` (Phase 1) —
  sidebar: Publish card (save/cancel/delete) → Details card
  (slug/type/order/isActive) → media picker card.
- 15 files, Phase 2, same split rule applied per form's existing field
  list (locale-tabbed content → main; slug/status/order/dates/media →
  sidebar Cards; save/cancel/delete → first "Publish" card):
  `home-nav/{home-section,home-slider,site-setting,statistic}-editor-form.tsx`,
  `pages/page-editor-form.tsx`,
  `public-content/{service,partnership,scholarship,achievement,activity,
  album,document,event,faq,testimonial}-editor-form.tsx`.
- `messages/{id,en,ar}.json` (Phase 1) — added `AdminPostEditor.localeTabs`
  (the other 16 forms already had an equivalent key in their own
  namespace — except see the i18n gap noted below).
- `messages/{id,en,ar}.json` (Phase 3) — added 56 missing
  `AdminPublicContent.*` keys (`translations`, `cancel`, `field.*` [21
  sub-keys], `submitCreate`, `submitUpdate`, `submitting`,
  `translationsTitle`, `localeTabsAriaLabel`, `localeOptional`,
  `error.UNAVAILABLE`, and per-resource field labels under
  `FAQ`/`ALBUM`/`DOCUMENT`/`EVENT`/`TESTIMONIAL`) plus 20
  `createDescription`/`editDescription` pairs (one per resource) used by
  `src/app/[locale]/admin/**/{baru,new,[id]/edit}/page.tsx` subtitles.
- `src/components/admin/public-content/{service,partnership,scholarship,
  achievement,activity}-editor-form.tsx` (Phase 3) — removed a redundant
  literal `(...)` wrapper around the `localeOptional` tab badge (the
  translated value already includes parentheses; this rendered
  `((opsional))` once the key stopped being invisible-broken).
- `src/components/admin/admin-sidebar.tsx` (Phase 4) — `AdminSidebarServer`
  now passes `side={locale === "ar" ? "right" : "left"}` to `<Sidebar>`
  instead of relying on the component's LTR-only default.

## Contract/schema/migration impact

None. Pure UI restructuring; no `prisma/**`, `src/features/**`,
`src/contracts/**`, or `src/app/api/**` touched.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Pass — no issues (all 4 phases) |
| `npx tsc --noEmit -p tsconfig.json` | Pass — no errors (all 4 phases) |
| `npm run test` | Pass — 91 files, 1151 tests (all 4 phases) |

**Phase 1 manual verification:** minted a real session directly via
`createDatabaseSession` against the isolated `fuspi_dev_claude` dev
database (no password reset, no shared-DB risk — this DB is per-worktree
per `docs/24`). That database was never fully migrated/seeded before this
session; with the user's explicit consent, ran `prisma migrate reset
--force` + seed against it (affects only this worktree's own dev DB).
Screenshotted `/id/admin/posts/new` and `/id/admin/fasilitas/baru` at
390/768/1024/1440px: zero horizontal overflow at every width, sidebar
correctly stacks below main under `lg` (1024px), sticky sidebar visible
and not overlapping the header at `lg`+. RTL: computed a bounding-rect
diagnostic on `/ar/admin/posts/new` — grid `direction` is `rtl`, sidebar
renders at the visual left, main at the visual right, fully inside the
capped content area — the layout math is correct.

**Phase 2 manual verification:** spot-checked 4 of the 15 rolled-out forms
in a real browser at 1440px (`/id/admin/faq/baru`, `/id/admin/pages/new`,
`/id/admin/beranda/pengaturan`, `/id/admin/testimoni/baru`) — zero
horizontal overflow on all 4. `page-editor-form.tsx` and
`site-setting-editor-form.tsx` render correctly with real translated text
and the intended WordPress-style layout (multiple stacked sidebar Cards
for site-setting: Contact, Dean, Video). This is what surfaced the i18n
gap fixed in Phase 3, below.

**Phase 3 manual verification:** ran a programmatic diff (extract every
`t("...")` call across all 10 `public-content/*-editor-form.tsx` files
and every resource's `page.tsx` under `src/app/[locale]/admin/**`,
resolve each dotted path against the actual parsed JSON) — zero missing
keys in `id`/`en`/`ar` after the fix, versus 56 missing before. Screenshot
re-check of `/id/admin/faq/baru`, `/id/admin/layanan/baru` (id) and
`/en/admin/faq/baru` (en): every previously-broken label now renders real
translated text, the `EN (opsional)` / `AR (opsional)` tab badges show
single parentheses, and the Next.js dev "N Issues" overlay badge — present
in every earlier screenshot — is gone, corroborating that it was tracking
these exact missing-message warnings.

**Phase 4 manual verification:** computed bounding-rect geometry on
`/ar/admin` before/after — `[data-slot="sidebar-container"]` now reports
`data-side="right"` at `x=1184, width=256` (viewport 1440), main content
at `x=0, width=1184` — adjacent, zero overlap. Re-checked `/id/admin`
(LTR) unchanged: `data-side="left"`, `x=0`. Screenshotted `/ar/admin` and
`/ar/admin/posts/new` at 1440px: sidebar nav correctly on the visual
right, breadcrumb/header mirrored, and the Phase 1
`AdminFormLayout`'s own main/sidebar column split (confirmed correct back
in Phase 1 via geometry, but painted under the overlapping shell sidebar
at the time) is now visible and correctly composed with the shell fix —
the two-column form sidebar sits on the visual left with no overlap
anywhere.

## Untested areas

- Only 4 of 15 Phase 2 forms were visually spot-checked (the other 11
  weren't screenshotted individually — lint/typecheck/test cover them,
  but not visual rendering).
- No axe/automated a11y run; relied on reusing existing `Field`/`Card`
  primitives and the already-established locale-tab pattern.
- Phase 3's programmatic key-diff covers every `t("...")` call with a
  static string argument; it can't see genuinely dynamic keys (there
  weren't any found in these files, but a future form using a computed
  key string wouldn't be caught by the same method).
- No Arabic visual check of the Phase 3 i18n fix (only `id`/`en`
  screenshotted).

## Risks and follow-ups

- No RTL visual check yet on the other 16 editor forms with the shell fix
  applied (only `posts/post-editor-form.tsx` was screenshotted in Arabic
  post-fix); the geometry fix is shell-level so it should apply uniformly,
  but not individually re-verified per form.
- The `data-side` fix only covers the admin shell's own sidebar. If any
  other component elsewhere in the codebase independently assumes a
  physical-left sidebar (none found during this fix), it would need the
  same treatment.
- Deferred by explicit user choice, not part of this round: converting
  admin list pages from `<ul><li>` cards to a real `DataTable` (matches
  `docs/04-panel-admin.md`'s own spec, which the current list pages already
  don't meet — pre-existing, unrelated to this task).

## Requested shared changes

None.
