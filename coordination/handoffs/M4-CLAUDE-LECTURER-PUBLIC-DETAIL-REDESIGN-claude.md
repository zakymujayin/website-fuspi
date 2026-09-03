# Handoff — M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN — claude

- Branch: `ai/gpt/m4-public-ia-menu-remap`
- Base SHA: `ec608aa8cfa7933711d397cf08ebec3f4a348e77`
- Head SHA: (see commit accompanying this handoff)

## Result

Redesigned the public lecturer detail page (`/dosen/[id]`) around a reference
layout the user supplied: a tinted hero band, a compact sticky identity card,
and hairline-separated record panels, restyled to FUSPI's royal/navy palette
instead of the reference's own colors.

- Added a `lecturer-hero` band (study-program code + NIDN/NIP eyebrow, name,
  position) above the two-column layout, replacing the plain `<header>`.
- Rebuilt the sticky identity card: photo, repeated name, NIP and NIDN as
  separate `<dl>` rows (previously collapsed into one "NIDN X" *or* "NIP X"
  line), then a chip row (study program, each expertise tag via the new
  `splitExpertiseTags` helper, and position/jabatan), then social links.
- Dropped the standalone "Bidang keahlian" prose section from the right
  column — expertise now only appears once, as chips in the identity card,
  removing the prior duplication.
- Moved the Arabic quote block from the old header into the top of the right
  column (unchanged markup/behavior, just relocated).
- Publications now render inside a `rounded-2xl border bg-slate-50/70` panel
  with `divide-y` hairlines between rows and a count badge in the section
  header, instead of a bare `space-y-8` list.
- Applied the same hairline-panel treatment to the research, community, and
  HKI lists in `LecturerAcademicRecords` (styling only — props, labels, the
  semester filter, and the `#lecturer-*` anchors are unchanged).

## Files changed

- `src/app/[locale]/(public)/dosen/[id]/page.tsx`
- `src/components/public/lecturer-academic-records.tsx`
- `src/components/public/lecturer-profile-utils.ts` (new)
- `src/components/public/lecturer-profile-utils.test.ts` (new)
- `tests/m4/ui/public-lecturer-detail-redesign.test.tsx` (new)
- `coordination/tasks/M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN.md` (new)
- `coordination/handoffs/M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN-claude.md` (new)

## Contract/schema/migration impact

None. Presentation-only change; the Prisma select, sorting, and data shapes
returned to `LecturerAcademicRecords` are untouched.

## Verification

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/public-lecturer-detail-redesign.test.tsx src/components/public/lecturer-profile-utils.test.ts` | passed, 2 files / 10 tests |
| `npm run lint` | passed, no issues |
| `npx tsc --noEmit` | passed, no errors |
| `npm run test` | passed, 135 files / 1,460 tests |
| `git diff --check` | passed, no whitespace errors |

## Untested areas

- No visual regression/screenshot test was added; fidelity to the supplied
  reference image was checked by hand against the rendered markup and
  Tailwind classes, not a live browser render.
- RTL rendering (Arabic locale) was not manually screenshotted for this
  change; existing `dir="auto"`/logical-property conventions were preserved
  throughout.

## Risks and follow-ups

- `messages/*.json` was intentionally left untouched — every new label reuses
  an existing `LecturerProfile`/`Academic` translation key, so there is no
  overlap with the active `messages/*.json` leases held by
  `M4-CLAUDE-PAGE-ADMIN-UI` and `M4-GPT-PUBLIC-IA-MENU-REMAP`.
- Splitting a lecturer's full name into title/given-name/degree-suffix parts
  (as the reference image does) was intentionally not attempted: `name` is
  stored as a single free-text field, and guessing a split would misrender
  names that don't follow the reference's exact pattern. If per-field name
  parts are wanted, that needs a schema/contract decision first.

## Requested contract/dependency changes

None.

---

## Follow-up — reduce repetition and remove the forced horizontal scroll

User feedback on the first pass: the study program and position/jabatan were
repeated across the page, and the academic-record nav rendered a permanent
horizontal scrollbar on desktop.

- Hero band: dropped the ALL-CAPS `studyProgram.code · NIDN` eyebrow. The band
  now reads name → position → "Program Studi: <full program name>", resolving
  the code to its `institution.studyPrograms` name (e.g. `IAT` → "Ilmu
  Al-Qur'an dan Tafsir"). NIP/NIDN stay only in the identity card `<dl>`.
- Identity card: the chip row no longer repeats the study program or the
  position. It now shows only the expertise tags, under a small "Bidang
  keahlian" label. Study program and position each appear exactly once on the
  page (in the hero); expertise appears once (card chips).
- No-photo identity card: replaced the tall `aspect-[4/5]` grey placeholder
  with a compact circular initial avatar so a lecturer without a photo no
  longer gets a large empty block.
- `LecturerAcademicRecords` nav: removed `overflow-x-auto` + `min-w-max`; the
  four section links are now a `flex flex-wrap` row of pill links that wrap
  instead of scrolling. Anchors (`#lecturer-research` etc.) unchanged.

Files: `src/app/[locale]/(public)/dosen/[id]/page.tsx`,
`src/components/public/lecturer-academic-records.tsx`. No new translation keys
(`Academic.scheduleProgram` reused for the hero label). No contract/schema
impact.

Verification: `npm run lint`, `npx tsc --noEmit`, `npm run test`
(135 files / 1,460 tests), `npm run build` — all pass, no warnings. Not
screenshotted: this worktree has no `.env`/database, so `/dosen/[id]` cannot
render locally here; the change was checked against the JSX and existing
structural test.

### Second follow-up — drop the in-page section nav

User still found the wrapped pill nav weak ("blends into the background", the
`0` count badges advertise emptiness). Removed the `<nav>` from
`LecturerAcademicRecords` entirely — the four sections render directly below
their own headings, so the jump links were redundant chrome. Also removed the
now-unused `navigationLabel` label (from the component's `Labels` type and the
page's `labels` object; the `LecturerProfile.navigationLabel` message key is
left in place, unused). Added `rounded-lg` to the four section-header icon
badges (were sharp squares). `#lecturer-*` anchors unchanged. Same
verification commands, all green.
