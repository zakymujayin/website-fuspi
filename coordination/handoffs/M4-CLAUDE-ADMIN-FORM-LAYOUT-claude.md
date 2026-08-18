# Handoff — M4-CLAUDE-ADMIN-FORM-LAYOUT (Phase 1 + 2 + 3) — claude

- Branch: `ai/claude/m4-admin-form-layout`
- Base SHA: `e951a79` (`ai/gpt/m4-facility-homepage-admin`)
- Head SHA: `43e4670050f9bbdc5222e2ff9ccfce52994c2004`

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

## Contract/schema/migration impact

None. Pure UI restructuring; no `prisma/**`, `src/features/**`,
`src/contracts/**`, or `src/app/api/**` touched.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Pass — no issues (all 3 phases) |
| `npx tsc --noEmit -p tsconfig.json` | Pass — no errors (all 3 phases) |
| `npm run test` | Pass — 91 files, 1151 tests (all 3 phases) |

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

- **Found in Phase 1, still unfixed (pre-existing, out of this task's
  scope):** in Arabic (`dir="rtl"`), the admin shell's dark sidebar nav
  (`src/components/ui/sidebar.tsx` / `admin-layout-shell.tsx`, from the
  earlier `M4-CLAUDE-ADMIN-SIDEBAR-RESTORE` task) renders at a fixed
  **physical** left position instead of a logical inline-start position,
  so it visually overlaps the left edge of any page's content in RTL.
  Confirmed unrelated to this task by screenshotting the untouched `/ar/
  admin` dashboard — same overlap there. Needs its own fix in the
  sidebar/shell components.
- Deferred by explicit user choice, not part of this round: converting
  admin list pages from `<ul><li>` cards to a real `DataTable` (matches
  `docs/04-panel-admin.md`'s own spec, which the current list pages already
  don't meet — pre-existing, unrelated to this task).

## Requested shared changes

None.
