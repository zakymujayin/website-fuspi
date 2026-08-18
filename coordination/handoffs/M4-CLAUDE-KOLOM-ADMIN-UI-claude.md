# Handoff — M4-CLAUDE-KOLOM-ADMIN-UI — claude

- Branch: `ai/claude/m4-kolom-admin-ui`
- Base SHA: `397f827f197ab7cad1f490230831cf224a82c4f5` (`ai/gpt/m4-facility-homepage-admin`)
- Head SHA: `6685b78`

## Result

Built the admin UI for Post `type=KOLOM` ("Gagasan dari Sivitas Akademika") so homepage
Columns content can be managed from admin instead of seed/DB only:

- `/admin/kolom` — list page, **fully functional today** (verified live: renders real
  seeded KOLOM rows with correct author/date/status).
- `/admin/kolom/baru` and `/admin/kolom/[id]/edit` — create/edit UI, **complete but
  intentionally gated**. See "Contract/schema/migration impact" below.
- Sidebar entry "Kolom" added under the Konten group, right after "Berita".
- `columnType` (DEKAN/DOSEN/MAHASISWA) is a required field on the Kolom form, validated
  by the frozen `src/contracts/post.ts` `validatePostType` rule (KOLOM requires
  `columnType`; every other type forbids it).
- No hardcoded content: all Kolom data flows through the `Post` model, `type=KOLOM`.
- No topbar reintroduced; admin stays sidebar-only.
- No Prisma schema/migration changes.

Reused rather than duplicated: `PostCoverPicker`, `RichTextField`, `Field`/`FieldSet`
primitives, and the shared list infra (`post-query.ts`, `post-list.tsx`,
`post-filter-tabs.tsx`, `post-pagination.tsx`) generalized with optional
`basePath`/`type`/`editHrefBase` params (backward-compatible defaults — `/admin/posts`
behavior is unchanged). Built a new sibling `ColumnEditorForm` rather than extending
`PostEditorForm`: Kolom's shape differs enough (no taxonomy, has `columnType`, gated
submit) that grafting it onto the existing form would have meant more conditional
branches than a small new component reusing the same primitives.

## Files changed

- `src/app/[locale]/admin/kolom/page.tsx` (new) — list page.
- `src/app/[locale]/admin/kolom/baru/page.tsx` (new) — create page.
- `src/app/[locale]/admin/kolom/[id]/edit/page.tsx` (new) — edit page.
- `src/components/admin/posts/column-editor-form.tsx` (new) — `ColumnEditorForm`.
- `src/components/admin/posts/column-editor-payload.ts` (new) — draft type, payload
  builders (`buildColumnCreatePayload`/`buildColumnUpdatePayload`), validated directly
  against `PostCreateInputSchema`/`PostUpdateInputSchema` from `@/contracts/post`.
- `src/components/admin/posts/column-editor-view.ts` (new) — `draftFromColumnEditorView`.
- `src/components/admin/posts/post-query.ts` — added optional `type` param to
  `toAdminPostTransportQuery`, optional `basePath` to `buildAdminPostHref`.
- `src/components/admin/posts/post-list.tsx` — added `editHrefBase?` prop.
- `src/components/admin/posts/post-filter-tabs.tsx` — added `basePath?` prop.
- `src/components/admin/posts/post-pagination.tsx` — added `basePath?` prop.
- `src/components/admin/admin-sidebar-data.ts` — added Kolom sidebar entry.
- `src/app/[locale]/admin/layout.tsx` — mapped `items.columns`/`items.kolom` into
  `sidebarTranslations`.
- `messages/{id,en,ar}.json` — added `AdminColumnList` (~25 keys), `AdminColumnEditor`
  (~31 keys, incl. `blocked.{title,description}`), and `AdminSidebar.items.columns`/
  `.kolom` in all three locales.
- `tests/m3/ui/admin-column-editor.test.tsx` (new) — see "Verification".
- `coordination/tasks/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT.md` (new) — blocker request,
  see below.

## Contract/schema/migration impact

**No schema/migration change.** `Post.columnType` already exists in Prisma.

**Blocked on an out-of-lane contract fix.** The admin Post transport
(`src/contracts/post-admin.ts` + `src/lib/content/post-admin-transport.ts`) is hardcoded
to `type: "BERITA"` end to end:

- `AdminPostEditorViewSchema.type` is `z.literal("BERITA")`, `columnType: z.null()`.
- `AdminPostMutableFieldsShape` omits `type`/`columnType`, so
  `AdminPostCreatePayloadSchema`/`Update`/`Autosave` (all `.strict()`) reject any payload
  that includes them — a Kolom payload is **rejected, not silently misclassified**.
- `toBeritaCreateInput`/`toBeritaUpdateInput`/`toBeritaAutosaveInput` unconditionally set
  `type: "BERITA", columnType: null`.
- `getAdminPostEditor` and `executeAdminPostCommand` both filter `where: { type: "BERITA" }`
  on lookup, so a real KOLOM post id 404s into the existing "unavailable" notice today
  (verified live, see "Verification").

Both files sit outside this task's `allowed_paths` and outside Claude's default lane
(`docs/24-implementation-plan-multi-model.md`), and the task's own instructions said to
stop and hand off rather than edit them. Filed
`coordination/tasks/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT.md` (`status: draft`) with the
exact locations, what not to change (the frozen `src/contracts/post.ts` and
`prisma/schema.prisma` already fully support KOLOM), and the expected acceptance
criteria. **No UI rework is expected once it lands** — `ColumnEditorForm` and the
payload builders already target the correct final shape; only
`AdminPostCreatePayloadSchema`/`Update`/`Autosave` need to start accepting
`type`/`columnType` for the existing Kolom payloads to pass straight through.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | Pass — 93 files, 1166 tests |

`tests/m3/ui/admin-column-editor.test.tsx` (12 tests, all passing) covers:
- `buildColumnCreatePayload` produces `type: "KOLOM"` (never `"BERITA"`) with the
  selected `columnType`.
- Rejects a KOLOM draft with no `columnType` (the `validatePostType` rule).
- Rejects blank slug / missing Indonesian title.
- Omits untouched EN/AR translations from the payload.
- **Key acceptance test**: a valid Kolom payload re-parsed through today's
  `AdminPostCreatePayloadSchema` is rejected — documents the exact current blocker this
  handoff hands to GPT. This assertion is expected to flip once the contract task lands
  (flagged in that task's acceptance criteria).
- `buildColumnUpdatePayload` carries `postId`/`expectedVersion`, keeps `type: "KOLOM"`.
- `draftFromColumnEditorView` projection, `emptyColumnDraft`/`COLUMN_TYPES`/
  `COLUMN_EDITOR_LOCALES` sanity.
- `/admin/kolom` list wiring: `toAdminPostTransportQuery` passes `type: "KOLOM"` through
  only when explicitly requested (an omitted `type`, as `/admin/posts` does, is
  unaffected); `buildAdminPostHref` uses the given `basePath`; `AdminPostList` with
  `editHrefBase="/admin/kolom"` renders `href="/admin/kolom/{id}/edit"`, proving the
  route is real and reachable, not a dead link.

Manual browser verification (Playwright, admin session minted directly via
`createDatabaseSession` against a dev server, screenshots reviewed):
- `/admin/kolom` — list renders 2 real seeded KOLOM posts correctly (title, author,
  status, date).
- `/admin/kolom/baru` — form renders correctly (slug, featured, cover picker, Penulis/
  `columnType` select, three locale sections with ID mandatory and EN/AR marked
  optional). Filling slug + ID title/excerpt/content + `columnType=Dosen` and clicking
  "Simpan draf" surfaces the intended amber "Penyimpanan Kolom belum tersedia" notice
  (naming this handoff file) instead of a network call or silent misclassification —
  confirms the gating mechanism works as designed. EN/AR left blank are correctly
  omitted from validation with no spurious errors.
- `/admin/kolom/nonexistent-id/edit` — renders the existing, honest "Kolom tidak dapat
  dimuat" / "not found" notice (same pattern already used elsewhere in admin), not a
  crash or dead route — expected, since `getAdminPostEditor` still filters
  `type: "BERITA"` today.

## Untested areas

- Real create/update/autosave/delete of a KOLOM post end to end — impossible until
  `M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT` lands (verified via the blocked-notice gate and
  the unit test's contract-rejection assertion instead).
- `/admin/kolom/[id]/edit` against a real KOLOM id — currently always 404s into the
  "unavailable" notice for the same reason; will start rendering the real draft with no
  further UI change once the transport contract accepts KOLOM (`draftFromColumnEditorView`
  is already wired for it).
- Playwright/axe accessibility pass on the new pages — not run this round; the pages
  reuse already-accessible primitives (`Field`, `RichTextField`'s `role="textbox"`/
  `aria-label`, existing `AdminPostList`/`AdminPostStateNotice`), so risk is low but
  unverified directly.

## Risks and follow-ups

- `AdminPostEditorViewSchema.columnType` is frozen to `z.null()` today, so
  `draftFromColumnEditorView` always reads `null` for now — will start reflecting the
  real value automatically once `M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT` generalizes that
  schema; no code change needed on this side.
- Noticed (out of scope, not touched): `src/app/[locale]/admin/layout.tsx`'s explicit
  `sidebarTranslations.items` map was already missing `taxonomies`/`taksonomi` before
  this task — a pre-existing gap unrelated to Kolom, flagging for visibility only.
- `content.min(1)` in `src/contracts/post.ts` (`PostTranslationInputSchema`) has no
  custom Zod error message, so an empty required content field surfaces Zod's untranslated
  default text ("Too small: expected string to have >=1 characters") rather than a
  localized message. This is a pre-existing characteristic of the frozen contract, shared
  identically by the existing BERITA `post-editor-form.tsx` (same schema) — not introduced
  by this task and out of scope to fix here (would require editing the frozen
  `src/contracts/post.ts`).

## Requested shared changes

`coordination/tasks/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT.md` — generalize the admin Post
transport (`src/contracts/post-admin.ts`, `src/lib/content/post-admin-transport.ts`) past
BERITA-only so Kolom create/update/autosave/delete can activate. Full details, exact
locations, and acceptance criteria are in that file.
