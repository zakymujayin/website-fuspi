# Lecturer profile: public redesign and admin backend completion

**Date:** 2026-09-04
**Status:** Design — pending implementation plan
**Branch:** `ai/claude/m5-lecturer-profile-redesign`
**Base SHA:** `8a7bbf08c272ba8fbdb88df6c6225f5abc827c9e`
**Author:** session (driven by product owner)

## 1. Problem

Three separate defects in the lecturer profile surface, plus one gap in the admin write path.

### 1.1 The public detail page reads as flat, uncontained content

`src/app/[locale]/(public)/dosen/[id]/page.tsx` renders on a white page ground. Its section
cards use `bg-slate-50/70` — a ~4% tint against white, effectively invisible. Two sections
(Biography, Education) have **no container at all**. The result is a single undifferentiated
column of text that "menyatu dengan background".

The reference layout the product owner supplied (a faculty personnel page) separates every
block into a distinctly elevated card over a tinted page ground, with a sticky identity card
on the start side.

### 1.2 The teaching filter labels semesters, not academic periods

`src/components/public/lecturer-academic-records.tsx:110-117` filters on
`LecturerTeachingRecord.semester` (an integer 1–8) and renders `"Semester 3"`. A course's
semester number is not a period identity — two different academic years both have a
"Semester 3". The filter should select an **academic period**: `Ganjil 2026/2027`.

### 1.3 The admin editor bundles unrelated concerns and renders unbounded card stacks

`lecturer-admin-workspace.tsx` exposes three tabs, two of which pair unrelated subjects:

- "Pendidikan & publikasi" → `lecturer-relations-manager.tsx` (education + publications)
- "HKI & pengajaran" → `lecturer-academic-records-manager.tsx` (IP + courses)

Each manager renders **one `<form>` card per record, all expanded simultaneously**, plus a
trailing "add" card. With Dr. Masykur's 27 publications that is a 27-card vertical stack per
column. The product owner wants one subject per tab, and a table for the list.

Delete is a bare submit button with no confirmation — one misclick destroys a row. (The
lecturer *list* page already solves this correctly via `LecturerDeleteAction`'s `AlertDialog`.)

### 1.4 The admin write path cannot set fields the schema and public page already support

`prisma/schema.prisma` `model Lecturer` has `scopusUrl`, `linkedinUrl`, `instagramUrl`,
`twitterUrl`, `cvMediaId`; `model LecturerTranslation` has `officeLocation` and `quote`. The
**public detail page already reads and renders all of them.** The *lecturer self-service
portal* (`src/contracts/lecturer-portal.ts`, `src/features/lecturer-portal/domain.ts`) already
writes all of them.

But the **admin** path — `LecturerInputSchema` → `people.ts` → `lecturer-editor-form.tsx` —
exposes only `googleScholarUrl` and `sintaUrl`. An admin therefore cannot set a lecturer's
Scopus link, CV, office location, or Arabic quote. This is the "backend yang belum ada".

**No Prisma migration is required.** Every column already exists.

## 2. Goals

1. Public detail page: every section visually contained, over a tinted page ground, matching
   the reference layout's card-based separation.
2. Public teaching filter selects an academic period (`Ganjil 2026/2027`), not a semester
   integer.
3. Admin editor: six tabs, one subject each — Profil, Pendidikan, Publikasi, HKI, Mata Kuliah,
   Media & CV.
4. Admin record lists render as tables reusing the existing admin table language, with
   add/edit in a `Sheet` and delete behind an `AlertDialog`.
5. `LecturerInputSchema` and `people.ts` carry every column the schema and public page already
   support, so the admin path reaches parity with the lecturer portal.
6. Seed a complete, real lecturer record (Dr. Masykur) so the redesign is exercised against
   realistic data volume rather than three-publication stubs.
7. i18n parity across `id` / `en` / `ar`; Arabic real and RTL-safe; logical-direction
   utilities only.

## 3. Non-goals

- No Prisma schema change or migration. Every needed column exists.
- No change to the four record server actions' behaviour (`saveAdminEducationAction`,
  `saveAdminPublicationAction`, `saveAdminHkiAction`, `saveAdminTeachingAction`). They already
  handle create / update / delete via an `intent` field. This is a presentation swap.
- No change to the lecturer self-service portal. It is already correct and is the reference
  for what the admin path should support.
- No change to `Research` / `CommunityService` authoring. The public page reads those through
  join tables owned by other admin surfaces; only their *presentation* changes.
- No pagination or search inside the per-lecturer record tables. A single lecturer's record
  count is bounded (tens, not thousands). Revisit if that stops being true.
- No redesign of the lecturer *list* page (`/admin/dosen`). It is already a correct table.

## 4. Lane and contract note

`AGENTS.md` assigns shared-contract changes (§4 below touches `src/contracts/academic.ts`) to
the GPT lane and requires a GPT-owned contract task first. The product owner was shown this
conflict explicitly and directed that this session perform the contract change directly and
carry the responsibility. This deviation is recorded here and must be repeated in the handoff
under "requested contract/dependency change".

The change is **purely additive and nullable** — no existing caller breaks.

## 5. Approach

### 5.1 Contract and writer (the missing backend)

**`src/contracts/academic.ts`**

`LecturerInputSchema` gains, all nullable:

| Field | Type |
|---|---|
| `scopusUrl` | `ExternalLinkSchema.nullable()` |
| `linkedinUrl` | `ExternalLinkSchema.nullable()` |
| `instagramUrl` | `ExternalLinkSchema.nullable()` |
| `twitterUrl` | `ExternalLinkSchema.nullable()` |
| `cvMediaId` | `CmsIdentifierSchema.nullable()` |

`PersonTranslationInputSchema` gains `officeLocation: OptionalText(200)` and
`quote: OptionalText(500)`, matching the bounds already used in
`src/contracts/lecturer-portal.ts:39,41`.

`PersonTranslationInputSchema` has exactly one consumer — `LecturerInputSchema`
(`src/contracts/academic.ts:100`). Staff use a separate `StaffTranslationInputSchema`, so
these two additions have no collateral effect on the staff write path.

**`src/features/academic/people.ts`**

- `createLecturer` (`:611`) and `updateLecturer` (`:629`) persist the five new columns.
- New `validateCv(tx, mediaId)`, mirroring the existing `validatePhoto`, asserting the media
  row exists and its `mimeType` is `application/pdf`. Returns `MEDIA_INVALID` on failure.
  A non-PDF `cvMediaId` must be rejected at the write boundary, not merely in the UI.
- `replaceLecturerTranslations` carries `officeLocation` and `quote` through.

**`src/features/academic/editor-import.ts`**

`:243` re-parses the row through `LecturerInputSchema`. Its select and payload mapping must
return the new fields so the edit form hydrates them.

**`src/features/academic/lecturer-csv-import.ts`**

Parses the same schema. New fields are nullable, so existing CSVs keep importing unchanged.
Add the new columns as **optional** headers so bulk import can populate them.

### 5.2 Public detail page

**Ground inversion.** `src/app/[locale]/(public)/dosen/[id]/page.tsx` page ground becomes
`bg-slate-50`; every section card becomes white with `border-slate-200` and a soft shadow.
This is the actual fix for §1.1 — a tint on a tint is invisible; elevation on a tinted ground
is not.

**Sections that gain a container:** Biography and Education (currently bare).

**Hero.** Three-part name presentation from the reference: small prefix line (e.g. `Dr.`),
large name, small suffix line (e.g. `M.Hum.`). Derived by splitting the stored `name` on
comma — prefix/suffix are presentation only, never new columns.

**Identity card** (start side, sticky) in card order: photo → name → NIP → NIDN → program chip
→ bidang keilmuan chips → jabatan chip → Media Penelitian icon row → kontak → alamat kantor →
jam layanan → Download CV.

**Media Penelitian icons.** Today `page.tsx:194-200` maps Google Scholar and SINTA onto
generic lucide `Globe` / `GraduationCap` — visually meaningless. Replaced with a small
`src/components/public/research-media-icons.tsx` holding inline brand SVGs for Google Scholar,
Scopus, SINTA, ORCID, LinkedIn, and Instagram. Inline SVG (not an icon font or remote asset)
keeps them offline-safe and themeable. Each link keeps its existing `aria-label` and
`rel="noopener noreferrer"`.

`scopusUrl` and `orcid` are added to `LECTURER_DETAIL_SELECT` and the `Row` type — the query
does not currently select them even though the columns exist.

**Record sections.** Publikasi, Penelitian, Pengabdian, HKI each become a white card with an
icon'd header and a start-aligned title; the archive link moves to the header's end side.

### 5.3 Public teaching filter → academic periods

`LecturerTeachingRecord` gains `academicYearStart: number` (already available upstream in
`page.tsx:247-258`, currently discarded into a formatted string).

The filter derives unique `(academicYearStart, academicYearEnd, term)` triples, sorts newest
first, and labels each `${termLabel} ${start}/${end}` → `Ganjil 2026/2027`. Selection state
becomes a composite string key `"2026-GANJIL"`, not a number. Default option: `Semua periode`.

`semester` stays on the record — it is still real per-course information and remains a table
column — it just no longer drives the filter.

New message keys `allPeriods` / `period` in `messages/{id,en,ar}.json`.

`allSemesters` is dropped from *this component's* label set only. The key itself **stays** —
`src/components/public/academic-course-catalog.tsx:17,58` (the `/akademik/mata-kuliah` page)
still uses it, and that page filters a course catalogue where a bare semester number *is* the
right axis. Removing the key would break it.

### 5.4 Admin: six tabs

`lecturer-admin-workspace.tsx` takes six panels: Profil · Pendidikan · Publikasi · HKI ·
Mata Kuliah · Media & CV.

The current tab strip is `grid-cols-1 sm:grid-cols-3`. Six tabs in a grid would be a wall on
narrow screens, so the strip becomes a horizontally scrollable flex row
(`overflow-x-auto`, no scrollbar chrome) with `role="tablist"` preserved. Keyboard support
(`ArrowLeft`/`ArrowRight`/`Home`/`End` roving tabindex) is added — the current three-tab strip
has none, and six unlabelled-by-position tabs make that a real accessibility gap.

`lecturer-relations-manager.tsx` and `lecturer-academic-records-manager.tsx` are **deleted**,
replaced by four focused managers under `src/components/admin/lecturer/`:

| File | Tab |
|---|---|
| `education-manager.tsx` | Pendidikan |
| `publication-manager.tsx` | Publikasi |
| `hki-manager.tsx` | HKI |
| `teaching-manager.tsx` | Mata Kuliah |
| `media-manager.tsx` | Media & CV |

The COPY blocks currently inlined in the two deleted managers move to a shared
`lecturer-manager-copy.ts` so the four managers do not each re-declare `id`/`en`/`ar` strings.

### 5.5 Admin: shared record table + Sheet

**`src/components/admin/shared/record-table.tsx`** (new, generic)

Generalizes the visual language already established in
`src/components/admin/lecturer/lecturer-list.tsx:124-139`: bordered rounded card, `bg-slate-50`
`<thead>` with `text-xs uppercase tracking-[0.12em]`, `border-t` rows, `hover:bg-slate-50/70`,
and a **`md:hidden` card list fallback** for narrow screens (the existing list has this; the
record tables must not regress it).

Props: `title`, `description`, `count`, `addLabel`, `onAdd`, `columns` (label + align +
`render(row)`), `rows`, `emptyLabel`, `renderActions(row)`.

Header carries the title, the record count, and the `+ Tambah` button — replacing the
"trailing empty add-form card" pattern.

This deliberately does **not** adopt `src/components/ui/table.tsx`: that shadcn primitive is
specified by `docs/superpowers/specs/2026-08-28-admin-list-table-search-pagination-design.md`
but has not been implemented yet. Introducing it here would front-run that spec's migration and
leave two table languages in the tree. `record-table.tsx` matches today's hand-rolled markup;
when the 2026-08-28 spec lands, it migrates in one place. **This is a tracked follow-up, noted
in §9.**

**`src/components/admin/lecturer/lecturer-record-sheet.tsx`** (new)

Wraps the installed `src/components/ui/sheet.tsx` around a record form. Requires an accessible
title per `AGENTS.md`'s overlay rule. Opens for both "add" (empty form) and "edit"
(`defaultValue`-populated form). On a successful action result the sheet closes and the row
list revalidates.

Forms keep `FieldGroup` + `Field` per `AGENTS.md` and post to the **existing, unchanged**
server actions. Each sheet form is keyed by record id so React remounts it — otherwise
`defaultValue` would stale between edits of different rows.

**Delete** moves behind `AlertDialog`, reusing the confirm-copy shape already proven in
`lecturer-delete-action.tsx`.

### 5.6 Admin: Media & CV tab

`media-manager.tsx` follows the picker pattern already used by
`src/components/admin/posts/post-cover-picker.tsx`.

- Photo: `CMS_IMAGE` policy, existing picker + crop panel.
- CV: `PUBLIC_PDF` policy. `/api/admin/media/upload` already accepts it
  (`src/contracts/media-admin.ts:74,88`; `src/contracts/media.ts:71`) — no API change.
- Shows the current CV's `originalName` with replace and remove actions.

Because photo and CV are part of the `LecturerInputSchema` payload (not a separate action),
this tab submits through the same `/api/admin/academic/people` endpoint as the Profil tab.
The two tabs therefore share one draft state, lifted into the workspace.

### 5.7 Seed: Dr. Masykur

Source: the faculty personnel page supplied by the product owner. Per the product owner's
explicit direction, **academic content is kept; institutional identity is FUSPI's**.

**Kept (real, sourced):** biography, three education entries (S1 1995–2000 UIN Sunan Kalijaga;
S2 2000–2004 UI Depok; S3 2010–2015 UI Depok), eight books (2003–2021), nineteen journal
articles (2008–2026), NIP `197606172005011003`, Scopus ID `59316785500`, SINTA ID `6058892`,
Google Scholar profile URL, and the portrait photograph (downloaded, converted to webp,
seeded through the existing `seedMedia` helper).

**Replaced with FUSPI identity:** email → `masykur@fuspi.uinbanten.ac.id`; office location →
`Gedung FUSPI Lt. 2, Ruang Dekan`; position → `Dekan Fakultas Ushuluddin dan Pemikiran Islam`.
No external faculty domain, branding, email, or public copy enters the repository, per
`AGENTS.md`'s identity contract.

**Omitted:** the CV file. The source CV is a third-party cloud link, and `cvMediaId` requires
a stored PDF row; seeding one would mean fabricating a document. The Media & CV tab exists to
upload the real file.

`prisma/seed.ts:184-186` currently carries a comment stating lecturer identities are fictional
*on purpose*, because attaching invented credentials to a real person would fabricate an
academic record. Masykur is the inverse case — a real person with a real, sourced record — so
the comment is **amended** to state both rules rather than left standing in contradiction.

Program assignment: AFI (his field is Islamic philosophy), consistent with
`src/config/institution.ts`.

## 6. Data flow

```
Admin edit page (server)
  ├── getAcademicEditorDetail ──────────► LecturerDraft (now +5 URL/media fields, +2 translation fields)
  ├── loadAdminLecturerRelations ───────► education[] + publication[]
  └── loadAdminLecturerAcademicRecords ─► hki[] + teaching[]
                │
                ▼
      LecturerAdminWorkspace (6 tabs, client)
        ├── Profil ──────┐
        ├── Media & CV ──┴─► shared draft ─► POST /api/admin/academic/people
        │                                      └─► people.ts create/updateLecturer
        │                                            └─► validatePhoto + validateCv
        ├── Pendidikan ──┐
        ├── Publikasi ───┤
        ├── HKI ─────────┼─► RecordTable + Sheet ─► existing server actions (unchanged)
        └── Mata Kuliah ─┘
```

## 7. Error handling

- `cvMediaId` pointing at a non-PDF → `MEDIA_INVALID` from the writer, surfaced as the existing
  media error string. Client-side type filtering is convenience, not the boundary.
- Sheet form action failure → the sheet **stays open** with the error visible and the user's
  input intact. Closing on failure would discard typed data.
- Delete of a row that vanished concurrently → the action's existing not-found path; the table
  revalidates and the row disappears.
- Public page: `safeExternalUrl` already gates every outbound href through
  `CmsHttpsExternalUrlSchema`. The new Scopus/ORCID/LinkedIn/Instagram links go through the
  same gate — no raw stored URL reaches an `href`.
- A lecturer with zero teaching rows → the period `<select>` is disabled with an empty-state
  message, as today.

## 8. Testing

Per `AGENTS.md`, `npm run lint`, `npm run typecheck`, and `npm run test` all pass. Plus:

**Contract** (`src/contracts/academic.ts`)
- New fields round-trip through `LecturerInputSchema` and reject malformed URLs.
- A payload omitting every new field still parses (additive-nullable guarantee).
- `officeLocation` / `quote` respect their length bounds.

**Writer** (`src/features/academic/people.ts`)
- `validateCv` rejects a media id whose `mimeType` is not `application/pdf` → `MEDIA_INVALID`.
- `validateCv` rejects a non-existent media id.
- New columns persist on both create and update.
- `officeLocation` and `quote` persist through `replaceLecturerTranslations`.

**CSV import** (`src/features/academic/lecturer-csv-import.ts`)
- A CSV without the new columns still imports (regression guard).
- A CSV with them populates them.

**Public component** (`lecturer-academic-records.tsx`)
- Period options derive as `Ganjil 2026/2027` from `(start, end, term)`.
- Selecting a period filters on the composite key: two rows sharing `semester: 3` across
  different academic years must not both appear.
- Periods sort newest first.

**Admin component**
- `record-table.tsx` renders the empty state at zero rows and the count in the header.
- Sheet opens populated for edit and empty for add; switching rows does not leak
  `defaultValue` between them.
- Delete requires the `AlertDialog` confirm.

**A11y / RTL**
- axe pass on the rebuilt public detail page and the six-tab admin editor.
- Tab strip: arrow-key roving tabindex, correct `aria-selected` / `aria-controls`.
- Arabic locale renders RTL with no physical-direction utility regressions.

## 9. Follow-ups (not in scope)

1. **Table primitive convergence.** When
   `2026-08-28-admin-list-table-search-pagination-design.md` is implemented and
   `src/components/ui/table.tsx` exists, migrate `record-table.tsx` onto it. §5.5 explains why
   this spec does not front-run it.
2. **Upload Dr. Masykur's real CV** through the new Media & CV tab (§5.7).
3. **Lecturer portal / admin convergence.** `lecturer-portal/domain.ts` and `people.ts` now
   write overlapping column sets through two independent code paths. Worth unifying, but not
   while both are changing.
4. **Publication ordering UI.** Records sort by year then `order`, but `order` is not editable
   from the admin — only implicitly set. A drag-reorder affordance is a separate feature.
