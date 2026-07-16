# Independent Contract Review — M3-GPT-POST-MEDIA-CONTRACT

- **Task ID:** M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW
- **Branch:** ai/deepseek/m3-post-media-contract-review
- **Frozen base:** origin/coordination/m3-deepseek-post-media-contract-review-assignment (`87a8fae`)
- **GPT implementation SHA:** `6bf5e3c`
- **GPT handoff/candidate SHA:** `a44989c`
- **Reviewer model:** deepseek-v4-pro, thinking=high
- **Verdict:** APPROVE

## Scope

This review covers only the four candidate files:
- `src/contracts/post.ts`
- `src/contracts/media.ts`
- `tests/m3/contracts/post-contract.test.ts`
- `tests/m3/contracts/media-contract.test.ts`

and their interactions with the frozen M2 dependencies: Prisma schema, auth
contract, storage contract, permission matrix, optimistic lock, and
staged-file contract.

## Findings

### No Critical or High defects found.

All 16 review criteria pass:

| # | Criterion | Verdict |
|---|---|---|
| 1 | All untrusted schemas are `.strict()` | PASS |
| 2 | No role, ownership, author/uploader, storage class, publication clock, preview, force-delete, or auth bypass in payloads | PASS |
| 3 | Trusted ADMIN/EDITOR scopes are server-derived discriminants, not payloads | PASS |
| 4 | EDITOR cannot represent ANY/other-owner access | PASS |
| 5 | `id` translation mandatory; `en`/`ar` optional | PASS |
| 6 | Deterministic `id` fallback with explicit `isFallback` metadata; duplicate parent rejection | PASS |
| 7 | Locale-neutral slug pattern; bounded pagination (page <= 10,000, pageSize <= 24/48) | PASS |
| 8 | Public views exclude `authorId`, `storageKey`, `uploaderId` and sensitive identifiers | PASS |
| 9 | `expectedVersion` required on update, autosave, and all publication mutations; version bounds match M2 optimistic-lock contract | PASS |
| 10 | Legal state transitions: DRAFT->{PUBLISH_NOW,SCHEDULE,ARCHIVE}, PUBLISHED->{SCHEDULE,RETURN_TO_DRAFT,ARCHIVE}, ARCHIVED->{RETURN_TO_DRAFT} | PASS |
| 11 | SCHEDULE `publishedAt` must be strictly after server `now`; rejected at or before | PASS |
| 12 | Public visibility requires `status===PUBLISHED && publishedAt <= server now` | PASS |
| 13 | Media validation covers accessibility coherence, MIME/type, size bounds, dimension presence/absence, storage-key extension matching, canonical HTTPS public URL | PASS |
| 14 | Persistence failure result only allows `NOT_STAGED` or `DISCARDED`; orphaned state explicitly rejected | PASS |
| 15 | No false positives; tests exercise actual Zod schemas with both positive and negative cases; no divergence from M2 auth/storage/optimistic-lock contracts | PASS |
| 16 | Contract defects separated from runtime work | PASS |

### Detailed per-criterion analysis

**1. Strict schemas.** Every input schema (`PostCreateInputSchema`,
`PostUpdateInputSchema`, `PostAutosaveInputSchema`,
`PostPublicationMutationInputSchema`, `PostInitialPublicationSchema`,
`MediaUploadIntentSchema`, `MediaValidatedRecordInputSchema`,
`MediaDeleteInputSchema`, `MediaListQuerySchema`,
`PublicPostListQuerySchema`, `PublicPostDetailQuerySchema`) is either
`.strict()` or each discriminant variant is `.strict()`. Unknown fields
are rejected.

**2. Authorization bypass rejection.**
`PostCreateInputSchema` test at `post-contract.test.ts:69-88` confirms
`authorId`, `contentOwnerId`, `role`, `status`, and top-level
`publishedAt` are all rejected. `MediaDeleteInputSchema` at
`media-contract.test.ts:96-98` confirms `force: true` is rejected.
`MediaValidatedRecordInputSchema` at `media-contract.test.ts:78-88`
confirms `uploaderId` and `storageClass: "PRIVATE"` are rejected.

**3. Server-derived scope.** `TrustedPostActorScopeSchema`
(`post.ts:174-185`) and `TrustedMediaActorScopeSchema`
(`media.ts:88-99`) are discriminated by `role` literal with ADMIN
mapped to `ownership: "ANY"` and EDITOR to `ownership: "OWN"`. The
handoff states these must be constructed from the validated server
session. The shape makes it impossible to represent EDITOR-any.

**4. EDITOR-own enforcement.** Both scope schemas reject
`EDITOR + ownership: "ANY"` (tested at `post-contract.test.ts:83-85`
and `media-contract.test.ts:107-109`). The permission matrix
(`permission-matrix.ts:81-82`) assigns EDITOR POST/MEDIA only
`ownership: "OWN"`.

**5. Mandatory Indonesian.** `PostTranslationsInputSchema`
(`post.ts:39-43`) requires `id: PostTranslationInputSchema` and
marks `en`/`ar` as optional. Tests at `post-contract.test.ts:51-67`
reject missing `id`, unknown locales, and nested unknown fields.

**6. Locale fallback.** `ResolvedPostTranslationSchema`
(`post.ts:215-226`) enforces: exact match -> `isFallback=false`;
non-`id` fallback to `id` -> `isFallback=true`; `id` requesting `id` ->
`isFallback=false`. Tests confirm invalid combinations are rejected.
`PublicPostListResultSchema` (`post.ts:247-252`) rejects duplicate
`id` values.

**7. Slug and pagination.** Slug pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
(`post.ts:12`) is locale-neutral. Pagination is bounded: page
1-10,000, pageSize 1-24 (Post list) / 1-48 (Media list), with defaults.

**8. No sensitive identifiers in public views.**
`PublicPostViewSchema` (`post.ts:228-239`) includes `authorName` (not
`authorId`). `PublicMediaViewSchema` (`media.ts:156-179`) includes
`url` (not `storageKey`). Tests reject both private fields.

**9. Optimistic versioning.** All mutation schemas require
`expectedVersion: z.number().int().positive().max(2_147_483_646)`,
matching `OptimisticLockInputSchema` in `operations.ts:72-76`. Tests
reject version 0 and confirm positive-only constraint.

**10. State transitions.** `ALLOWED_TRANSITIONS` (`post.ts:144-148`)
covers all six legal transitions. Tests (`post-contract.test.ts:150-190`)
confirm both acceptance and rejection cases, including the specific
`DRAFT -> RETURN_TO_DRAFT` rejection.

**11. Future-only scheduling.** Both
`PostInitialPublicationDecisionSchema` (`post.ts:86-100`) and
`PostPublicationTransitionSchema` (`post.ts:150-172`) reject
`publishedAt <= now`. Tests verify boundary (exact same-second and
prior-second rejection).

**12. Public visibility.** `PublicPostVisibilitySchema`
(`post.ts:206-213`) requires literal `"PUBLISHED"` status and
`publishedAt <= now`. Both deviations rejected in tests.

**13. Media validation chain.** The contract enforces:
- Accessibility coherence (`media.ts:17-35`): decorative requires empty
  alt; informative requires non-empty alt.
- PDF rejects accessibility metadata (`media.ts:42-46`, `63-68`,
  `171-178`).
- Image MIME must be `image/webp`, storage key must end in `.webp`,
  dimensions required and within 1,600x1,600, size <= 5MB.
- PDF MIME must be `application/pdf`, storage key must end in `.pdf`,
  dimensions must be null.
- `SafePublicMediaUrlSchema` (`media.ts:135-154`) enforces HTTPS or
  relative, no credentials, no search/hash, embedded storage key
  validates against `StorageKeySchema`.
- Tests cover all mismatch cases.

**14. No orphaned result.** `MediaPersistenceResultSchema`
(`media.ts:122-133`) failure branch only allows `storageState` of
`"NOT_STAGED"` or `"DISCARDED"`. `"ORPHANED"` is explicitly rejected
in test (`media-contract.test.ts:147-149`).

**15. Test integrity.** All 30 contract tests pass. No mock
substitution; tests exercise the actual Zod schemas. Negative cases
cover privilege injection, invalid types, missing fields, boundary
violations, and policy mismatch.

**16. Contract vs. runtime boundary.** The following are correctly
deferred to runtime tasks and do not constitute contract defects:
- Database session verification and scope construction
- Database queries, Prisma transactions, and slug-uniqueness checks
- Revision creation and optimistic claim execution
- Tiptap HTML sanitization (delegated to `sanitizeRichTextHtml`)
- Multipart parsing and staged-file commit/discard
- E2E flows and UI rendering

### Potential hardening observations (Medium, for runtime follow-up)

These do not block contract approval:

- **M01 — `SCHEDULE` from `PUBLISHED` state semantics.** The contract
  allows re-scheduling an already-published post. The runtime must
  decide whether the post remains visible during the gap between the
  original `publishedAt` and the new future `publishedAt`. The
  contract correctly validates the transition and future requirement;
  the visibility semantics belong to the runtime implementation.
  *Affects: `src/contracts/post.ts:147`*

- **M02 — No post-in-use failure code.** `PostMutationFailureCodeSchema`
  does not include a post-is-reference code (unlike
  `MediaMutationFailureCodeSchema` which has `MEDIA_IN_USE`). If a
  post needs to be prevented from deletion because it is referenced
  elsewhere, the runtime will need to map this to an existing code
  (e.g., `INVALID_STATE`) or request a contract extension.
  *Affects: `src/contracts/post.ts:254-265`*

- **M03 — `MediaListQuerySchema` lacks uploader filter.** Admin
  cannot filter media list by uploader through the query schema. If
  the admin UX requires this, a contract extension task should add a
  server-scoped filter. The current shape is intentionally restrictive
  and does not leak data.
  *Affects: `src/contracts/media.ts:101-105`*

- **M04 — No optimistic version on media delete.**
  `MediaDeleteInputSchema` has no `expectedVersion`. Media records in
  the Prisma schema may or may not have a `version` field; if they
  gain one in the future, the delete contract will need updating.
  *Affects: `src/contracts/media.ts:107-109`*

## Acceptance command results

| Command | Result |
|---|---|
| `npx vitest run tests/m3/contracts` | PASS — 30 passed, 0 failed |
| `npm run lint` | PASS — No issues found |
| `npm run typecheck` | FAIL — Pre-existing environment failures in `e2e/**`, `prisma/seed.ts`, `src/lib/db/client.ts`, `src/lib/outbox/smtp.ts`, `src/lib/sla/ticket.ts`, `tests/platform/ticket-sla.test.ts` (missing `@axe-core/playwright`, `@prisma/adapter-pg`, `pg`, `nodemailer`; `URGENT`/`SEDANG` enum mismatch). None involve the candidate files. |
| `npm test` | PARTIAL — 350 passed, 6 failed. All 6 failures are pre-existing M2 SLA/enum contract issues in `tests/platform/ticket-enum-contract.test.ts` and `tests/platform/ticket-sla.test.ts`. The 30 M3 contract tests all pass. |
| `git diff --check` | PASS — No whitespace errors |
| `TASK_MANIFEST=... npm run check:scope` | PASS — 0 changed file(s) are within lease |

The typecheck failures in `src/lib/sla/ticket.ts:18,90` and
`tests/platform/ticket-sla.test.ts:35,43` are caused by `URGENT`
and `SEDANG` enum values that don't exist in the generated Prisma
`TicketPriority` enum. This is a pre-existing M2 issue unrelated
to the Post/Media contract candidate.

The missing dependency errors (`@axe-core/playwright`, `pg`,
`@prisma/adapter-pg`, `nodemailer`) are environmental; these
packages are not installed in this worktree's `node_modules`.

## Residual risks

- **The runtime must not construct `TrustedPostActorScope` or
  `TrustedMediaActorScope` from any client-provided value.** The
  Zod schema alone does not prevent a careless server action from
  passing request body fields into the scope. The runtime gate
  (M3 runtime task) must enforce that scopes originate exclusively
  from `auth()` return values.

- **`SafePublicMediaUrlSchema` validates URL format but does not
  verify that the hostname matches the canonical public domain.**
  A URL like `https://evil.example/uploads/2026/07/<valid-key>.webp`
  would pass validation. The runtime must ensure the URL is
  constructed from the canonical `UPLOAD_PUBLIC_URL` env variable.

- **Tiptap HTML is stored as raw string in
  `PostTranslationInputSchema.content`.** The contract performs only
  a null-byte check; XSS prevention is delegated to the M2
  `sanitizeRichTextHtml` function at runtime. This is correct per
  the contract/runtime boundary but the test suite does not verify
  that the runtime writer actually calls the sanitizer. Runtime M3
  tests must cover stored-XSS cases.

## Medium/Low runtime follow-ups

See hardening observations M01-M04 above.

## Confirmation

- [x] No source, test, schema, or dependency files modified
- [x] No runtime/UI started
- [x] No M3 task execution beyond this review
- [x] No merge or integration branch modification
- [x] No GPT branch modification
- [x] Review based on frozen base
  `origin/coordination/m3-deepseek-post-media-contract-review-assignment`
