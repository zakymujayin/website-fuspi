# Independent Adversarial Review — M3 GPT Media Upload Response Contract

- **Reviewer:** DeepSeek v4 Pro (thinking `high`)
- **Assignment branch:** `coordination/m3-deepseek-media-upload-response-contract-review-assignment`
- **Assignment commit:** `4efe23c0f4e59f0e1af8b1dc6dcb2cbac459e668`
- **Candidate under review:** `ef33207`
- **Implementation SHA:** `2647529`
- **Candidate files reviewed:**
  1. `src/contracts/media-admin.ts` — added `AdminMediaUploadResultItemSchema` and `AdminMediaUploadResponseSchema` (lines 141–181)
  2. `tests/m3/contracts/media-admin-transport-contract.test.ts` — added batch upload response tests (lines 192–252)
- **Readonly context verified:** `src/contracts/media.ts`, `src/contracts/storage.ts`, `src/lib/content/media-persistence.ts`

## Verdict: APPROVE

No reproducible Critical/High boundary defect, count/index bypass, technical/storage disclosure, ambiguity permitting partial-success concealment, incompatibility with frozen upload metadata, or candidate-caused acceptance failure was found. The new response contract is strict, safe, and fully compatible with existing frozen contracts.

---

## Findings by Severity

### No Critical or High findings.

### Low — 2 findings

#### L1. `AdminMediaUploadResultItemSchema.index` bound coupled to IMAGE limit

**File:** `src/contracts/media-admin.ts:142`

```ts
index: z.number().int().min(0).max(ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT - 1),
```

The index maximum is derived from `ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT - 1` (= 19) rather than a policy-aware bound. For PUBLIC_PDF items (exactly 1), the only valid index is 0, which is within 0..19. The policy-level refinement in the parent `AdminMediaUploadResponseSchema` (line 154–160) additionally enforces exactly one item for PDF, and the contiguity check (line 161) ensures index 0, making any non-zero PDF index impossible.

**Risk:** Low — no functional impact. The conceptual coupling is harmless because the parent schema's policy-specific constraints dominate.

#### L2. Contiguity check uses O(n) `.some()` scan

**File:** `src/contracts/media-admin.ts:161`

```ts
if (value.items.some((item, index) => item.index !== index)) {
```

The `.some()` short-circuits on first mismatch, making this O(k) where k is the first invalid position. The check correctly validates zero-based start, no gaps, and ordered indexes. For a batch size of max 20, this is trivially fast.

**Risk:** Low — informational. The check is correct and efficient.

---

## Review Requirements — Item-by-Item Verification

### 1. All-or-nothing success shape (no ambiguous partial success)

`AdminMediaUploadResponseSchema` (media-admin.ts:146–181) is a `discriminatedUnion("ok")`:
- Success variant: `{ok: true, policy, items: Array[...]}` — items is required, non-empty, fully specified. No partial/optional flag exists.
- Failure variant: `{ok: false, code}` — no items field, no way to express "some succeeded."
- `.strict()` on both variants prevents extra fields.

A runtime producing a success response must supply every mediaId in the correctly ordered items array. Any intermediate persistence failure requires the runtime to compensate earlier commits and return the failure variant. ✓

### 2. CMS images: 1–20 results; PDF: exactly 1

- `items: z.array(...).min(1).max(ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT)` (line 151) sets range 1–20. ✓
- PDF enforcement (line 154): `value.policy === "PUBLIC_PDF" && value.items.length !== ADMIN_MEDIA_PDF_UPLOAD_LIMIT` → custom issue. ✓
- Test (line 210–229): rejects empty `[]`, 21 items, 2-item PDF. ✓

### 3. Zero-based, contiguous, ordered, unique indexes; unique Media IDs

- Contiguity (line 161): `value.items.some((item, index) => item.index !== index)` — rejects starting after zero, gaps, and out-of-order. ✓
- Unique Media IDs (line 168–170): `new Set(mediaIds).size !== mediaIds.length` → custom issue. ✓
- `AdminMediaUploadResultItemSchema.index` (line 142): `min(0).max(19)`. ✓
- Test (line 218): `[{index: 1, mediaId: "media-1"}]` — starts at 1 → rejected. ✓
- Test (line 219): `[{index: 0, ...}, {index: 2, ...}]` — gap at index 1 → rejected. ✓
- Test (line 220): duplicate mediaId → rejected. ✓

### 4. Success exposes only policy, index, mediaId

- `AdminMediaUploadResultItemSchema` (line 141): `{index, mediaId}` with `.strict()`. ✓
- Success variant `.strict()`: only `ok`, `policy`, `items`. ✓
- Test (line 247): `{index: 0, mediaId: "media-1", storageKey: ...}` → rejected. ✓
- Test (line 248): extra `checksumSha256` in success → rejected. ✓
- No fields for filenames, URLs, storage keys/classes/state, checksums, uploader identity, bytes, request metadata. ✓

### 5. Failure reuses frozen codes, no partial/technical leakage

- Failure variant: `{ok: false, code: AdminMediaTransportFailureCodeSchema}` with `.strict()`. ✓
- `AdminMediaTransportFailureCodeSchema` is frozen (8 codes: SESSION_INVALID through UNAVAILABLE). ✓
- Test (line 242): all 8 codes accepted. ✓
- Test (line 245): partial success rejected. ✓
- Test (line 246): path leakage rejected. ✓
- No fields for per-file errors, filenames, URLs, storage state, checksums, uploader, bytes, causes, stacks, Prisma details, or operational alerts. ✓

### 6. Existing single-item metadata update/delete responses unchanged

- `AdminMediaMutationResponseSchema` (line 183–192): same shape as before. ✓
- `AdminMediaMetadataUpdatePayloadSchema` (line 96): unchanged. ✓
- `AdminMediaDeletePayloadSchema` (line 117): unchanged. ✓
- `AdminMediaTransportCommandSchema` (line 119): unchanged. ✓
- `MEDIA_FAILURE_MAPPING` (line 194): unchanged. ✓
- `toAdminMediaMutationResponse` (line 208): unchanged. ✓
- `AdminMediaPersistenceInvariantDispositionSchema` (line 219): unchanged. ✓
- `adminMediaPersistenceInvariantDisposition` (line 231): unchanged. ✓
- Prior tests (picker, multipart, mutation, invariant disposition) all preserved. ✓

### 7. Contract forces runtime all-or-nothing semantics

The success variant requires the complete ordered `items` array. No partial-commit flag or field exists. A runtime implementation that commits items incrementally must:

1. Collect all mediaIds into the array.
2. If any intermediate item fails, compensate (delete/unlink) all previously committed items.
3. Return the failure variant with no items.

The contract design makes partial-success representation structurally impossible. ✓

### 8. Test quality — false positives and boundary coverage

- **Positive cases:** 20-image batch, 1-PDF batch. ✓
- **Boundary negatives:** empty items, 21 items, 2-PDF items, non-zero start index, gapped index, duplicate mediaId, duplicate items. ✓
- **Leakage negatives:** partial success payload, path leakage, storageKey in success items, checksum in success root. ✓
- **All failure codes:** 8 codes each accepted as valid failure payloads. ✓
- **False positive risk:** None. All assertions use `safeParse` on pure Zod schemas with no mock, database, or stateful dependency. ✓
- **Missing:** No explicit test for out-of-order indexes (e.g., `[{index: 1, ...}, {index: 0, ...}]`). However, the contiguity check at line 161 would catch this: at array index 0, item.index === 1 → 0 !== 1 → rejected. The test gap is that this specific case isn't tested, but it's covered by the get-first-position behavior of the contiguity check. **Low** — the single check's O(1) hit on the first element covers both non-zero-start and out-of-order cases.

---

## Acceptance Commands Executed

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/contracts/media-admin-transport-contract.test.ts` | **PASS** — 1 file, 15 tests passed |
| `npm run lint` | **PASS** — No issues |
| `npm run typecheck` | **PASS** — Clean |
| `npm test` | **PASS** — 40 files passed, 17 skipped, 523 tests passed, 71 database-gated skipped |
| `npm run prisma:validate` | **PASS** — Schema valid |
| `npm run build` | **PASS** — 23 routes/pages, production build |
| `git diff --check` | **PASS** — Clean |
| `TASK_MANIFEST=... npm run check:scope` | **PASS** — 0 changed files within lease |

No integration tests are required by this manifest; the contract is tested purely through Zod boundary validation.

---

## Residual Risks and Deferred Areas

These are documented in the GPT handoff and are not contract defects:

1. **Runtime implementation**: Multipart body limits, file parsing, upload validation, persistence orchestration, compensation logic, CSRF enforcement, session revalidation, filesystem removal, and operational alert emission remain in the next GPT runtime task.
2. **All-or-nothing orchestration across PostgreSQL + filesystem**: The two systems cannot share one atomic transaction; the runtime must explicitly implement compensation using the frozen persistence-invariant disposition on uncertain rollback.
3. **Media list/detail/update/delete database queries** and reference discovery remain deferred.

---

## Reviewed SHA Summary

| Role | SHA |
| --- | --- |
| Assignment commit | `4efe23c0f4e59f0e1af8b1dc6dcb2cbac459e668` |
| Candidate under review | `ef33207` |
| Implementation SHA | `2647529` |
| Initial review documentation commit | (to be set by commit) |
| Final branch head | corrective documentation commit containing this handoff; exact SHA reported after push |

---

## Final Verdict: APPROVE

The GPT candidate `ef33207` adds a strict `AdminMediaUploadResponseSchema` that correctly closes the gap between multipart metadata (up to 20 images) and the previous single-`mediaId` mutation response. The contract enforces all-or-nothing batch semantics, validates zero-based contiguous ordered indexes and unique Media IDs, exposes only `{policy, index, mediaId}` on success, reuses frozen generic failure codes without exposing partial successes or storage internals, and preserves all existing metadata, command, mutation, and invariant-disposition contracts. All acceptance commands produce clean results. No Critical or High defect remains.
