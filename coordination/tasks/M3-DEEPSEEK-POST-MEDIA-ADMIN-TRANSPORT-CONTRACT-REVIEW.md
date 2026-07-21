---
id: M3-DEEPSEEK-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 033c3b9
allowed_paths:
  - "coordination/reviews/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md"
  - "coordination/handoffs/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-gpt.md"
  - "src/contracts/post-admin.ts"
  - "src/contracts/media-admin.ts"
  - "tests/m3/contracts/post-admin-transport-contract.test.ts"
  - "tests/m3/contracts/media-admin-transport-contract.test.ts"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/storage.ts"
  - "src/lib/content/post-mutations.ts"
  - "src/lib/content/media-persistence.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT
contracts:
  - docs/04-panel-admin.md
  - docs/06-autentikasi-role.md
  - docs/07-upload-media-hostinger.md
  - docs/09-fitur-cms-editor.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/contracts/post-admin-transport-contract.test.ts tests/m3/contracts/media-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-post-media-admin-transport-review-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 DeepSeek Independent Post + Media Admin Transport Contract Review

Perform one bounded, read-only adversarial review of GPT candidate `033c3b9`
(implementation `a05f337`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start an admin runtime/UI task.

## Candidate evidence added after the GPT handoff

On 2026-07-21 the integrator closed the handoff's database-gated gap at the exact candidate head:

1. Initialized a user-owned temporary PostgreSQL 16 cluster under `/tmp` on localhost port `55432`.
2. Created only `fuspi_dev_gpt`, applied both committed migrations, and ran the seed twice
   successfully to prove idempotency.
3. Ran `npm run test:integration`: **16 files passed, 69 tests passed, 0 skipped, 0 failed**.
4. Stopped the temporary cluster and permanently removed only its synthetic test data.

The reviewer must still run the acceptance commands when an isolated migrated PostgreSQL target is
available. If database execution is blocked solely by reviewer environment setup, verify the
recorded 69/69 evidence and inspect the integration design without classifying that environment as
a candidate defect. Never use production/staging data or another model's database.

## Review requirements

1. Confirm raw Post and Media query normalization has one strict bounded contract: defaults are
   deterministic, singular strings are normalized, and repeated arrays, unknown selectors,
   author/uploader/ownership scope, invalid integers, oversized search, and hostile control text
   fail closed before a Prisma query can be built.
2. Confirm Post list/editor output is JSON-safe and contains only the minimum admin presentation:
   neutral slug, Indonesian title/translation availability, coherent scheduled/publication state,
   optimistic version, safe category/author labels, safe public cover Media, and server-derived
   capabilities. It must reject email, owner IDs, revision data, storage metadata, Prisma objects,
   malformed instants, duplicates, and technical errors.
3. Confirm create/update/autosave commands compose the frozen Post fields without accepting
   `type`, `columnType`, actor, role, ownership, status, or server clock. Adapters must restore only
   `BERITA`/`null`; review and explicitly record that a later runtime still requires a server-side
   `type=BERITA` target predicate before the generic Post mutation core is called.
4. Confirm publication envelopes preserve publish-now, future schedule, return-to-draft, and
   archive semantics; delete is a distinct command requiring ID plus optimistic version; and the
   30-second autosave interval cannot bypass draft/version conflict handling.
5. Confirm Post response conversion accepts only the frozen Date-bearing domain result, serializes
   instants to offset-aware ISO strings, retains validation/version/state/slug/Media failures,
   makes forbidden indistinguishable from missing, and exposes only fixed session/CSRF/request/
   unavailable transport failures.
6. Confirm Media Picker items accept only validated public image/PDF URLs and required display
   metadata. Reject private classes, keys, checksums, paths, uploader identity/email, unsafe
   filenames, incoherent accessibility/dimensions, duplicate IDs, and technical data.
7. Confirm multipart JSON composes `MediaUploadIntentSchema`, enforces at most 20 CMS images or
   exactly one public PDF, matches declared counts, and cannot contain file bytes, trusted actor,
   storage, path, checksum, or persistence metadata.
8. Confirm Media metadata update/delete commands do not accept ownership or force deletion.
   `MEDIA_IN_USE` must remain generic, ordinary persistence results must discard internal storage
   state, and later deletion must retain reference checks plus the 30-day backup/orphan policy.
9. Confirm the persistence invariant disposition keeps the public response generic while emitting
   only a fixed non-PII critical alert signal after the runtime class is caught. It must not expose
   causes, paths, request/file metadata, references, or stacks.
10. Inspect both adversarial test files for false positives, missing strictness assertions, unsafe
    positive fixtures, untested adapters/codes, divergence from frozen field limits, and output
    shapes that would force later runtime/UI to widen the contract.

## Verdict rule

- `APPROVE` when no reproducible Critical/High boundary defect or candidate-caused acceptance
  failure remains.
- `REQUEST_CHANGES` only for reproducible Critical/High authorization/ownership injection,
  cross-resource Post mutation, unsafe Media disclosure, count/policy bypass, non-JSON response,
  technical-error leakage, or fail-open contract defect.
- Record Medium/Low observations once as bounded follow-ups. Do not request changes for style,
  naming, cosmetic report noise, hypothetical runtime/UI behavior already documented as deferred,
  or the reviewer environment alone.

Write exact file/line findings, reproduction for every Critical/High issue, command results,
reviewed SHAs, residual risks, and verdict. Commit only the two allowed documentation files, push
the review branch, and stop.
