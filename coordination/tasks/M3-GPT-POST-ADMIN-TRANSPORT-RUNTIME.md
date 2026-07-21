---
id: M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: deepseek-v4-pro
base_sha: 64887d9
allowed_paths:
  - "src/lib/content/post-admin-transport.ts"
  - "src/lib/content/post-mutations.ts"
  - "src/app/api/admin/posts/route.ts"
  - "src/app/api/admin/posts/[postId]/route.ts"
  - "tests/m3/runtime/post-admin-transport.test.ts"
  - "tests/m3/runtime/post-admin-transport.integration.test.ts"
  - "tests/m3/runtime/post-mutations.test.ts"
  - "tests/m3/runtime/post-mutations.integration.test.ts"
  - "tests/security/admin-post-transport-adversarial.integration.test.ts"
  - "coordination/handoffs/M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME-gpt.md"
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
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md"
  - "coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md"
  - "coordination/reviews/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-deepseek.md"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/post.ts"
  - "src/contracts/post-admin.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/session.ts"
  - "src/lib/content/post-public-queries.ts"
  - "src/lib/db/client.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/audit/activity-log.ts"
depends_on:
  - M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT
  - M3-DEEPSEEK-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-REVIEW
contracts:
  - src/contracts/auth.ts
  - src/contracts/post.ts
  - src/contracts/post-admin.ts
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-admin-transport.test.ts tests/m3/runtime/post-mutations.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME.md TASK_BASE=origin/coordination/m3-gpt-post-admin-transport-runtime-assignment npm run check:scope
risk: high
token_class: L
status: merged
---

# M3 GPT Post Admin Transport Runtime

Implement the server-only Berita admin transport against the frozen Post admin contract. This task
opens no visual admin page, Tiptap component, Media Picker, Media upload endpoint, schema,
dependency, shared contract, proxy, or public route change.

Before changing Next.js behavior, read the complete local Next 16 guides:

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`

Use Route Handlers for this boundary. Route Handlers are uncached by default, but every admin
response must still set `Cache-Control: no-store` explicitly.

## Required endpoints

1. `GET /api/admin/posts`
   - Normalize only the query fields accepted by `AdminPostListSearchParamsSchema`.
   - Detect repeated URL parameters before conversion; do not collapse arrays or duplicate keys.
   - Return only `AdminPostListResultSchema` data and only `type=BERITA` records.
2. `POST /api/admin/posts`
   - Accept JSON only and dispatch `AdminPostTransportCommandSchema` actions.
   - Support CREATE, UPDATE, AUTOSAVE, PUBLICATION, and DELETE.
3. `GET /api/admin/posts/[postId]`
   - Await Next 16 async route params and return only `AdminPostEditorViewSchema` data.
   - Invalid, forbidden, wrong-type, and missing IDs must be externally indistinguishable.

## Security boundary

For every loader and mutation:

1. Validate the database session on the request. Never trust actor, role, owner, author, status,
   or capability fields from the client.
2. Reject non-ADMIN/EDITOR roles. Reject sessions requiring a password change until that flow is
   completed.
3. Derive ownership scope from the trusted session. ADMIN may read/mutate any Berita; EDITOR may
   read/mutate only rows where both `authorId` and `contentOwnerId` match the session user.
4. Re-read every UPDATE, AUTOSAVE, PUBLICATION, and DELETE target with a server-side
   `type=BERITA` plus ownership predicate before delegating to the generic mutation core. A valid
   ID for another Post type must return the same NOT_FOUND surface as a nonexistent ID.
5. Check same-origin before reading a mutation body. Missing/malformed/mismatched Origin returns
   CSRF_INVALID with HTTP 403.
6. Bound JSON bodies before parsing. Malformed JSON, wrong content type, unknown command fields,
   repeated query fields, and oversized requests return REQUEST_INVALID without a technical error.
7. Never return email, user IDs, owner IDs, raw Date, Prisma objects, revision snapshots, storage
   metadata, stack traces, exception messages, Zod details, or database error details.

## Runtime behavior

- Keep route files thin. Put dependency-injected, unit-testable query/mutation orchestration in
  `src/lib/content/post-admin-transport.ts`.
- List queries must apply pagination, status/search/sort, Indonesian-title selection, and ownership
  at the database query itself. Do not fetch broadly and filter in memory.
- Editor queries return required Indonesian content plus available EN/AR translations, tag IDs,
  safe public cover view, coherent publication state, and server-derived capabilities.
- CREATE/UPDATE/AUTOSAVE use the frozen Berita adapters and existing sanitizer/mutation core.
- PUBLICATION preserves publish-now, schedule, archive, and return-to-draft semantics.
- Implement optimistic DELETE transactionally with `expectedVersion`, permission and ownership,
  Berita type guard, and an ActivityLog DELETE record. EDITOR cross-owner and wrong-type deletes
  return NOT_FOUND. Version mismatch returns VERSION_CONFLICT. Do not add force delete.
- Mutation success revalidates public Berita list/detail paths for ID/EN/AR and the relevant admin
  path. Do not revalidate on failure.
- Derive HTTP status deterministically: success 200; SESSION_INVALID 401; CSRF_INVALID 403;
  REQUEST_INVALID/VALIDATION_FAILED 400; NOT_FOUND 404; VERSION_CONFLICT/INVALID_STATE/
  SLUG_CONFLICT 409; MEDIA_INVALID 422; UNAVAILABLE 503.
- Map unexpected exceptions to the fixed generic UNAVAILABLE response and log no PII, raw body,
  cookies, database URL, content HTML, or technical error to public output.

## Required executable evidence

- ADMIN list/detail can see any Berita but never another Post type.
- EDITOR list/detail contains only owned Berita, including negative-ID and known cross-owner IDOR.
- PETUGAS, SATGAS_PPKS, inactive, expired, missing, and must-change-password sessions fail closed.
- Repeated/unknown/hostile query values and malformed/oversized/wrong-content-type bodies fail
  before a Prisma selector or mutation is built.
- Client injection of actor, role, owner, type, columnType, status, capability, or server clock is
  rejected.
- All five commands are exercised. Autosave is draft-only, version conflicts do not overwrite,
  and wrong-type/cross-owner target behavior is indistinguishable from missing.
- Rich text remains sanitized through the existing core; no stored-XSS regression.
- List/editor/mutation outputs pass their frozen Zod schemas and remain JSON-safe.
- PostgreSQL integration tests use unique synthetic markers and deterministic cleanup. Do not use
  staging, production, or another lane's database.

## Out of scope and follow-up

- Media picker/upload/metadata/delete runtime is the next separate GPT task after this merges.
- Claude admin editor UI remains closed until both Post and Media runtimes merge and pass review.
- DeepSeek executable browser ownership/IDOR QA remains closed until the Claude UI merges.
- The current frozen failure contract has no RATE_LIMITED code. Do not silently overload another
  code or change shared rate-limit enums in this task; record a bounded contract request if an
  admin mutation policy is required before browser rollout.

Commit the implementation and durable handoff on branch
`ai/gpt/m3-post-admin-transport-runtime`, push it, and stop. Do not merge it yourself.
