---
id: M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT
milestone: M4
title: Generalize the admin Post transport past BERITA so Kolom Create/Update/Autosave/Delete can work
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 397f827f197ab7cad1f490230831cf224a82c4f5
depends_on: []
spec_refs:
  - docs/02-database-schema.md
allowed_paths:
  - "src/contracts/post-admin.ts"
  - "src/lib/content/post-admin-transport.ts"
  - "coordination/handoffs/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT-gpt.md"
readonly_paths:
  - "AGENTS.md"
  - "docs/**"
  - "coordination/tasks/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT.md"
  - "src/contracts/post.ts"
  - "prisma/schema.prisma"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
contracts:
  - src/contracts/post-admin.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
token_class: M
status: draft
---

## Intent

`M4-CLAUDE-KOLOM-ADMIN-UI` (branch `ai/claude/m4-kolom-admin-ui`) built the admin UI for Post
type=KOLOM ("Gagasan dari Sivitas Akademika"): `/admin/kolom` (list, fully functional today),
`/admin/kolom/baru` and `/admin/kolom/[id]/edit` (create/edit — UI complete, Save intentionally
gated), and a sidebar entry. This request is the one piece that work could not do itself: the admin
Post transport (`src/contracts/post-admin.ts` + `src/lib/content/post-admin-transport.ts`) is
hardcoded to `type: "BERITA"` end to end, so Kolom Create/Update/Autosave/Delete cannot function no
matter what UI calls it. Both files are outside DeepSeek/Claude's default lane
(`docs/24-implementation-plan-multi-model.md`'s "shared contract/type" hotspot) and the task's own
instructions said to stop and request this rather than edit them directly.

The underlying frozen contract already supports this fully — nothing there needs to change:
`src/contracts/post.ts`'s `PostCreateInputSchema` / `PostUpdateInputSchema` / `PostAutosaveInputSchema`
/ `PublicPostViewSchema` already declare `type: PostTypeSchema` + `columnType: ColumnTypeSchema.nullable().optional()`
with the exact validation rule needed (`validatePostType`: KOLOM requires `columnType`, every other
type forbids it). The gap is entirely in the thinner admin-transport layer built on top of it.

## Exact locations

**`src/contracts/post-admin.ts`:**
- `AdminPostEditorViewSchema` (line ~187): `type: z.literal("BERITA")` and `columnType: z.null()` —
  needs `type: PostTypeSchema` (or at minimum `z.enum(["BERITA","KOLOM"])`) and
  `columnType: ColumnTypeSchema.nullable()`, with the same `validatePostType`-style refinement
  `src/contracts/post.ts` already has (reuse it directly if convenient — it's exported).
- `AdminPostMutableFieldsShape` (line ~216): omits `type`/`columnType` entirely, so
  `AdminPostCreatePayloadSchema` / `AdminPostUpdatePayloadSchema` / `AdminPostAutosavePayloadSchema`
  cannot carry them — a client sending them today gets rejected by `.strict()`, not silently
  misclassified (confirmed by this task's own test,
  `tests/m3/ui/admin-column-editor.test.tsx`). Needs `type` and `columnType` added to the shape.
- `toBeritaCreateInput` / `toBeritaUpdateInput` / `toBeritaAutosaveInput` (line ~282–298): each
  unconditionally sets `type: "BERITA", columnType: null` — needs to pass through the payload's own
  `type`/`columnType` instead (or become resource-agnostic `toPostCreateInput` etc.; naming is GPT's
  call).

**`src/lib/content/post-admin-transport.ts`:**
- `getAdminPostEditor` (line ~284): `where: {id: postId, type: "BERITA", ...}` — always 404s a real
  KOLOM post today. Needs to accept the target type (or drop the filter and rely on
  `AdminPostEditorViewSchema`'s own type handling once that's generalized).
- Same function's result construction (line ~291–292): hardcodes `type: "BERITA", columnType: null`
  in the object handed to `AdminPostEditorViewSchema.safeParse` — needs the row's real `type`/
  `columnType` (both already selected by `POST_SELECT`? confirm — `columnType` is not currently in
  `POST_SELECT`, add it).
- `executeAdminPostCommand` (line ~335): target-lookup `where: {id: ..., type: "BERITA", ...}` for
  UPDATE/AUTOSAVE/PUBLICATION/DELETE — same fix as above.
- `listAdminPosts` was **not** found to be BERITA-locked — its `where` clause already scopes by
  `query.data.type` generically and needs no change. `/admin/kolom`'s list works today by passing
  `type: "KOLOM"` explicitly through `toAdminPostTransportQuery` (generalized in this task, already
  merged into the UI branch).

## What NOT to change

- `src/contracts/post.ts` — already correct, read-only reference.
- `prisma/schema.prisma` — no schema/migration change needed; `Post.columnType` already exists.
- Nothing under `src/app/**` / `src/components/**` / `messages/**` — the Kolom UI branch
  (`ai/claude/m4-kolom-admin-ui`) already built `ColumnEditorForm` /
  `src/components/admin/posts/column-editor-payload.ts` against the *target* shape (it builds and
  validates payloads directly against `PostCreateInputSchema`/`PostUpdateInputSchema` from
  `@/contracts/post`, not the admin-narrowed schemas) — once this contract task lands, the UI branch
  should only need `AdminPostCreatePayloadSchema`/`AdminPostUpdatePayloadSchema`/
  `AdminPostAutosavePayloadSchema` to additionally accept `type`/`columnType` for its existing
  `buildColumnCreatePayload`/`buildColumnUpdatePayload` output to pass straight through — no UI
  rework expected, but please flag in the handoff if the final shape ends up different from what's
  described above.

## Acceptance criteria

- Creating/updating/autosaving/deleting a `type: "KOLOM"` Post through `/api/admin/posts` succeeds
  end to end (was previously impossible — every attempt either got silently forced to BERITA or
  target-lookup 404'd).
- Creating/updating a non-KOLOM Post through the same endpoints is unaffected — existing BERITA (and
  any PENGUMUMAN/INFORMASI) behavior must not change.
- `columnType` is required when `type === "KOLOM"` and rejected otherwise (mirror
  `validatePostType` from `src/contracts/post.ts`).
- `tests/m3/ui/admin-column-editor.test.tsx`'s "cannot be transported through today's admin-only
  payload schema" test will start failing once `AdminPostCreatePayloadSchema` accepts `type`/
  `columnType` — that test's assertion should be flipped (or removed with a comment pointing at this
  task) as part of landing this fix, not left red.
- All `acceptance_commands` pass.

## Handoff requirements

Use `coordination/handoffs/TEMPLATE.md` and commit it as
`coordination/handoffs/M4-GPT-KOLOM-ADMIN-TRANSPORT-CONTRACT-gpt.md`. Note explicitly the final
shape of `AdminPostEditorViewSchema`/`AdminPostMutableFieldsShape`/`toBeritaCreateInput` (renamed or
not) so the Kolom UI branch can be updated to match if anything differs from what's described above.
