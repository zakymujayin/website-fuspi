---
id: M3-GPT-POST-MUTATION-RUNTIME
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: gpt
base_sha: 6eacab4
allowed_paths:
  - "src/lib/content/post-mutations.ts"
  - "tests/m3/runtime/post-mutations.test.ts"
  - "tests/m3/runtime/post-mutations.integration.test.ts"
  - "coordination/handoffs/M3-GPT-POST-MUTATION-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/app/**"
  - "src/components/**"
  - "src/lib/auth/**"
  - "src/lib/db/**"
  - "src/lib/security/**"
  - "src/lib/storage/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/reviews/M3-GPT-POST-MEDIA-CONTRACT-deepseek.md"
  - "coordination/reviews/M3-POST-MEDIA-CONTRACT-INTEGRATION-gpt.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/contracts/operations.ts"
  - "src/contracts/platform.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/db/client.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/security/sanitize.ts"
depends_on:
  - M3-GPT-POST-MEDIA-CONTRACT
  - M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW
contracts:
  - src/contracts/post.ts
  - src/contracts/auth.ts
  - src/lib/auth/permission-matrix.ts
  - src/lib/db/optimistic-lock.ts
  - src/lib/db/revision.ts
  - src/lib/security/sanitize.ts
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-mutations.test.ts
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-POST-MUTATION-RUNTIME.md TASK_BASE=origin/coordination/m3-gpt-post-mutation-runtime-assignment npm run check:scope
risk: high
token_class: L
status: assigned
---

# M3 GPT Post Mutation Runtime

Implement the first bounded runtime part of the frozen M3 reference slice: server-only Post create,
full update, draft autosave, publish-now, future scheduling, return-to-draft, and archive. Do not
add a route handler, Server Action transport, UI, public query, Media persistence, dependency,
schema, migration, or contract change in this task.

## Trust boundary

1. Export runtime functions that receive a revalidated `ActiveDatabaseSession` plus an untrusted
   operation payload. Parse both with the merged schemas. Do not accept a client-constructed
   `TrustedPostActorScope`, role, owner, author, publication clock, or authorization decision.
2. Only active ADMIN and EDITOR sessions may enter this module. Derive `authorId` and
   `contentOwnerId` exclusively from the session. ADMIN has any-record scope; EDITOR has own-record
   scope. Check permission and ownership before mutation and again in the database predicate used
   for conflict-sensitive writes.
3. Return only `PostMutationResultSchema` shapes. Map expected failures deterministically; never
   expose Prisma errors, validation issues, identifiers from another owner's record, SQL, stack
   traces, or raw sanitizer errors.

## Transaction and content requirements

1. Create the Post parent, mandatory Indonesian translation, optional English/Arabic
   translations, and unique tag relations atomically. Validate referenced category, tags, cover
   Media, and their actor-visible ownership before writing.
2. Sanitize every translation `content` value with the merged M2 rich-text sanitizer before it
   reaches Prisma. Persist the sanitized value, never the raw payload.
3. Derive create status and `publishedAt` from the publication intent and a server-owned UTC clock.
   `SAVE_DRAFT` produces `DRAFT/null`; `PUBLISH_NOW` produces `PUBLISHED/now`; `SCHEDULE` produces
   `PUBLISHED/future timestamp`.
4. Update and autosave must use the merged optimistic claim inside the same PostgreSQL transaction
   as parent, translation, tag, and revision writes. A stale version returns `VERSION_CONFLICT`
   with no partial changes.
5. Autosave is valid only for an existing owned `DRAFT` Post. It must not publish, schedule,
   archive, or overwrite another actor's record.
6. Publication mutations must load the current state under actor scope, validate the frozen state
   transition against a server-owned clock, claim the expected version, and atomically persist the
   new status/time. Re-scheduling a currently published Post sets a future `publishedAt`; the later
   public-query task must consequently hide it until that time.
7. Write sanitized ContentRevision snapshots for successful create, update/autosave, and
   publication mutations. Snapshots must not include storage keys, user/session data, credentials,
   tokens, or technical errors.
8. Convert unique-slug collisions, missing/forbidden category/tag/cover references, optimistic
   conflicts, invalid state, and unexpected database failures to the existing stable result
   codes. Do not broaden the contract inline.

## Verification requirements

Add focused unit tests and PostgreSQL integration tests for:

- strict payload rejection and server-owned author/owner/status/time fields;
- ADMIN-any versus EDITOR-own create/read-before-write/mutation behavior;
- negative-ID IDOR attempts returning the same non-disclosing result as an unavailable record;
- parent + ID/EN/AR translations + tag relation atomicity and rollback;
- stored-XSS sanitization for every supplied locale;
- category/tag/cover ownership and missing-reference rejection;
- stale update, stale autosave, and stale publication conflicts with no partial write;
- draft-only autosave and every legal/illegal publication transition;
- publish-now and future scheduling using the injected server clock;
- revision creation without forbidden/private fields;
- generic failure mapping without leaked Prisma or filesystem details.

Finish with a committed handoff and stop for independent review. The next GPT tasks—public Post
queries, Media persistence, and HTTP/Server Action transports—remain closed until this task is
integrated.
