# M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT Independent Review

## Metadata

| Field | Value |
|---|---|
| Reviewer | DeepSeek |
| Task ID | M4-DEEPSEEK-PAGE-ADMIN-TRANSPORT-CONTRACT-REVIEW |
| Verdict | **APPROVE** |
| Candidate SHA | `5396c762fa73b49c07d69606dc6f1fb8200846a4` |
| Implementation SHA | `35595759ca8738b174ec4f6c6c003c7ba2f4b2ff` |
| Assignment SHA | `799d9d60b3614190ef9c6c3a1752b9443174e9c9` |
| Review branch | `review/ai/deepseek/m4-page-admin-transport-contract-review` |

## Executive Summary

The contract correctly freezes the ADMIN-only Page CMS transport boundary. All Zod schemas are strict, bounded, and fail-closed. No injection vectors found. Domain failure mapping is exhaustive. Tests are focused and thorough. No Critical or High severity defects.

## Reviewed Files

1. `src/contracts/page-admin.ts` (137 lines)
2. `tests/m4/contracts/page-admin-transport-contract.test.ts` (277 lines)
3. `coordination/handoffs/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT-gpt.md` (73 lines)

Only 3 files changed from the assignment base, matching the `allowed_paths` lease exactly. No `next-env.d.ts` change, no FUSPI identity violation, no forbidden file.

## Per-Requirement Analysis

### 1. Raw List Normalization (`AdminPageListSearchParamsSchema`)

- `page`: regex `^(?:[1-9]\d{0,3}|10000)$` — allows 1–10000, rejects 0, 1.5, 10001, arrays, non-numeric. ✓
- `pageSize`: `z.enum(["10","20","50"])` — rejects 100, arbitrary values. ✓
- `status`: `z.union([z.literal("ALL"), PageStatusSchema])` — rejects arrays, unknown statuses. ✓
- `search`: reuses `PageListQuerySchema.shape.search` — trims whitespace, max 100, rejects control chars. ✓
- `sort`: reuses `PageListQuerySchema.shape.sort` — only `UPDATED_DESC` and `TITLE_ASC`. ✓
- `.strict()` rejects unknown keys (actor, role, scope, contentOwnerId, fields selector). ✓
- Transforms produce deterministic defaults: page=1, pageSize=20, status=ALL, search="", sort=UPDATED_DESC. ✓

### 2. List Result (`AdminPageListResultSchema`)

- Direct alias of `PageListResultSchema` — no fork, no widening. ✓
- Rejects `contentOwnerId`, `storageKey`, `revisionSnapshot` via `.strict()` on `PageSummarySchema`. ✓
- Rejects locale-order violations (`["en","id"]` instead of id-first). ✓
- Rejects malformed timestamps (`"03-08-2026"` vs ISO). ✓
- Rejects inconsistent pagination (`hasNextPage` mismatch with total). ✓
- Rejects duplicate items. ✓

### 3. Editor View (`AdminPageEditorViewSchema`)

- Extends `PageDetailViewSchema` — carries all accepted detail fields including `createdAt`, `updatedAt` as ISO strings. ✓
- `hero: PublicMediaViewSchema.nullable()` — safe public media view only. ✓
- SuperRefine enforces coherence:
  - `heroMediaId === null && hero !== null` → rejected. ✓
  - `heroMediaId !== null && hero?.id !== heroMediaId` → rejected (missing or mismatched hero). ✓
  - Both null → accepted. ✓
- Rejects unsafe hero URLs (`javascript:alert(1)`) via `SafePublicMediaUrlSchema`. ✓
- Rejects storage keys, session tokens, content owner IDs in output via `.strict()`. ✓
- Requires `id` translation; rejects extra locales (`fr`). ✓
- Rejects malformed timestamps. ✓

### 4. Command Envelopes (`AdminPageTransportCommandSchema`)

- Discriminated union on `action`: CREATE, UPDATE, PUBLICATION, DELETE. ✓
- CREATE composes `PageCreateInputSchema` — no client actor/role/owner/status. ✓
- UPDATE composes `PageUpdateInputSchema` — requires `pageId` + `expectedVersion`. ✓
- PUBLICATION composes `PagePublicationMutationInputSchema` — only PUBLISH_NOW, RETURN_TO_DRAFT, ARCHIVE. No SCHEDULE. ✓
- DELETE composes `PageDeleteInputSchema` — requires `pageId` + `expectedVersion`. No force-delete. ✓
- `.strict()` on every discriminator branch rejects actor, scope, capability, status, role, contentOwnerId injection. ✓

### 5. Mutation Response Adapter (`toAdminPageMutationResponse`)

- Accepts `unknown` input, validates via `PageMutationResultSchema.parse()`. ✓
- Success: converts `updatedAt: Date` → `.toISOString()` string. Verified JSON-roundtrip-safe. ✓
- Failure mapping — all 12 domain codes exhaustively mapped:

| Domain Code | Transport Code |
|---|---|
| UNAUTHENTICATED | SESSION_INVALID |
| FORBIDDEN | NOT_FOUND |
| VALIDATION_FAILED | VALIDATION_FAILED |
| NOT_FOUND | NOT_FOUND |
| VERSION_CONFLICT | VERSION_CONFLICT |
| INVALID_STATE | INVALID_STATE |
| SLUG_CONFLICT | SLUG_CONFLICT |
| HIERARCHY_CYCLE | HIERARCHY_CYCLE |
| MEDIA_NOT_FOUND | MEDIA_INVALID |
| MEDIA_FORBIDDEN | MEDIA_INVALID |
| PARENT_NOT_FOUND | PARENT_INVALID |
| INTERNAL_ERROR | UNAVAILABLE |

- FORBIDDEN → NOT_FOUND obfuscates target existence. ✓
- Media (2 codes) → MEDIA_INVALID; Parent → PARENT_INVALID. Both generic. ✓
- `AdminPageMutationResponseSchema` is strict; rejects `message`, `INTERNAL_ERROR`, raw Date, malformed ISO. ✓

### 6. Test Analysis

- **10 tests, all passing.** ✓
- Positive cases cover: default normalization, maximum bounds normalization, safe list result, safe ID/EN/AR editor with coherent hero, null-hero editor, all 4 commands, all 3 publication intents, Date→ISO conversion, all 12 failure code mappings. ✓
- Negative cases cover: repeated arrays, zero/oversized page, bad pageSize, unknown sort/selector/actor/owner/role/scope/capability, oversized search, control chars in search, invalid locale shapes, extra locales, missing ID translation, mismatched hero ID, unexpected hero, unsafe hero URL, hero storageKey leakage, contentOwnerId/sessionToken leakage, malformed timestamps, status injection, force-delete, delete without version, autosave, schedule, technical message leakage, raw Date in response, non-ISO string, invalid transport code. ✓
- No false positives detected. All negative assertions validate correct rejection reasons. ✓
- No unreachable assertions. ✓

### 7. Candidate Diff Scope

- From assignment base `bb256e9` to candidate `5396c76`: exactly 3 files (+487 lines). ✓
- No `next-env.d.ts` change. ✓
- No FUSPI identity violation. ✓
- No forbidden path touched. ✓

## Command Results

| Command | Result |
|---|---|
| `npx vitest run tests/m4/contracts/page-admin-transport-contract.test.ts` | PASS — 10/10 |
| `npm run lint` | PASS — no issues |
| `npm run typecheck` | FAIL — 40+ errors, ALL pre-existing (tickets SLA, outbox, auth adapter, seed, E2E missing deps). ZERO errors in `src/contracts/page-admin.ts` or `tests/m4/contracts/page-admin-transport-contract.test.ts`. |
| `npm test` | 54 files, 764/770 passed. 6 pre-existing failures (ticket SLA/contract enum mismatches). 3 files fail to import missing `@prisma/adapter-pg` (pre-existing). Contract tests: 10/10 PASS. |
| `npm run prisma:validate` | PASS — schema valid |
| `npm run build` | FAIL — pre-existing missing dependencies (`@auth/prisma-adapter`, `@prisma/adapter-pg`, `next-auth`). Not contract-related. |
| `git diff --check` | PASS — no whitespace issues |
| `npm run check:scope` | PASS — 0 changed files within lease |

## Findings

### Critical: None

### High: None

### Medium: None

### Low

1. **`CSRF_INVALID` in transport failure code enum never produced by adapter** (`src/contracts/page-admin.ts:76`): The `AdminPageTransportFailureCodeSchema` includes `CSRF_INVALID` but `PAGE_FAILURE_MAPPING` has no domain → CSRF mapping. This is intentional — CSRF validation lives in the transport runtime layer (before the domain adapter), not in the domain failure mapping. The code is reserved for the runtime to use directly. No functional defect.

2. **Direct schema aliases couple transport to domain** (`src/contracts/page-admin.ts:10-11`): `AdminPageListQuerySchema = PageListQuerySchema` and `AdminPageListResultSchema = PageListResultSchema` mean any domain schema change propagates to the transport boundary without explicit review. This follows the stated boundary principle ("compose the accepted feature-local Page schemas without forking") and is working as designed.

### False Positives / Coverage Gaps

- No test for `heroMediaId: null` with hero completely absent (not in object). This is blocked by `.strict()` on `AdminPageEditorViewSchema` regardless — the key must be present. Covered implicitly by the strict check.
- No test for `page: "00001"` → regex requires `[1-9]` at start, so leading zeros are rejected. Covered by the `page: "0"` test case.
- No test for `search` with unicode beyond control chars. The `SearchTextSchema` refinement only blocks `[\u0000-\u001f\u007f-\u009f]` — non-Latin search terms (Arabic, etc.) would pass through. This is correct behavior for a multilingual system.

## Residual Risks

1. **Query injection in domain queries.ts**: `queries.ts:121` uses `Prisma.sql` ILIKE with `query.data.search`. While Prisma.sql template literals parameterize values, the raw query bypasses Prisma's ORM-level input safety. This risk exists in the domain layer (not this contract) and was accepted by the domain integration review.

2. **`mustChangePassword` asymmetry**: Domain `mutations.ts` `actorFromSession` does not check `mustChangePassword`, while `queries.ts` does. This means a password-expired session could still perform mutations. This is a domain-level risk, not a contract defect — the transport contract correctly maps whatever domain codes are returned.

3. **Build environment missing dependencies**: `@prisma/adapter-pg`, `@auth/prisma-adapter`, and `next-auth` packages were not installed in this review environment, causing build and some test import failures. These are all pre-existing and not caused by the contract.

## Verdict

**APPROVE** — No reproducible Critical or High boundary defect. The contract correctly composes frozen domain schemas, fails closed on all injection vectors, exhaustively maps domain failures, and produces JSON-safe output. All contract-specific tests pass. All command failures are pre-existing and unrelated.
