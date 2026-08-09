---
id: M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: gpt
base_sha: f40c102
allowed_paths:
  - "src/lib/content/media-persistence.ts"
  - "src/lib/storage/committed-file.ts"
  - "src/lib/storage/index.ts"
  - "tests/m3/runtime/media-persistence.test.ts"
  - "tests/m3/runtime/media-persistence.integration.test.ts"
  - "tests/platform/storage/committed-file.test.ts"
  - "coordination/handoffs/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-gpt.md"
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
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "docs/04-panel-admin.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/reviews/M3-POST-MEDIA-CONTRACT-INTEGRATION-gpt.md"
  - "coordination/reviews/M3-POST-PUBLIC-QUERY-RUNTIME-INTEGRATION-gpt.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/db/client.ts"
  - "src/lib/storage/staged-file.ts"
  - "src/lib/storage/paths.ts"
depends_on:
  - M3-GPT-POST-MEDIA-CONTRACT
  - M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW
  - M3-GPT-POST-PUBLIC-QUERY-RUNTIME
  - M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW
contracts:
  - src/contracts/media.ts
  - src/contracts/storage.ts
acceptance_commands:
  - npx vitest run tests/platform/storage/committed-file.test.ts tests/m3/runtime/media-persistence.test.ts
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME.md TASK_BASE=origin/coordination/m3-gpt-media-upload-persistence-runtime-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M3 GPT Media Upload Persistence Runtime

Implement the server-only persistence boundary that coordinates an already validated/staged public
CMS image or public PDF with the PostgreSQL `Media` record. Do not add multipart parsing, route
handlers, Server Actions, UI, Media list/delete behavior, orphan cron, schema/dependency/config
changes, or a new public contract.

## Runtime requirements

1. Accept an untrusted database-session shape, untrusted validated-record payload, an already
   staged `StagedUpload`, database, storage roots, and injected UTC clock/server dependencies.
   Parse the session with `ActiveDatabaseSessionSchema` and the record with
   `MediaValidatedRecordInputSchema`. Only active, unexpired ADMIN/EDITOR actors may continue.
2. Use the central permission matrix for `CREATE MEDIA`. Derive `uploaderId` only from the
   revalidated session. Reject caller-controlled uploader, role, storage class, timestamps, path,
   URL, or arbitrary metadata before database/filesystem mutation.
3. Require staged `storageKey` and checksum to match the parsed record exactly. A mismatch must
   discard the staged temporary file and return a frozen non-technical validation failure.
4. Add a narrowly scoped committed-file compensation helper that validates storage class/key,
   resolves beneath the configured canonical root, rejects symlink/root escape, removes only the
   exact committed file, and treats missing files idempotently. Do not weaken or rewrite the M2
   staging state machine.
5. Coordinate database creation and `staged.commit()` so:
   - database validation/write failure discards the staged file;
   - storage commit failure rolls back the database insert and leaves no staged/destination file;
   - a database transaction commit failure after filesystem commit invokes committed-file
     compensation;
   - success returns only `MediaPersistenceResultSchema` with `COMMITTED`;
   - ordinary cleaned failures return only frozen non-technical failure shapes.
6. A catastrophic failure to compensate a file that was already committed must throw a dedicated
   server-only invariant error rather than falsely returning `storageState: DISCARDED`. It must
   contain no absolute path, credential, database URL, original filename, or raw technical cause.
   Later transport will map it to a generic response and operational alert.
7. Persist only the frozen Media metadata: storage key/class, checksum, sanitized original name,
   MIME, size, accessibility fields, dimensions, derived uploader, and server timestamp/defaults.
   Never persist bytes, absolute paths, public URLs, session fields, or encryption metadata for
   this public-Media task.
8. Do not expose Prisma/storage errors or filesystem locations in returned results or thrown
   invariant messages. Duplicate keys and unexpected database failures must be deterministic and
   leave no staged file.

## Verification requirements

Add focused unit, filesystem, and PostgreSQL integration tests for:

- missing/expired/inactive/non-CMS session rejection before writes;
- permission-matrix enforcement and server-derived uploader identity;
- strict payload rejection and staged key/checksum mismatch cleanup;
- image/PDF metadata persistence with no bytes/path/URL/private fields;
- database create failure discards staging;
- storage commit failure rolls back the Media row;
- synthetic transaction-commit failure removes the committed destination;
- synthetic compensation failure throws only the dedicated non-disclosing invariant error;
- duplicate storage key does not overwrite an existing file/row;
- restrictive path validation, symlink/root escape rejection, and idempotent missing-file cleanup;
- no orphan staged or committed file after every ordinary failure path.

Finish with a committed handoff and stop for one independent DeepSeek review. Media list/delete,
multipart transport, CSRF, routes/actions, UI, and M3 tasks outside this manifest remain closed.
