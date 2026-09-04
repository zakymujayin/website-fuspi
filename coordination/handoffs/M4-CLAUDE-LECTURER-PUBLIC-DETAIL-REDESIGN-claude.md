# Handoff — M4-CLAUDE-LECTURER-PUBLIC-DETAIL-REDESIGN — claude

- Branch: `ai/claude/m5-lecturer-profile-redesign`
- Base SHA: `ec608aa8cfa7933711d397cf08ebec3f4a348e77`
- Head SHA: `f1ca8790d7e62ab32ea26f3ebd2399d10ab8e17b` (implementation)
- Handoff commit: `4a8a3117d9a2f4baec83ae6bff0a38577e5a0a35`

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

### Third follow-up — rebuild the identity card to match the reference

User supplied the actual reference (FK USU lecturer page) and pointed out the
identity card was missing fields the reference shows. Rebuilt the sticky card
to carry the full labelled stack, one field per row (`CardField` helper: small
grey label + content):

photo → name → NIP → NIDN → Program Studi (chip) → Bidang keahlian (chips) →
Jabatan (chip) → Media Penelitian (Scholar/SINTA/Scopus/LinkedIn/Instagram
icon links, merged from the old `scholarLinks` + `socialLinks`) → Kontak
(e-mail + phone) → Alamat Kantor → Jam konsultasi → Curriculum Vitae
(download link).

- The separate floating "Kontak" and "Profil ilmiah" sub-cards and the
  full-width blue CV button below the card are gone — all consolidated into
  the one card, as the reference does.
- Hero band is now the lecturer name only. Position and study program are no
  longer shown there (they live once, in the card), so nothing on the page is
  duplicated. (The reference hero shows only name fragments; we can't split
  `name`, so the whole string is the h1 — see the name-parts follow-up above.)
- New `LecturerProfile` message keys: `position`, `researchMedia`,
  `officeAddress`, `curriculumVitae` (id/en/ar). `Academic.scheduleProgram`
  reused for the "Program Studi" label, `expertise` for "Bidang keahlian".
- Removed the now-unused `#lecturer-contact` / `#lecturer-scholar` section ids
  (nothing linked to them). `#lecturer-education` / `#lecturer-publications`
  and the records-component anchors are unchanged.
- Updated `public-lecturer-detail-redesign.test.tsx`: the NIP/NIDN assertion
  now matches `label="NIP"` / `label="NIDN"` (the CardField prop) instead of
  the old `>NIP<` text node.

Risk: `messages/*.json` was touched (4 additive keys in `LecturerProfile`).
This branch *is* `M4-GPT-PUBLIC-IA-MENU-REMAP`, which holds a messages lease,
so the edit is in-lane, but `M4-CLAUDE-PAGE-ADMIN-UI` also holds a messages
lease — the keys are additive and in a public-profile namespace it does not
touch, so a merge conflict is unlikely but possible.

Verified: `npm run lint`, `npx tsc --noEmit`, `npm run test` (135 files /
1,460 tests), `npm run build` — all pass, no warnings. Rendered locally
against `/id/dosen/dr-agus-ali-dzawafi-m-fil-i` (most seeded lecturers are
draft/inactive and 404); the card fields render in the correct order and the
page has no horizontal scroll.

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

### Fourth follow-up — finish the detail-page visual pass

- Hero is now a semantic header with an explicit study-program eyebrow: code,
  resolved program name, lecturer name, and position are grouped into one
  readable identity band. The stored lecturer name is rendered intact rather
  than split on commas, so academic suffixes and names with punctuation remain
  correct.
- The sticky identity card now uses a grid gap instead of the legacy
  `space-y-*` utility.
- Research, community service, HKI, and teaching records now share the same
  elevated white panel shell as biography, education, and publications. Their
  inner lists retain the hairline separators without a nested tinted card,
  improving hierarchy and reducing card-within-card repetition.
- Added structural test coverage for the hero's study-program code and name.

Files changed in this follow-up:

- `src/app/[locale]/(public)/dosen/[id]/page.tsx`
- `src/components/public/lecturer-academic-records.tsx`
- `tests/m4/ui/public-lecturer-detail-redesign.test.tsx`

Verification for this follow-up:

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/public-lecturer-detail-redesign.test.tsx src/components/public/lecturer-profile-utils.test.ts` | passed, 2 files / 10 tests |
| `npm run lint` | passed |
| `npx tsc --noEmit` | passed |
| `npm run test` | passed, 139 files / 1,488 tests |
| `npm run build` | passed; lecturer detail route compiled |
| `git diff --check` | passed |

Untested: a live browser screenshot was not captured because the local dev
server did not remain available in the sandbox after startup; no data,
fetching, authorization, or academic-record sorting behavior was changed.

### Fifth follow-up — accessibility and spacing polish

- Replaced the remaining `space-y-*` utilities in the profile card and
  publication groups with grid gaps, keeping the page aligned with the
  project's spacing convention.
- Added explicit visible focus treatment to publication, contact, and return
  links, and gave the academic-period select the same rounded control language
  used elsewhere in the public UI.
- No data, fetching, sorting, anchor, or locale behavior changed.

Latest implementation commit: `205d033`.

Verification: targeted redesign tests (10/10), lint, typecheck, full suite
(139 files / 1,488 tests), and `git diff --check` all passed. The production
build had already passed after the preceding visual pass; this follow-up only
changes utility classes and focus states.
