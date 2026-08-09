---
id: M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: deepseek-v4-pro
base_sha: 97548ad
allowed_paths:
  - "src/lib/content/media-admin-transport.ts"
  - "src/lib/content/media-persistence.ts"
  - "src/lib/storage/committed-file.ts"
  - "src/lib/storage/index.ts"
  - "src/app/api/admin/media/route.ts"
  - "src/app/api/admin/media/upload/route.ts"
  - "tests/m3/runtime/media-admin-transport.test.ts"
  - "tests/m3/runtime/media-admin-transport.integration.test.ts"
  - "tests/m3/runtime/media-persistence.test.ts"
  - "tests/m3/runtime/media-persistence.integration.test.ts"
  - "tests/platform/storage/committed-file.test.ts"
  - "tests/security/admin-media-transport-adversarial.integration.test.ts"
  - "coordination/handoffs/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/components/**"
  - "src/app/[locale]/**"
  - "src/proxy.ts"
  - "messages/**"
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
  - "coordination/tasks/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT.md"
  - "coordination/reviews/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT-deepseek.md"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/media-admin.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/db/client.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT
  - M3-DEEPSEEK-MEDIA-UPLOAD-RESPONSE-CONTRACT-REVIEW
contracts:
  - src/contracts/media.ts
  - src/contracts/media-admin.ts
  - src/contracts/storage.ts
acceptance_commands:
  - npx vitest run tests/m3/runtime/media-admin-transport.test.ts tests/m3/runtime/media-persistence.test.ts tests/platform/storage/committed-file.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME.md TASK_BASE=origin/coordination/m3-gpt-media-admin-transport-runtime-assignment npm run check:scope
risk: critical
token_class: L
status: merged
---

# M3 GPT Media Admin Transport Runtime

Implement the server-only Media Library picker, batch upload, metadata update, and reference-aware
delete boundaries against the frozen Media contracts. This task opens no visual admin page, Media
Picker component, Tiptap integration, schema, dependency, shared contract, proxy, or public route.

Before changing Next.js behavior, read the complete local Next 16 Route Handler guide at
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.

## Required endpoints

1. `GET /api/admin/media`
   - Strictly normalize only `AdminMediaListSearchParamsSchema` fields and reject repeated keys.
   - Return only `AdminMediaListResultSchema`; select only public Media.
   - ADMIN sees all public Media. EDITOR sees only rows whose `uploaderId` matches the session.
2. `POST /api/admin/media`
   - JSON-only command boundary for `UPDATE_METADATA` and `DELETE`.
   - Same-origin, bounded body, database session, ownership, and permission checks are mandatory.
3. `POST /api/admin/media/upload`
   - Multipart-only boundary containing exactly one `metadata` JSON string and repeated `files`.
   - Bound the streaming request before `formData()`; do not trust Content-Length alone.
   - Match exact file count/order to strict metadata and return only
     `AdminMediaUploadResponseSchema`.

Every response must set `Cache-Control: no-store`.

## Security and persistence behavior

1. Reject missing, inactive, expired, must-change-password, PETUGAS, and SATGAS_PPKS sessions.
2. Derive uploader/ownership/capabilities only from the database-revalidated session and central
   permission matrix. Missing, private, cross-owner, and invalid IDs are externally indistinguishable.
3. Upload must prevalidate every file with the frozen magic-byte/extension/MIME/image/PDF pipeline
   before the first database or committed-file write. Images are rewritten as bounded WebP.
4. Stage every validated file before persistence. If validation/staging fails, discard all staged
   files and create no Media row.
5. Batch success is all-or-nothing. If a later persistence fails, remove every previously committed
   file and matching row. If discard/compensation cannot be confirmed, emit only the fixed non-PII
   `MEDIA_PERSISTENCE_INVARIANT` critical signal and return generic `UNAVAILABLE`.
6. Never log or return raw bytes/body, original filename, checksum, storage key/path/root, uploader
   identity/email, cookie/session, SQL/Prisma error, cause, or stack.
7. Metadata update is image-only, accessibility-coherent, ownership-scoped, and transactional.
8. Delete must check every direct Prisma Media relation plus stored rich HTML and public-document
   storage/URL references. Return only `MEDIA_IN_USE`, never a reference report.
9. Physical deletion must be rollback-safe: atomically quarantine the validated public file during
   the database transaction, restore it if the transaction fails, and finalize removal only after
   the row deletion commits. Missing/uncertain files are invariant failures, not silent success.
10. The quarantine helper must reject traversal, symlink/root escape, duplicate lifecycle calls,
    and destination replacement. It must never operate outside the configured public storage root.
11. Revalidate ID/EN/AR admin Media paths only on successful mutation/upload.

## Required executable evidence

- ADMIN/EDITOR picker scoping, kind filters, pagination, safe URL mapping, and hostile query rejection.
- All session/role/password-change failures occur before database or filesystem work.
- Multipart wrong type, unknown/repeated fields, count mismatch, oversized/chunked bodies, MIME
  spoof, false PDF, SVG/HTML/executable, double extension, path traversal, null/control text,
  accessibility mismatch, and actor/storage injection fail closed.
- 1 and 20 image batches plus one PDF succeed; batch failure after an earlier commit leaves no row,
  public file, or staging file.
- Metadata IDOR and delete IDOR/wrong-class/missing behavior are indistinguishable.
- Every direct relation and HTML/storage-key reference blocks delete with generic `MEDIA_IN_USE`.
- Database failure restores quarantined files; successful delete removes row and file; uncertain
  rollback emits only the fixed critical signal.
- PostgreSQL/filesystem tests use unique synthetic markers and isolated temporary roots with
  deterministic cleanup. Never use staging, production, or another lane's data.

## Deferred follow-up

- The frozen failure contract has no `RATE_LIMITED` code; record a bounded pre-browser contract
  request instead of silently overloading another response.
- Thirty-day orphan reconciliation and verified-backup cleanup automation remain a separate
  operational task; this runtime must not implement a broad recursive cleanup job.
- Claude Media Library UI and browser ownership/IDOR QA remain closed until this runtime merges.

Commit implementation and durable handoff on branch
`ai/gpt/m3-media-admin-transport-runtime`, push it, and stop. Do not merge it yourself.
