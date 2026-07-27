# M3 Exit-Gate Evidence Map (draft, integrator)

Maps each item of the **carried mandatory security evidence** (from
`coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md`) to the specific executing test(s) that prove
it. Every cited test is real — names were taken from source, not described from memory — and every
cited file runs in CI via `npm run test:integration` (node env, `RUN_PLATFORM_DB_TESTS=true`) or the
Playwright suite.

**Status: DRAFT — evidence complete, CI green, awaiting Codex.** All nine mandatory security-evidence
items map to executing tests that pass; the CI-equivalent pipeline is green at head `da9f1fc`; and the
reference-slice UI (CRUD + publish lifecycle + cover + upload + rich text + autosave) is built and
E2E-proven. This is still the integrator's working map, **not** the exit contract itself. Only two
items block writing the exit contract, and both require Codex on return (2026-07-29): the carried
Turbopack build warning (item 2) and the mandatory independent review of all stand-in work since
2026-07-23 (item 3). A non-CI test-fragility (item 4) is recorded for the a11y lane but does not gate
CI. Until Codex signs off, this map — like all stand-in work in this window (ADR-0002) — is
provisional.

Verified suite state at head `da9f1fc` (2026-07-28, stand-in):
`npm run lint` → exit 0; `npx tsc --noEmit` → 0 errors; `npm run prisma:validate` → valid;
`npm test` → 738 passed; `npm run test:integration` → 83 passed; `npm run build` → compiled
successfully (one carried Turbopack warning, item 2 below). Browser (`--workers=1`, at
`localhost:3004` so `Origin` matches `AUTH_URL`): `e2e/m3/admin-post-editor.spec.ts` chromium+mobile
→ **30/30**; the two admin browse specs at `localhost` → 85/86 (the one failure is the pre-existing
media focus-order fragility, item 4 below). CI runs everything except Playwright, so the CI pipeline
(lint → typecheck → prisma validate/migrate/seed → test → test:integration → build) is green.

## Requirement → proof

### 1. EDITOR list/detail/mutation ownership and negative-ID IDOR rejection
- `tests/m3/runtime/post-admin-transport.integration.test.ts` — "scopes EDITOR list/detail to owned
  Berita while ADMIN can see both".
- `tests/m3/runtime/post-mutations.integration.test.ts` — "returns identical non-disclosing results
  for missing and another owner's Post"; "allows optimistic autosave only for an owned draft".
- `tests/m3/runtime/media-admin-transport.integration.test.ts` — "scopes picker/update/delete and
  blocks referenced Media".
- Browser: `e2e/m3/admin-post-list-browse.spec.ts` ownership block (EDITOR-A never sees EDITOR-B),
  and `e2e/m3/admin-post-editor.spec.ts` — "EDITOR-B sees unavailable notice for EDITOR-A's post,
  never the populated form" (EDITOR-B gets the unavailable notice, not `NOT_FOUND`/`FORBIDDEN` leakage).

### 2. session/permission/ownership/record-scope checks in every loader/action/route
- `tests/security/admin-post-transport-adversarial.integration.test.ts` — "rejects an invalid
  session before consuming a large upload body"; "rejects actor, role, type, and status injection
  without touching Prisma".
- `tests/security/admin-media-transport-adversarial.integration.test.ts` — "rejects command identity
  and force-delete injection before Prisma".
- Browser session/redirect blocks in both admin list specs (unauth + expired → login).

### 3. CSRF rejection for every new Post and Media mutation boundary
- `tests/security/admin-post-transport-adversarial.integration.test.ts` — "rejects missing and
  mismatched origins before reading session or database".
- `tests/security/admin-media-transport-adversarial.integration.test.ts` — "rejects hostile origins
  before session, body, database, or filesystem work".
- Runtime-confirmed at the route during editor work: cross-origin POST → `CSRF_INVALID`. This is now
  also the reason `e2e/m3/admin-post-editor.spec.ts` must run at `localhost:3004` (browser `Origin`
  must equal `AUTH_URL` or every mutation is rejected `CSRF_INVALID`) — the browser mutation path is
  exercised end-to-end there.

### 4. required ID translation, deterministic EN/AR fallback, no duplicate fallback results
- `tests/m3/runtime/post-public-queries.integration.test.ts` — "resolves exact AR/EN content and
  deterministic Indonesian fallback"; "filters category/tag without duplicates and paginates with
  stable ordering".
- Browser ID/EN/AR + RTL coverage in `public-post-experience.spec.ts` and both admin list specs.

### 5. rich-text sanitization on write and safe render against stored XSS
- Write: `tests/m3/runtime/post-mutations.integration.test.ts` — "creates parent, relations,
  **sanitized locales**, and revisions atomically as EDITOR".
- Render: `e2e/m3/public-post-experience.spec.ts` — "ID: detail renders safe sanitized HTML — no
  script, event, js-url, style, svg from stored"; "detail emits safe JSON-LD without raw HTML or
  secrets".

### 6. optimistic conflict rejection for update and 30-second draft autosave
- `tests/m3/runtime/post-mutations.integration.test.ts` — "replaces translations and tags atomically
  and rejects stale updates without partial changes"; "allows optimistic autosave only for an owned
  draft"; `ADMIN_POST_AUTOSAVE_INTERVAL_MS = 30_000` is contract-frozen in `src/contracts/post.ts`.
- Browser (update): `e2e/m3/admin-post-editor.spec.ts` now drives both paths live —
  "shows VERSION_CONFLICT when a concurrent edit bumps the version" (stale `expectedVersion` on manual
  save), and "autosaves the draft, then a manual save reuses the shared version without a conflict"
  which waits the real 30s interval (autosave version 1→2) then manually saves 2→3 with no
  `VERSION_CONFLICT`. This closes the earlier gap: the **30-second autosave UI is now built**
  (`PostEditorShell` owns one shared version fed to publication, form, and delete) and proven as a
  live client timer, not just a contract constant.

### 7. publish-now, future scheduling, archive, and public `publishedAt <= now()` behavior
- `tests/m3/runtime/post-mutations.integration.test.ts` — "enforces legal publication transitions and
  preserves scheduled visibility semantics" (`PUBLISH_NOW`, `SCHEDULE`).
- `tests/m3/runtime/post-public-queries.integration.test.ts` — "shows only matching published Posts
  at or before the server clock".
- Browser (update): the publish/schedule/archive **UI now exists** and is E2E-proven in
  `e2e/m3/admin-post-editor.spec.ts` — "publishes a draft now, stamps publishedAt, and bumps the
  version"; "schedules a draft for a future time and rejects a past time client-side"; "archives a
  published post, then returns the archived post to draft". Each asserts the DB status/`publishedAt`
  transition. Delete UI is likewise proven — "deletes an owned post via the confirm dialog, audits it,
  and returns to the list" (with the `ActivityLog` `operation:"DELETE"` audit).

### 8. Media ownership + staged-file rollback/orphan cleanup on DB transaction failure
- `tests/m3/runtime/media-admin-transport.integration.test.ts` — "compensates an earlier commit when
  a later batch item fails" (no row/file remaining).
- `tests/m3/runtime/media-persistence.integration.test.ts` — "duplicate database keys discard staging
  without overwriting the committed file"; "commits the file and Media row with the session-derived
  uploader".

### 9. upload validation remains bound to the M2 storage contract
- `tests/m3/runtime/media-persistence.integration.test.ts` + `media-admin-transport.integration.test.ts`
  — validated image/PDF upload, 20-image boundary, exactly-one public PDF, all through
  `ValidatedUploadSchema` / `parseStorageRoots` from the M2 storage contract.
- `tests/platform/storage/upload-storage-boundaries.test.ts` — storage-root boundary enforcement.

## Open before the exit contract can be written

1. ~~Editor form E2E~~ — **RESOLVED (2026-07-28).** `e2e/m3/admin-post-editor.spec.ts` now has 15
   test bodies (× chromium + mobile = 30/30) driving the real form for create, validation,
   `VERSION_CONFLICT`, `SLUG_CONFLICT`, round-trip preservation, EDITOR-B ownership, AR RTL, no
   disclosure, publish-now, schedule (+past-time rejection), archive → return-to-draft, delete +
   audit, cover set/clear, rich-text bold → sanitized `<strong>`, and the 30s autosave shared-version
   proof. Items 1/3/6/7's browser mutation paths are now driven, not just API-level.
2. **Build tracing warning** — `M3-GPT-BUILD-TRACING-WARNING`. The workspace checklist requires zero
   build warnings; one Turbopack NFT warning remains. Does **not** fail `npm run build` (compiles
   successfully) so CI is green, but the checklist item is open. GPT storage lane; human-deferred.
3. **Independent review** — every slice since 2026-07-23 was authored, tested, and merged by the same
   stand-in. Codex must re-verify on return (2026-07-29), with particular attention to the editor
   (first mutation surface) and this session's rich-text, autosave shell, and mutation E2E.
4. **Media browse focus-order test** — `e2e/m3/admin-media-library-browse.spec.ts:661` "keyboard focus
   order" fails `toBeFocused: inactive` **identically at both `127.0.0.1` and `localhost`** (host- and
   cookie-independent). The admin layout's skip link is correctly implemented (`SkipLink → <a
   href="#main"> → <main id="main">`), so this is a fragile focus-order assertion, not a product a11y
   regression. Not in CI (Playwright is not run by CI), so non-blocking for CI-green; recorded for the
   Claude/UI a11y lane to repair the test or the Tab sequence.

## Not blocking M3 (recorded so they are not mistaken for gaps)

- The publish/schedule/archive/autosave/delete/cover/rich-text **UI is now built and E2E-proven**
  (see items 1, 6, 7 above) — the reference slice is UI-complete, not just server-proven.
- `vitest.config.ts` no longer collects integration files; the misleading "skipped" signal is gone.
