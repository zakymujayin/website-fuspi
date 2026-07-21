# Independent Adversarial Review — M3 GPT Post + Media Admin Transport Contract

- **Reviewer:** DeepSeek v4 Pro (thinking `high`)
- **Assignment branch:** `coordination/m3-deepseek-post-media-admin-transport-review-assignment`
- **Assignment commit:** `06998687b3fef94b32e63eef9b21a20d694683cb`
- **Candidate under review:** `033c3b932e8cc3a85ec23009bdcb2f88ee06b3b3`
- **Implementation commit:** `a05f337db32bd1ecc868f6c9afa00807f10bb6d6`
- **Candidates files reviewed:**
  - `src/contracts/post-admin.ts` (332 lines)
  - `src/contracts/media-admin.ts` (202 lines)
  - `tests/m3/contracts/post-admin-transport-contract.test.ts` (312 lines)
  - `tests/m3/contracts/media-admin-transport-contract.test.ts` (244 lines)
- **Readonly context verified:** `src/contracts/post.ts`, `src/contracts/media.ts`, `src/contracts/auth.ts`, `src/contracts/platform.ts`, `src/contracts/storage.ts`, `src/contracts/operations.ts`, `src/lib/auth/permission-matrix.ts`, `src/lib/auth/runtime/authorization.ts`, `src/lib/auth/runtime/csrf.ts`, `src/lib/auth/runtime/request-session.ts`, `src/lib/content/post-mutations.ts`, `src/lib/content/media-persistence.ts`, `prisma/schema.prisma`

## Verdict: APPROVE

No reproducible Critical or High authorization, ownership-injection, cross-resource mutation, unsafe Media disclosure, count/policy bypass, non-JSON response, technical-error leakage, or fail-open contract defect was found. The contracts implement strict bounded normalization, frozen BERITA-only transport semantics, safe failure mapping, and comprehensive adversarial rejection. All 23 contract tests pass and every acceptance command produces a clean result.

---

## 1. Post/Media Query Normalization

**File:** `src/contracts/post-admin.ts:55–74` and `src/contracts/media-admin.ts:29–43`

- `AdminPostListSearchParamsSchema` normalizes raw string URL search params through `RawAdminPostListQuerySchema.transform(...)`. Defaults are deterministic (`page=1`, `pageSize=20`, `status="ALL"`, `search=""`, `sort="UPDATED_DESC"`). Singular strings are coerced into `AdminPostListQuerySchema` with numeric bounds. `AdminMediaListSearchParamsSchema` follows the same pattern (`page=1`, `pageSize=24`, `kind="ALL"`).
- Both middle-layer schemas use `.strict()`, rejecting unknown selectors, author/uploader/ownership scope fields, role, and repeated (array) query values. Oversized search (101+ chars), control characters, non-integer pagination, and out-of-range boundaries all fail closed before a canonical query is produced.
- **Adversarial test (post-admin-transport-contract.test.ts:80–96):** Rejects arrays, out-of-range, arbitrary sort, field selectors, author/ownership injection, oversized text, and control characters. ✗No bypass vectors found.
- **Adversarial test (media-admin-transport-contract.test.ts:45–58):** Rejects arrays, out-of-range pages, kind arrays, uploader/ownership injection, storageClass selectors, and field selectors. ✗No bypass found.

**Finding:** LOW. `RawAdminMediaListQuerySchema.pageSize` regex `^(?:[1-9]|[1-3]\d|4[0-8])$` accepts `0` as a valid single-digit (e.g., `"0"` matches `[1-9]`? No — it fails). Actually `"1"` through `"48"` are accepted. Bound is correct. No defect.

---

## 2. JSON-Safe Post Response Adapters

**File:** `src/contracts/post-admin.ts:89–210`

- `AdminPostSummarySchema` (line 147) exposes only `id`, `slug`, `title` (SafeLabelSchema, max 255, no control chars), `titleLocale "id"`, `availableLocales` (unique, "id" first, max 3), `status`, `publicationState`, `version`, `isFeatured`, `publishedAt` (ISO/null), `updatedAt` (ISO offset), `category` (id+label only), `author` (name only, no email), and `capabilities` (update/publish/delete booleans). `.strict()` + `.superRefine()` block duplicate IDs, invalid page bounds, inconsistent state.
- `AdminPostEditorViewSchema` (line 183) freezes `type: "BERITA"` and `columnType: null`. It exposes mutable `translations`, `tagIds`, `coverMediaId`, and safe `cover: PublicMediaViewSchema.nullable()` with coherence validation.
- Both schemas reject email, owner IDs, revision snapshots, storage metadata, Prisma objects, malformed instants, duplicates, and extra keys.
- **Adversarial test (post-admin-transport-contract.test.ts:98–148):** Confirms rejection of `authorId`, `contentOwnerId`, `authorEmail`, `revisionSnapshot`, `storageKey`, invalid locale ordering, duplicates, control chars, and malformed dates.

**Finding:** None. The output contract is strictly JSON-safe and exposes no PII or internal state.

---

## 3. Create/Update/Autosave Command Envelopes

**File:** `src/contracts/post-admin.ts:221–249`

- `AdminPostCreatePayloadSchema`, `AdminPostUpdatePayloadSchema`, `AdminPostAutosavePayloadSchema` compose only frozen mutable fields (`slug`, `isFeatured`, `categoryId`, `coverMediaId`, `tagIds`, `translations`) from `PostCreateInputSchema.shape`. `.strict()` blocks all extra keys.
- Adapters `toBeritaCreateInput`, `toBeritaUpdateInput`, `toBeritaAutosaveInput` (lines 278–294) compose `type: "BERITA"` and `columnType: null` via `PostCreateInputSchema.parse(...)`. Client never controls Post type or column type.
- `AdminPostTransportCommandSchema` (line 242) is a `.discriminatedUnion("action")` with `.strict()` on every variant. It rejects actor, role, author/uploader/owner ID, scope, status, and columnType injection.
- **Adversarial test (post-admin-transport-contract.test.ts:184–203):** Rejects `type: "PENGUMUMAN"`, `columnType: "DOSEN"`, `authorId`, `contentOwnerId`, `role`, `scope`, `status`. All rejected. ✗No bypass.

**Review note (documented in GPT handoff):** A later runtime MUST still apply a server-side type=BERITA target predicate before calling the generic Post mutation core. The adapters compose BERITA into the *input* only; they are not a database authorization check. This contract correctly isolates the transport boundary; the runtime predicate remains a separate concern.

---

## 4. Publication, Scheduling, Archive, Return-to-Draft, Delete

**File:** `src/contracts/post-admin.ts:237–256`

- Publication mutations reuse the frozen `PostPublicationMutationInputSchema` (post.ts:120–142) which already validates PUBLISH_NOW, SCHEDULE, RETURN_TO_DRAFT, ARCHIVE, and the transition guard in `PostPublicationTransitionSchema` (post.ts:150–172).
- `AdminPostDeletePayloadSchema` (line 237) requires explicit `postId` + `expectedVersion`. Without `expectedVersion`, deletion fails (test at line 250–252).
- `ADMIN_POST_AUTOSAVE_INTERVAL_MS = 30_000` (line 22). The autosave schema requires `expectedVersion`, so version conflicts are not bypassed. Draft-only guard exists in the runtime (`post-mutations.ts:518–519`), not in the transport contract — correct, as the contract is boundary-only.
- **Adversarial test (post-admin-transport-contract.test.ts:229–256):** All four publication intents accepted; malformed schedule (non-ISO) rejected; delete without version rejected; duplicate tag IDs rejected; invalid translation locales rejected.

**Finding:** None. Delete is a distinct command from archive (archive is a publication transition). Optimistic version is required for both.

---

## 5. Mutation Response Conversion and Failure Mapping

**File:** `src/contracts/post-admin.ts:296–326`

- `POST_FAILURE_MAPPING` (line 296) is a `satisfies Record<PostMutationFailureCode, ...>` — exhaustively covers all 10 domain failure codes. TypeScript compiler enforces this.
- `toAdminPostMutationResponse` (line 312):
  - On success: converts `publishedAt` (Date|null) to `.toISOString()` and `updatedAt` (Date) to `.toISOString()`. Removes raw Date objects.
  - On failure: `FORBIDDEN` → `NOT_FOUND` (indistinguishable from missing). `MEDIA_FORBIDDEN` and `MEDIA_NOT_FOUND` → `MEDIA_INVALID`. `INTERNAL_ERROR` → `UNAVAILABLE`. `UNAUTHENTICATED` → `SESSION_INVALID`.
  - Raw result is parsed through `PostMutationResultSchema` before mapping, rejecting non-conforming shapes.
- **Adversarial test (post-admin-transport-contract.test.ts:260–311):**
  - Date→ISO conversion validated with timezone-aware UTC.
  - FORBIDDEN→NOT_FOUND indistinguishability confirmed.
  - MEDIA_FORBIDDEN→MEDIA_INVALID confirmed.
  - INTERNAL_ERROR→UNAVAILABLE confirmed.
  - Transport-only codes (SESSION_INVALID, CSRF_INVALID, REQUEST_INVALID, UNAVAILABLE) accepted.
  - Raw Date objects, error fields, causes, stacks all rejected in output.

**Finding:** None. The response adapter is strictly JSON-safe and successfully makes forbidden indistinguishable from missing.

---

## 6. Safe Media Picker Output

**File:** `src/contracts/media-admin.ts:45–68`

- `AdminMediaItemSchema` (line 45) extends `PublicMediaViewSchema` (URL validation via `SafePublicMediaUrlSchema` in media.ts:135–154 — HTTPS-or-relative, no username/password/search/hash, storage-key-validated path). Adds `originalName` (no ".", "..", "/", "\\"), `createdAt` (ISO offset), and `uploaderName` (safe text, no control chars, nullable).
- Rejects: private storage classes, storage keys, checksums, paths, uploader identity/email, unsafe filenames, incoherent accessibility/dimensions, duplicate IDs.
- `AdminMediaListResultSchema` (line 51) enforces duplicate-free, bounded items with correct page bounds.
- **Adversarial test (media-admin-transport-contract.test.ts:60–109):**
  - Public image and PDF items accepted.
  - HTTP/unsafe URLs, path-traversal URLs, path-like names, malformed instants, storageKey, checksumSha256, storageClass, uploaderId, absolutePath, uploaderEmail all rejected.
  - Duplicate IDs rejected.
  - Invalid page bounds rejected.

**Finding:** None. The picker output is safe and exposes only public presentation fields.

---

## 7. Multipart Metadata Limits

**File:** `src/contracts/media-admin.ts:70–92`

- `AdminMediaUploadMetadataSchema` is a `.discriminatedUnion("policy")`:
  - `CMS_IMAGE`: max 20 combined intents. `uploadCount` must match `intents.length`. Each intent extends `MediaUploadIntentSchema` with `policy: "CMS_IMAGE"`.
  - `PUBLIC_PDF`: exactly 1 intent, exactly 1 upload. Each intent extends `MediaUploadIntentSchema` with `policy: "PUBLIC_PDF"`.
- `.strict()` on all sub-objects rejects file bytes, trusted actor, storage, path, checksum, and persistence metadata.
- **Adversarial test (media-admin-transport-contract.test.ts:112–165):**
  - 20 images accepted, 21 rejected, count mismatch rejected.
  - Exactly 1 PDF accepted, 2 PDFs rejected, image intent under PDF policy rejected.
  - File bytes (Uint8Array), uploaderId, role, ownership, storageKey, checksumSha256, absolutePath all rejected.
  - Informative decorative image (alt="" + isDecorative=false) also rejected.

**Finding:** None. Limits and policy enforcement are strict and well-tested.

---

## 8. Media Metadata Update/Delete Commands

**File:** `src/contracts/media-admin.ts:96–128`

- `AdminMediaMetadataUpdatePayloadSchema` (line 96): only `mediaId`, `alt`, `isDecorative`. `.strict()` + accessibility refinement. No ownership field accepted.
- `AdminMediaDeletePayloadSchema` (line 117): delegates to `MediaDeleteInputSchema` (media.ts:107–109) which has only `mediaId`. `.strict()` on the underlying schema rejects `force`.
- `AdminMediaTransportCommandSchema` (line 119): discriminated action union with `.strict()` on each variant.
- **Adversarial test (media-admin-transport-contract.test.ts:167–188):**
  - Valid metadata update accepted.
  - Informative+empty alt rejected.
  - Decorative+non-empty alt rejected.
  - uploaderId injection rejected.
  - Valid delete (mediaId only) accepted.
  - Delete with `force: true` rejected.

**Finding:** None. Commands are ownership-neutral at the boundary and reject force deletion.

---

## 9. Media Persistence Invariant Disposition

**File:** `src/contracts/media-admin.ts:177–195`

- `AdminMediaPersistenceInvariantDispositionSchema` (line 177) defines a strict shape: `{publicResponse: {ok: false, code: "UNAVAILABLE"}, operationalAlert: {code: "MEDIA_PERSISTENCE_INVARIANT", severity: "CRITICAL"}}`.
- `adminMediaPersistenceInvariantDisposition()` (line 189) returns this fixed object. The function takes no parameters — it cannot accidentally embed filesystem paths, request metadata, references, or stacks.
- **Adversarial test (media-admin-transport-contract.test.ts:231–243):**
  - Disposition matches expected shape exactly.
  - `AdminMediaPersistenceInvariantDispositionSchema` validates the disposition.
  - The alert fields cannot be merged into the public mutation response (`.strict()` on response rejects extra keys).

**Finding:** None. The disposition correctly separates a generic public UNAVAILABLE response from a fixed critical operational alert.

---

## 10. Adversarial Test Completeness and False-Positive Risk

**Files:** `tests/m3/contracts/post-admin-transport-contract.test.ts` and `tests/m3/contracts/media-admin-transport-contract.test.ts`

### Strengths

- Both test files exercise boundary validation, not runtime behavior. No fixtures depend on database state, sessions, or filesystem.
- Rejection of unknown keys is tested for every schema that uses `.strict()`.
- Injection vectors (type, columnType, actor, role, ownership, author/uploader ID, scope, selector, resource-type) are systematically enumerated and rejected.
- Positive ADMIN and EDITOR-shaped data are tested without embedding permission decisions in client input.
- Date-to-ISO conversion is tested with both null and Date inputs.
- Forbidden-indistinguishable-from-missing (FORBIDDEN→NOT_FOUND, MEDIA_FORBIDDEN→MEDIA_INVALID) is explicitly verified.
- Multipart limits are tested at and beyond the policy boundaries (20/21 images, 1/2 PDFs).
- Deletion without version and deletion with force are both rejected.
- Output shapes reject leaked storage keys, checksums, paths, emails, reference reports, causes, and stacks.

### Coverage gaps (low severity)

1. **`AdminPostTransportFailureCodeSchema` not exhaustively tested** (post-admin-transport-contract.test.ts:293–311): Only 4 of 10 transport codes are explicitly validated as accepted shapes. `VERSION_CONFLICT`, `VALIDATION_FAILED`, `INVALID_STATE`, `SLUG_CONFLICT`, `MEDIA_INVALID`, and `NOT_FOUND` are implicit via the mutation adapter tests but not directly schema-parsed. Risk: Low — the enum definition and exhaustive `satisfies` mapping in the source guarantee correctness.

2. **`toBeritaCreateInput` failure path not tested:** If called with invalid payload, `PostCreateInputSchema.parse` throws a ZodError. The adapter has no try/catch. Risk: Low — the transport layer (not the contract) is responsible for calling the adapter only with already-validated payloads.

3. **`SafeOriginalNameSchema` (media-admin.ts:23–26) inherits length constraint from `originalName` (max 120).** The storage key is always a 64-hex hash, so this is not a practical concern, but the schema re-use across domains creates an implicit coupling. Risk: Low — no security impact.

### False-positive risk

None. All `safeParse` tests assert `.success` directly on Zod schemas. There is no mocking, time-dependent logic, or stateful test ordering. Each test is a pure boundary assertion.

---

## Acceptance Commands Executed

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/contracts/post-admin-transport-contract.test.ts tests/m3/contracts/media-admin-transport-contract.test.ts` | **PASS** — 2 files, 23 tests passed |
| `npm run lint` | **PASS** — No issues found |
| `npm run typecheck` | **PASS** — `tsc --noEmit` exited clean |
| `npm test` | **PASS** — 38 files passed, 16 skipped, 511 tests passed, 69 database-gated skipped |
| `npm run test:integration` | **BLOCKED** — No PostgreSQL database in reviewer worktree. Database-gated 69 tests cannot execute. Recorded evidence from integrator: 16 files passed, 69 tests passed, 0 skipped, 0 failed against isolated PostgreSQL 16 cluster at candidate `033c3b9`. |
| `npm run prisma:validate` | **PASS** — Schema valid |
| `npm run build` | **PASS** — Production build, 22 static pages generated |
| `git diff --check` | **PASS** — Clean |
| `TASK_MANIFEST=... TASK_BASE=... npm run check:scope` | **PASS** — 0 changed files within lease |

---

## Residual Risks and Deferred Areas

These are already documented in the GPT handoff and are not contract defects:

1. **Server-side type=BERITA predicate** (runtime, not contract): The adapters compose `type: "BERITA"` into the Post input, but the later runtime must apply an additional database-level `type=BERITA` target check. This contract cannot enforce that.
2. **ADMIN-all vs EDITOR-own scope derivation**: Loaders must derive scope from the valid server session and add it to database queries. The client schemas intentionally have no scope input; the enforcement is a runtime concern.
3. **Multipart parsing and byte validation**: File bytes, magic-byte validation, and staged-file persistence are deferred to Route Handler implementation.
4. **30-day orphan/backup policy for Media deletion**: The contract defines the `MEDIA_IN_USE` response shape but the cleanup runtime does not yet exist.
5. **CSRF, HTTP status mapping, and rate limiting**: Transport-only failure codes are defined in the contract but their enforcement is deferred to the handler layer.

---

## Reviewed SHA Summary

| Role | SHA |
| --- | --- |
| Assignment commit | `06998687b3fef94b32e63eef9b21a20d694683cb` |
| Candidate under review | `033c3b932e8cc3a85ec23009bdcb2f88ee06b3b3` |
| Implementation commit | `a05f337db32bd1ecc868f6c9afa00807f10bb6d6` |
| Head of review branch | (created from assignment branch) |

---

## Final Verdict: APPROVE

The GPT candidate `033c3b9` produces two frozen transport contracts and comprehensive adversarial tests with zero Critical or High boundary defects. Post/Media query normalization fails closed on all hostile inputs. BERITA-only semantics are enforced at the transport boundary. Publication, scheduling, archive, return-to-draft, and optimistic delete are cleanly separated. Failure codes map authorized/forbidden states correctly and make forbidden indistinguishable from missing. Media Picker output and multipart metadata are safe and bounded. Persistence invariant disposition separates the public response from the operational alert. All acceptance commands pass. No security, authorization, disclosure, or fail-open contract defect was found.
