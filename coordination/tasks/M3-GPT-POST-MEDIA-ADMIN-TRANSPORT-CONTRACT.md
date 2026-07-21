---
id: M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: deepseek-v4-pro
base_sha: 311292f
allowed_paths:
  - "src/contracts/post-admin.ts"
  - "src/contracts/media-admin.ts"
  - "tests/m3/contracts/post-admin-transport-contract.test.ts"
  - "tests/m3/contracts/media-admin-transport-contract.test.ts"
  - "coordination/handoffs/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/lib/**"
  - "src/proxy.ts"
  - "messages/**"
  - "tests/m3/runtime/**"
  - "tests/security/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md"
  - "coordination/handoffs/M3-GPT-POST-MEDIA-CONTRACT-gpt.md"
  - "coordination/handoffs/M3-GPT-POST-MUTATION-RUNTIME-gpt.md"
  - "coordination/handoffs/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-gpt.md"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/post.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/content/media-persistence.ts"
  - "src/lib/content/post-mutations.ts"
  - "src/lib/db/client.ts"
  - "src/lib/security/sanitize.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-POST-MEDIA-CONTRACT
  - M3-GPT-POST-MUTATION-RUNTIME
  - M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME
  - M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST
contracts:
  - src/contracts/auth.ts
  - src/contracts/media.ts
  - src/contracts/post.ts
  - src/contracts/storage.ts
acceptance_commands:
  - npx vitest run tests/m3/contracts/post-admin-transport-contract.test.ts tests/m3/contracts/media-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-post-media-admin-transport-contract-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 GPT Post + Media Admin Transport Contract

Freeze the server/client boundary for the remaining **Berita-only** M3 admin reference slice before
any loader, Route Handler, Server Action, Tiptap editor, Media Picker, or browser test is opened.
This is a contract-only task. It must not implement transport/runtime/UI behavior or modify the
already frozen Post/Media/Auth/Storage contracts.

## Boundary principles

1. The M3 admin route is Berita only. A client must not be able to change `type` to Pengumuman,
   Informasi, Kolom, or another CMS resource through a crafted payload. Compose the existing Post
   input schemas but freeze transport-level Post type/column semantics to `BERITA`/no column type.
2. Actor identity, role, ownership/data scope, author/uploader ID, session expiry, and permission
   decisions are server-derived trusted context. They must never be accepted from URL params,
   query, form data, JSON, hidden fields, or multipart metadata.
3. Reuse and compose the existing `PostCreateInputSchema`, `PostUpdateInputSchema`,
   `PostAutosaveInputSchema`, `PostPublicationMutationInputSchema`, `PostMutationResultSchema`,
   `MediaUploadIntentSchema`, `MediaListQuerySchema`, and identifier schemas. Do not fork their
   limits or silently widen them.
4. Every schema is strict, bounded, JSON-safe at the transport boundary, and fails closed. Outbound
   timestamps use offset-aware ISO strings rather than leaking database/Prisma objects. Define
   explicit adapters or schemas for converting the existing Date-bearing domain results.
5. Public responses must never contain storage keys, checksums, absolute filesystem paths,
   database details, stack traces, session tokens, password state, private Media, author email, or
   raw technical errors.

## Required Post admin contract

Create `src/contracts/post-admin.ts` and focused tests covering:

1. A bounded list query for the Berita admin table: page/page size, optional status, bounded search,
   and deterministic sort allowlist. No client-provided author/ownership scope or arbitrary field
   selector. Missing/repeated/array/hostile query forms must have one documented transport
   normalization contract rather than reaching Prisma directly.
2. A safe list result and summary item for the table: ID, neutral slug, safe localized/admin title,
   status/scheduled state, version, featured flag, publication/update instants, category label or ID
   only when contractually available, and minimal author presentation needed by ADMIN. Do not expose
   email or internal revision payloads. Results carry enough metadata for ADMIN-all versus
   EDITOR-own loaders without trusting the client to choose scope.
3. A safe editor bootstrap/detail result containing the existing mutable Post fields,
   ID-required/optional EN/AR translations, version, status/publication state, and safe cover Media
   reference. The contract must preserve unsaved-local conflict handling without returning raw
   sanitized-storage internals.
4. Strict command envelopes for create, update, 30-second draft autosave, publication transitions,
   archive/return-to-draft, and delete. Create/update/autosave compose the existing domain schemas
   while freezing the resource to Berita. Delete requires Post ID plus optimistic version and must
   not be confused with archive.
5. A JSON-safe mutation response mapped from the existing domain result. Preserve stable
   validation, forbidden/not-found indistinguishability, version-conflict, invalid-state,
   slug-conflict, and Media reference failures without exposing implementation detail. Add a
   transport-only CSRF/session/unavailable failure vocabulary where necessary.

## Required Media admin contract

Create `src/contracts/media-admin.ts` and focused tests covering:

1. A bounded Media Picker/list query composed from `MediaListQuerySchema`, with no client-provided
   uploader/ownership scope. Define a safe paginated list result for PUBLIC CMS image/PDF records;
   never expose `storageKey`, checksum, absolute path, or a private storage class.
2. A safe Media admin item with only the fields the picker/detail panel requires: ID, validated
   public URL, MIME, size, dimensions, alt/decorative state, bounded sanitized original name,
   creation instant, and minimal uploader presentation for ADMIN when necessary.
3. Multipart metadata intent composed from `MediaUploadIntentSchema`, explicit upload-count and
   policy limits (CMS images: maximum 20/request; public PDF: one/field), plus JSON-safe success and
   generic failure envelopes. File bytes remain Route Handler input and are not modeled as trusted
   JSON.
4. Strict metadata-update and delete commands with Media ID. Ownership is server-derived. Delete
   responses must distinguish `MEDIA_IN_USE` generically while hiding reference internals; the
   later runtime must retain the 30-day orphan/backup policy rather than unlinking blindly.
5. An invariant/failure representation for `MediaPersistenceInvariantError` that lets the later
   transport return a generic unavailable response and raise an operational alert without leaking
   filesystem/database detail.

## Adversarial contract tests

Tests must prove rejection of unknown keys, actor/role/author/uploader/scope injection, arbitrary
Post type, unsafe sort/field selectors, oversized search/text, repeated IDs, malformed ISO dates,
non-integer/oversized pagination, unsafe URLs, storage keys/paths/checksums in output, invalid
translation shape, delete without optimistic version, invalid multipart metadata, and technical
failure payloads. Include positive ADMIN and EDITOR-shaped outputs without embedding permission
decisions in client input.

## Handoff

Run every `acceptance_commands` entry. Create
`coordination/handoffs/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-gpt.md` with task/base/head SHAs,
schemas exported, compatibility impact, exact commands/results, untested runtime/UI areas, and any
contract question. Commit and push branch `ai/gpt/m3-post-media-admin-transport-contract`, then
stop. Do not implement admin queries, deletion, multipart parsing, CSRF handlers, Server Actions,
Tiptap, Media Picker UI, routes, or E2E, and do not merge to integration or main.
