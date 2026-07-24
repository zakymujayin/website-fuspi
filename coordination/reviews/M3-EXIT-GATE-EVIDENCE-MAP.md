# M3 Exit-Gate Evidence Map (draft, integrator)

Maps each item of the **carried mandatory security evidence** (from
`coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md`) to the specific executing test(s) that prove
it. Every cited test is real — names were taken from source, not described from memory — and every
cited file runs in CI via `npm run test:integration` (node env, `RUN_PLATFORM_DB_TESTS=true`) or the
Playwright suite.

**Status: DRAFT.** This is the integrator's working map toward the M3 exit contract. It is not the
exit contract itself. Two items are still open (see the end) and this map, like all stand-in work
since 2026-07-23, needs Codex's independent sign-off before M3 closes.

Verified suite state at head `1a4a341`:
`RUN_PLATFORM_DB_TESTS=true npm test` → 744 passed; `npm run test:integration` → 82 passed;
`e2e/m3/ --project=chromium --project=mobile` → 232 passed.

## Requirement → proof

### 1. EDITOR list/detail/mutation ownership and negative-ID IDOR rejection
- `tests/m3/runtime/post-admin-transport.integration.test.ts` — "scopes EDITOR list/detail to owned
  Berita while ADMIN can see both".
- `tests/m3/runtime/post-mutations.integration.test.ts` — "returns identical non-disclosing results
  for missing and another owner's Post"; "allows optimistic autosave only for an owned draft".
- `tests/m3/runtime/media-admin-transport.integration.test.ts` — "scopes picker/update/delete and
  blocks referenced Media".
- Browser: `e2e/m3/admin-post-list-browse.spec.ts` ownership block (EDITOR-A never sees EDITOR-B),
  and the pending `e2e/m3/admin-post-editor.spec.ts` (EDITOR-B → `NOT_FOUND` on the edit route).

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
- Runtime-confirmed at the route during editor work: cross-origin POST → `CSRF_INVALID`. The pending
  editor E2E will cover the browser path.

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
- Runtime-confirmed at the route during editor work: stale `expectedVersion` → `VERSION_CONFLICT`.
  The pending editor E2E covers the browser reload path.
- **Gap:** the 30-second autosave *UI* is not built, so the interval is proven only as a contract
  constant + a server-accepted autosave command, not as a live client timer. Acceptable for the
  reference slice; the autosave UI is a separate future manifest.

### 7. publish-now, future scheduling, archive, and public `publishedAt <= now()` behavior
- `tests/m3/runtime/post-mutations.integration.test.ts` — "enforces legal publication transitions and
  preserves scheduled visibility semantics" (`PUBLISH_NOW`, `SCHEDULE`).
- `tests/m3/runtime/post-public-queries.integration.test.ts` — "shows only matching published Posts
  at or before the server clock".
- **Note:** these are proven at the transport/service layer. There is no publish/schedule/archive
  *UI* yet (basic editor is `SAVE_DRAFT` only) — that is out of the reference-slice scope by design.

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

1. **Editor form E2E** — `M3-DEEPSEEK-POST-EDITOR-QA` in flight. Until it lands, items 1/3/6's
   *browser* mutation paths rest on API-level runtime checks, not a driven form.
2. **Build tracing warning** — `M3-GPT-BUILD-TRACING-WARNING`. The workspace checklist requires zero
   build warnings; one remains.
3. **Independent review** — every slice since 2026-07-23 was authored, tested, and merged by the same
   stand-in. Codex must re-verify, with particular attention to the editor (first mutation surface).

## Not blocking M3 (recorded so they are not mistaken for gaps)

- No publish/schedule/archive/autosave/delete *UI* — out of reference-slice scope, each has a future
  manifest. Their server behavior is already proven (items 6, 7).
- `vitest.config.ts` no longer collects integration files; the misleading "skipped" signal is gone.
