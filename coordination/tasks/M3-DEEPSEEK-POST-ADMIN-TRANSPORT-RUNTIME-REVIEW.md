---
id: M3-DEEPSEEK-POST-ADMIN-TRANSPORT-RUNTIME-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 1364bf4
allowed_paths:
  - "coordination/reviews/M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-ADMIN-TRANSPORT-RUNTIME-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "coordination/tasks/M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME.md"
  - "coordination/handoffs/M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME-gpt.md"
  - "coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md"
  - "coordination/reviews/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-deepseek.md"
  - "src/app/api/admin/posts/route.ts"
  - "src/app/api/admin/posts/[postId]/route.ts"
  - "src/lib/content/post-admin-transport.ts"
  - "src/lib/content/post-mutations.ts"
  - "tests/m3/runtime/post-admin-transport.test.ts"
  - "tests/m3/runtime/post-admin-transport.integration.test.ts"
  - "tests/m3/runtime/post-mutations.test.ts"
  - "tests/m3/runtime/post-mutations.integration.test.ts"
  - "tests/security/admin-post-transport-adversarial.integration.test.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/post.ts"
  - "src/contracts/post-admin.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/security/sanitize.ts"
  - "src/lib/audit/activity-log.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME
contracts:
  - docs/04-panel-admin.md
  - docs/06-autentikasi-role.md
  - docs/09-fitur-cms-editor.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-admin-transport.test.ts tests/m3/runtime/post-mutations.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-POST-ADMIN-TRANSPORT-RUNTIME-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-post-admin-transport-runtime-review-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 DeepSeek Independent Post Admin Transport Runtime Review

Perform one bounded, read-only adversarial review of GPT candidate `1364bf4`
(implementation `0510103`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start the Media runtime or admin UI task.

## Candidate evidence

At the exact candidate head, GPT recorded the following isolated evidence:

1. Targeted unit tests: **14 passed, 0 failed**.
2. Targeted PostgreSQL Post admin runtime integration: **2 passed, 0 failed**.
3. Adversarial HTTP integration: **3 passed, 0 failed**.
4. Full unit suite: **520 passed**; **71 database-gated tests skipped** by the unit command.
5. Full PostgreSQL integration suite: **18 files, 74 passed, 0 failed**.
6. Lint, typecheck, Prisma validation, production build, diff check, and scope check passed.

The reviewer must still run the acceptance commands when an isolated migrated PostgreSQL target is
available. If database execution is blocked solely by reviewer environment setup, verify the
recorded 74/74 evidence and inspect the committed test design without classifying the environment
as a candidate defect. Never use production/staging data or another model's database.

## Review requirements

1. Confirm both Route Handlers are explicitly uncached, await Next 16 async params where required,
   stay thin, and expose only frozen JSON-safe Post admin response schemas.
2. Confirm repeated or unknown query fields, hostile control text, invalid pagination/filter/sort,
   malformed JSON, wrong content type, and bodies above 1 MiB fail before a Prisma selector or
   mutation command is constructed. Review the streaming body limit for chunked requests.
3. Confirm POST checks same-origin before body parsing and before session-dependent mutation work.
   Missing, malformed, or mismatched Origin must expose only `CSRF_INVALID` with HTTP 403.
4. Confirm every loader and mutation revalidates a database session; rejects missing, inactive,
   expired, must-change-password, PETUGAS, and SATGAS_PPKS sessions; and derives actor, role,
   author, owner, and capabilities only from that trusted session.
5. Confirm every list predicate is applied in the database. ADMIN may see every `BERITA`, while
   EDITOR must require both `authorId` and `contentOwnerId` to equal the session user. No other
   Post type, email, owner ID, revision, storage metadata, or Prisma object may escape.
6. Confirm detail, UPDATE, AUTOSAVE, PUBLICATION, and DELETE preflight the target with server-owned
   `type=BERITA` plus ownership scope. Invalid, missing, wrong-type, and cross-owner identifiers
   must be externally indistinguishable and must not invoke an unsafe generic mutation path.
7. Confirm CREATE, UPDATE, AUTOSAVE, PUBLICATION, and DELETE use only frozen strict command
   envelopes. Client injection of actor, role, ownership, type, column type, publication state,
   capability, server clock, or unknown keys must fail closed.
8. Confirm list/detail mapping validates malformed dates, duplicate locales/tags, unsafe Media,
   incoherent publication state, and oversized/untrusted data rather than returning a partially
   trusted projection. Verify `TITLE_ASC` remains parameterized and ownership/type scoped.
9. Confirm optimistic DELETE claims exactly the expected version, is transactional, cannot delete
   across owner/type boundaries, rolls back on downstream failure, and writes only a sanitized
   audit record. The current Prisma enum has no DELETE action; using `UPDATE` plus fixed
   `{operation: "DELETE", version}` metadata is an explicitly recorded bounded schema follow-up,
   not by itself grounds for rejection unless it breaks an invariant or leaks data.
10. Confirm all command failures map deterministically to the documented HTTP statuses; unexpected
    exceptions become generic `UNAVAILABLE` without exposing messages, stack traces, SQL, raw
    bodies, cookies, database URLs, or rich-text content.
11. Confirm successful mutations revalidate the necessary ID/EN/AR public and admin Berita paths,
    while failed mutations never revalidate. Inspect path construction for slug or locale abuse.
12. Inspect unit, PostgreSQL, and adversarial tests for false positives, missing high-risk negative
    cases, environmental coupling, unsafe fixtures, incorrect cleanup, or divergence from the
    frozen Post admin contract and existing mutation core.
13. Keep Media picker/upload/metadata/delete runtime, Claude admin editor UI, browser E2E, and a
    future rate-limit contract separate. The frozen failure contract has no `RATE_LIMITED` code;
    record this as the known pre-browser follow-up, not a candidate defect unless the runtime
    silently overloads another code or claims rate limiting exists.

## Verdict rule

- `APPROVE` when no reproducible Critical/High transport, authorization, ownership, transaction,
  XSS, data-disclosure, or candidate-caused acceptance defect remains.
- `REQUEST_CHANGES` only for a reproducible Critical/High defect, a frozen-contract contradiction
  that makes later safe implementation impossible, or a candidate-caused failing acceptance
  command.
- Record Medium/Low observations once as bounded follow-ups. Do not request changes for style,
  naming, task size, already-disclosed enum/rate-limit gaps, or the reviewer environment alone.

Write findings ordered by severity with exact file/line references, reproduction for every
Critical/High finding, reviewed SHAs, command results, residual risks, and the verdict. Commit only
the two allowed documentation files, push the review branch, and stop.
