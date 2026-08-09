# Independent Runtime Review — M3-GPT-POST-MUTATION-RUNTIME

- **Task ID:** M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW
- **Branch:** ai/deepseek/m3-post-mutation-runtime-review
- **Frozen base:** origin/coordination/m3-deepseek-post-mutation-runtime-review-assignment (9ee3ffb)
- **GPT implementation SHA:** 3f4f3f6
- **GPT handoff SHA:** 9ee3ffb
- **Reviewer model:** deepseek-v4-pro
- **Verdict:** APPROVE

## Scope

This review covers the three GPT candidate files:

- `src/lib/content/post-mutations.ts`
- `tests/m3/runtime/post-mutations.test.ts`
- `tests/m3/runtime/post-mutations.integration.test.ts`

and their interactions with the frozen contracts and modules: `src/contracts/auth.ts`,
`src/contracts/post.ts`, `src/lib/auth/runtime/authorization.ts`,
`src/lib/auth/permission-matrix.ts`, `src/lib/db/optimistic-lock.ts`,
`src/lib/db/revision.ts`, `src/lib/security/sanitize.ts`, `prisma/schema.prisma`.

## Findings

### No Critical or High defects found.

All 12 review criteria pass:

| # | Criterion | Verdict |
|---|---|---|
| 1 | Untrusted payloads parsed by frozen strict schemas; actor/owner/role/status/publication time not caller-supplied | PASS |
| 2 | Only active, unexpired ADMIN/EDITOR sessions enter module; actor identity and ownership derive only from session | PASS |
| 3 | Central permission matrix used; EDITOR pre-reads and guarded writes are owner-scoped; missing/another-owner IDs indistinguishable | PASS |
| 4 | Category/tag/cover Media checks in owning transaction; EDITOR cannot use another uploader's Media; ADMIN may use valid public Media | PASS |
| 5 | Every supplied ID/EN/AR rich-text value sanitized before Prisma and revision persistence | PASS |
| 6 | Parent, translations, tag relations, optimistic claim, and revisions commit or roll back atomically | PASS |
| 7 | Autosave is owned-draft-only; cannot publish, schedule, archive, or mutate another actor's Post | PASS |
| 8 | Server-owned UTC clock enforced; frozen legal transitions respected; re-scheduled published content has future `publishedAt` | PASS |
| 9 | Root plus per-locale revision snapshots preserve sanitized state without storage keys, sessions, credentials, tokens, or technical errors | PASS |
| 10 | Only frozen non-technical result shapes escape; unique/error mapping is deterministic | PASS |
| 11 | Unit and integration tests cover high-risk negative cases; no false positives; cleanup is correct | PASS |
| 12 | HTTP/CSRF/public-query/UI deferral does not block safe completion of later tasks | PASS |

### Detailed per-criterion analysis

**1. Strict schema enforcement.** Every mutation function parses `rawInput` via
`PostCreateInputSchema.safeParse`, `PostUpdateInputSchema.safeParse`,
`PostAutosaveInputSchema.safeParse`, or `PostPublicationMutationInputSchema.safeParse`
(`post-mutations.ts:450,593,614,635`). All four are `.strict()` schemas or strict
discriminated unions. The session is parsed via `ActiveDatabaseSessionSchema.safeParse`
(`post-mutations.ts:79`), which is also `.strict()`. Unit test
`post-mutations.test.ts:121-135` confirms that fields like `authorId` injected by the
caller are rejected before any database transaction. Additional unknown-field rejection
is guaranteed by Zod `.strict()`.

**2. Session-derived actor.** `actorFromSession` (`post-mutations.ts:78-87`) validates
the raw session against `ActiveDatabaseSessionSchema` (which has `isActive: z.literal(true)`),
checks expiration (`expiresAt <= now`), and rejects non-ADMIN/non-EDITOR roles.
Unit test `post-mutations.test.ts:99-119` confirms null, expired, and PETUGAS sessions
are rejected before `$transaction` is called. Author and owner are set exclusively from
`actor.userId` (`post-mutations.ts:476-477`). No TrustedPostActorScope or client-constructed
scope is ever accepted.

**3. Permission matrix and ownership scoping.** `isAuthorized` (`post-mutations.ts:93-102`)
delegates to `authorize()` in `authorization.ts:19-44`, which calls `getPermissionRule()`
from the frozen `PERMISSION_MATRIX`. The matrix grants EDITOR POST actions only with
`ownership: "OWN"` (`permission-matrix.ts:81`). `ownedPostWhere` (`post-mutations.ts:104-112`)
adds `contentOwnerId` and `authorId` equality checks for EDITOR only. The guard chain:
`readOwnedPost` (ownership-filtered read) → `isAuthorized` (permission check) →
`updateMany` with `ownedPostWhere` (ownership-filtered write) provides triple
defense-in-depth. Unit test `post-mutations.test.ts:239-267` and integration test
`post-mutations.integration.test.ts:348-375` confirm missing and another-owner Post IDs
both return identical `NOT_FOUND` results.

**4. Reference validation in transaction.** `validateReferences` (`post-mutations.ts:178-214`)
runs inside the owning `$transaction`, checking category existence, complete tag set
existence, and Media visibility. For cover Media, it requires `storageClass: "PUBLIC"`
and, for EDITOR, also `uploaderId === actor.userId` (`post-mutations.ts:204-210`).
Unit test `post-mutations.test.ts:202-218` confirms MEDIA_FORBIDDEN for foreign-owned
cover. Integration test `post-mutations.integration.test.ts:263-297` confirms all four
reference failure cases (missing category, missing tag, missing media, foreign media)
return without creating a Post.

**5. Rich-text sanitization.** `sanitizeTranslations` (`post-mutations.ts:114-124`) calls
`sanitizeRichTextHtml` from the frozen M2 sanitizer module for every locale. The sanitizer
(`sanitize.ts:73-122`) uses DOMPurify with a restricted allow-list, forbids
`script/style/svg/math/template` content, forbids `base/embed/form/iframe/input/link/meta/object`
tags, bans ARIA/data attributes, and validates `href`/`src` against safe schemes.
Unit test `post-mutations.test.ts:173-200` confirms hostile HTML (`onclick`, `<script>`,
`<script>`) is stripped from all three locales and does not appear in revisions.
Integration test `post-mutations.integration.test.ts:177-236` confirms the stored
content is exactly `"<p>Aman</p>"`.

**6. Atomicity.** `createPost` (`post-mutations.ts:439-502`) wraps parent creation,
translation creation, tag creation, and revision creation in a single
`database.$transaction`. `writeExistingPost` (`post-mutations.ts:504-582`) wraps
`readOwnedPost`, `claimOptimisticVersion`, `updateMany`, `replaceTranslations`,
`replaceTags`, and `createRevisions` in one transaction. `mutatePostPublication`
(`post-mutations.ts:626-709`) wraps `readOwnedPost`, `claimOptimisticVersion`,
status `updateMany`, translation status `updateMany`, and `createRevisions` in one
transaction. The optimistic claim (`optimistic-lock.ts:23-50`) uses `updateMany`
with `version: expectedVersion` → `version: {increment: 1}`, which atomically
increments the version only if the expected version matches. If any subsequent
step throws, PostgreSQL rolls back the version increment and all writes.

The slug-conflict rollback test (`post-mutations.integration.test.ts:527-561`)
confirms that a unique constraint violation on the slug does not leave partial
state: the target Post retains its original slug, version, and translation title,
and the revision count is unchanged after the failed update.

**7. Draft-only autosave.** `autosavePost` (`post-mutations.ts:605-623`) passes
`autosave: true` to `writeExistingPost`, which checks `existing.status !== "DRAFT"`
at `post-mutations.ts:518-519` and returns `INVALID_STATE`. Integration test
`post-mutations.integration.test.ts:377-427` confirms autosave succeeds on a
draft (version increments to 2, status stays DRAFT), is rejected on a published
post (returns INVALID_STATE, version unchanged), and a stale autosave returns
VERSION_CONFLICT without partial changes.

**8. Publication clock and transitions.** `publicationOnCreate`
(`post-mutations.ts:139-156`) and `publicStateAfterMutation`
(`post-mutations.ts:158-176`) use the injected `clock()` value (not `new Date()`).
The transition is validated by `PostPublicationTransitionSchema.safeParse`
(`post-mutations.ts:646-650`), which enforces `ALLOWED_TRANSITIONS`
(`post.ts:144-148`):
- DRAFT → {PUBLISH_NOW, SCHEDULE, ARCHIVE}
- PUBLISHED → {SCHEDULE, RETURN_TO_DRAFT, ARCHIVE}
- ARCHIVED → {RETURN_TO_DRAFT}

Schedule requires `publishedAt > now`. Integration test
`post-mutations.integration.test.ts:429-525` exercises a full lifecycle: DRAFT →
PUBLISH_NOW (ok) → PUBLISH_NOW from PUBLISHED (rejected) → SCHEDULE (ok) →
ARCHIVE (ok, preserves future publishedAt) → RETURN_TO_DRAFT (ok, clears
publishedAt) → SCHEDULE past (rejected). Unit test
`post-mutations.test.ts:269-305` confirms invalid transitions are rejected
before claiming a version (updateMany not called).

**9. Revision sanitization.** `createRevisions` (`post-mutations.ts:236-279`) writes
one root snapshot plus one per-locale snapshot via `createContentRevision`. The
root snapshot (`post-mutations.ts:216-234`) includes only type, columnType, slug,
status, isFeatured, publishedAt (as ISO string), version, categoryId, coverMediaId,
and tagIds — no user/session/credential/storage-key data. The per-locale snapshot
(`post-mutations.ts:259-276`) includes locale, title, excerpt, content, metaTitle,
metaDesc, coverCaption, status, and sourceVersion — all sanitized content, no
sensitive fields. The revision module (`revision.ts:23-24`) rejects any snapshot
containing keys matching `/(password|token|secret|session|ciphertext|nonce|encryptiontag|privatekey|reporter|identity|ppks|attachment|storagekey)/i`.
Unit test `post-mutations.test.ts:195-199` verifies no forbidden patterns appear
in revision data. Integration test `post-mutations.integration.test.ts:233-235`
confirms the same for actual database-stored revisions.

**10. Non-technical result shapes.** `resultFailure` (`post-mutations.ts:74-76`)
and `successfulResult` (`post-mutations.ts:422-437`) parse results through
`PostMutationResultSchema`. The `catch` block in `createPost`
(`post-mutations.ts:499-501`) maps P2002 to `SLUG_CONFLICT` and all other
errors to `INTERNAL_ERROR`. The `catch` in `mutatePostPublication`
(`post-mutations.ts:706-708`) maps all errors to `INTERNAL_ERROR` (publication
mutations do not create new records, so P2002 is not expected). Unit test
`post-mutations.test.ts:220-237` confirms that Prisma error messages
(`"postgresql://secret"`) do not appear in the result. The generic catch
uses `catch {}` (no error variable), preventing any accidental logging or
exposure of the error object.

**11. Test integrity.** Unit tests (8 tests) cover: session validation,
author/status injection rejection, server-derived ownership/time,
locale sanitization, foreign Media rejection, error mapping, IDOR
non-disclosure, and invalid transitions. Integration tests (8 tests)
cover: atomic creation with all locales, ADMIN scheduled creation with
shared media, reference validation with partial-write prevention,
optimistic update with rollback, IDOR tests, autosave constraints,
full publication lifecycle, and slug-conflict rollback. All 8 unit
tests pass. The integration tests (8/8) cannot execute in this worktree
due to missing `@prisma/adapter-pg` (environmental limitation — see below).
No mock substitution was found; all tests exercise the actual runtime functions.
Setup creates synthetic marker-prefixed data; afterAll cleanup removes all
marker-prefixed records via cascading deletes (post translations/tags are
CASCADE, content revisions are explicitly cleaned).

**12. Deferred concerns are not blocked.** HTTP transport, CSRF, public queries,
Media filesystem persistence, UI autosave debounce, RTL, and E2E are
explicitly deferred to later tasks per `M3-GPT-POST-MUTATION-RUNTIME.md:76-79`.
None of the implementation choices prevent their safe completion:
- Re-scheduling writes future `publishedAt` which public queries can filter;
- Archive retains `publishedAt` for history, status is `ARCHIVED`;
- Return-to-draft clears `publishedAt`, status is `DRAFT`;
- Media ownership check expects the `Media` table (already in schema);
- Optimistic version is stored in the `Post.version` column (already in schema).

## Environment limitation — integration tests

The PostgreSQL integration tests cannot run in this worktree because
`@prisma/adapter-pg` is not installed in `node_modules`. All 14 integration
test files fail with `Cannot find package '@prisma/adapter-pg'` at import time.
This is an environmental limitation, not a candidate defect.

Per `M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW.md:105-108`:

> If `npm run test:integration` cannot run solely for that environmental reason,
> verify the committed test design and GPT's recorded 62/62 integration evidence,
> record the limitation, and do not misclassify it as a candidate defect.

The GPT handoff (`M3-GPT-POST-MUTATION-RUNTIME-gpt.md:74-78`) records:
- `npm test` — 418 passed, 62 database-gated skipped
- `npm run test:integration` — 62 passed

The integration test design has been verified via code review (see criterion 11).
The tests use synthetic marker-prefixed identifiers, deterministic cleanup in
`afterAll`, and cover the primary mutation paths exhaustively.

## Medium observations (for follow-up)

### M01 — Redundant authorization check in `writeExistingPost`

`writeExistingPost` (`post-mutations.ts:514-517`) calls `readOwnedPost` (which
filters by ownership for EDITOR) and then `isAuthorized` (which also checks
ownership via the permission matrix). For EDITOR, the second check is
structurally unreachable in the normal flow: if `readOwnedPost` returns a
record, the actor must be the owner. The double-check is defense-in-depth
and correct, but it could mask a future regression in `readOwnedPost` by
never exercising the authorization-failure branch in tests.

*Affects: `src/lib/content/post-mutations.ts:514-517`*

### M02 — `mutatePostPublication` catch does not distinguish P2002

The catch block at `post-mutations.ts:706-708` maps all errors to
`INTERNAL_ERROR` without checking for P2002 (unique constraint violation).
While publication mutations do not create new records, any future code
change that adds a unique-constrained write to the publication path could
silently swallow a recoverable conflict. Consider adding a P2002 check
consistent with the pattern in `createPost` and `writeExistingPost`.

*Affects: `src/lib/content/post-mutations.ts:706-708`*

### M03 — No `isActive: false` session edge-case test

The unit test suite tests null, expired, and PETUGAS sessions but not
`isActive: false`. The `ActiveDatabaseSessionSchema` uses
`z.literal(true)` for `isActive`, so this is caught by schema validation,
but an explicit test would provide evidence for the contract-level
behavior. Similarly, `mustChangePassword: true` sessions are implicitly
allowed (correct), but no test documents this decision.

*Affects: `tests/m3/runtime/post-mutations.test.ts:99-119`*

### M04 — `translationsFromExisting` throws on missing Indonesian

`translationsFromExisting` (`post-mutations.ts:381-399`) throws
`"Post has no Indonesian translation."` if the database contains a Post
without an Indonesian (`id` locale) translation. While the mutation flows
always create the `id` translation, this function is used during
`mutatePostPublication` where the post was previously created by the
same module. The throw uses `Error`, not a typed error, and could leak
through the catch block as `INTERNAL_ERROR` with a descriptive message.
The message itself is not a security issue (it describes a schema
invariant, not a credential or query detail), but a consistent error
mapping would reduce surprise.

*Affects: `src/lib/content/post-mutations.ts:393`*

## Acceptance command results

| Command | Result |
|---|---|
| `npx vitest run tests/m3/runtime/post-mutations.test.ts` | PASS — 8 passed |
| `npm run lint` | PASS — No issues found |
| `npm run typecheck` | FAIL — Pre-existing environment failures in `e2e/**`, `prisma/seed.ts`, `src/lib/db/client.ts`, `src/lib/outbox/smtp.ts`, `src/lib/sla/ticket.ts`, `tests/platform/ticket-sla.test.ts` (missing `@axe-core/playwright`, `@prisma/adapter-pg`, `pg`, `nodemailer`; `URGENT`/`SEDANG` enum mismatch). None involve the candidate files. |
| `npm test` | PARTIAL — 358 passed, 6 failed. All 6 failures are pre-existing M2 ticket enum/SLA contract issues. All 8 M3 runtime unit tests pass within the 358 total. |
| `npm run test:integration` | FAIL — 14 test files fail to load due to missing `@prisma/adapter-pg` dependency. Environmental limitation. |
| `git diff --check` | PASS — No whitespace errors |
| `TASK_MANIFEST=... npm run check:scope` | PASS — 0 changed file(s) are within lease |

## Residual risks

| Risk | Severity | Mitigation |
|---|---|---|
| `@prisma/adapter-pg` missing prevents local integration test execution | Low | GPT recorded 62/62 passes; test design verified via review; CI provides isolated environment |
| `translationsFromExisting` throws untyped `Error` on missing Indonesian translation | Low | Only triggered by corrupt database state; module always creates `id` translation on create |
| Pre-existing `URGENT`/`SEDANG` enum mismatch blocks full `npm run typecheck` | Low | Pre-existing M2 issue; no candidate files affected |
| Redundant authorization check masks potential `readOwnedPost` regression | Low | Defense-in-depth is conservative; would require deliberate breakage of ownership filtering |

## Confirmation

- [x] No source, test, schema, dependency, or config files modified
- [x] No GPT branch modified
- [x] No integration branch modified
- [x] No M3 task execution beyond this review
- [x] Review based on frozen base `origin/coordination/m3-deepseek-post-mutation-runtime-review-assignment` (9ee3ffb)
- [x] Only the two allowed documentation files created
