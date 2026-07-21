# Handoff — M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME

- Task ID: `M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME`
- Branch: `ai/gpt/m3-post-admin-transport-runtime`
- Base SHA: `f86200a53eefed1a281ec974c6aaa53d66dce55f`
- Implementation SHA: `0510103`

## Summary

- Added uncached `GET/POST /api/admin/posts` and `GET /api/admin/posts/[postId]` Route Handlers.
- Added a dependency-injected Post admin transport runtime for strict query normalization,
  PostgreSQL list/detail queries, session/role/ownership scope, Berita-only target guards, command
  dispatch, safe projection, stable failure mapping, and deterministic HTTP status mapping.
- ADMIN list/detail can access all Berita; EDITOR queries enforce both `authorId` and
  `contentOwnerId` at the database selector.
- UPDATE, AUTOSAVE, PUBLICATION, and DELETE preflight `type=BERITA` plus trusted ownership before
  calling the generic mutation core. Missing, wrong-type, and cross-owner IDs are indistinguishable.
- Added bounded JSON streaming, JSON-only mutation input, same-origin rejection before body/session
  work, explicit `Cache-Control: no-store`, and ID/EN/AR list/detail revalidation on success.
- Added optimistic Post deletion with ownership, version claim, transaction, and sanitized audit
  metadata.
- Added unit, PostgreSQL, and adversarial HTTP tests, including real PostgreSQL TITLE_ASC ordering.

## Files changed

- `src/app/api/admin/posts/route.ts`
- `src/app/api/admin/posts/[postId]/route.ts`
- `src/lib/content/post-admin-transport.ts`
- `src/lib/content/post-mutations.ts`
- `tests/m3/runtime/post-admin-transport.test.ts`
- `tests/m3/runtime/post-admin-transport.integration.test.ts`
- `tests/m3/runtime/post-mutations.test.ts`
- `tests/security/admin-post-transport-adversarial.integration.test.ts`

## API, schema, migration, and dependency impact

- New server endpoints: `GET/POST /api/admin/posts`, `GET /api/admin/posts/[postId]`.
- No schema, migration, dependency, lockfile, shared contract, UI, message, proxy, or public route
  change.
- The current `ActivityAction` enum has no `DELETE`. The deletion audit therefore uses the existing
  `UPDATE` action with sanitized `{operation: "DELETE", version}` metadata. A future GPT schema
  contract may add a first-class DELETE enum value; no existing migration was edited.
- The frozen transport failure contract has no RATE_LIMITED code. No rate-limit code was silently
  overloaded; this remains a bounded contract follow-up before browser rollout if required.

## Verification

- `npx vitest run tests/m3/runtime/post-admin-transport.test.ts tests/m3/runtime/post-mutations.test.ts` — PASS, 14 tests.
- Targeted PostgreSQL `post-admin-transport.integration.test.ts` — PASS, 2 tests, including
  ownership/IDOR, wrong-type exclusion, TITLE_ASC, and optimistic delete/audit.
- Targeted adversarial HTTP suite — PASS, 3 tests.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm test` — PASS, 40 files/520 tests; 17 files/71 database-gated tests skipped by unit config.
- `npm run test:integration` with isolated PostgreSQL 16 — PASS, 18 files/74 tests, 0 skipped.
- `npm run prisma:validate` — PASS.
- `npm run build` — PASS, 23 routes/pages including both new admin endpoints.
- `git diff --check` — PASS.
- Task scope-check against the frozen assignment — PASS, 8 files within lease before handoff.

PostgreSQL verification used database `fuspi_m3_post_admin` in a user-owned isolated cluster under
`/tmp` on loopback port `55434`. It contained only unique synthetic fixtures and was migrated from
the committed migrations. No staging, production, or another lane's database was used.

## Security evidence

- Repeated and unknown query keys fail before Prisma selectors are built.
- Missing/expired/must-change-password/non-CMS sessions fail before database access.
- EDITOR selectors contain Berita type, author, and content-owner predicates.
- Actor/role/type/status injection is rejected by the frozen strict command schema.
- Missing/mismatched Origin returns CSRF_INVALID before session/database access.
- Wrong content type and declared/streamed oversized bodies return REQUEST_INVALID.
- Transport results contain no email, owner ID, storage metadata, Prisma object, raw Date, stack,
  exception, cookie, body, or database detail.
- Rich-text mutations continue through the existing sanitizer and mutation tests.

## Risks and follow-ups

- Independent DeepSeek adversarial review is still required before merge.
- Media picker/upload/metadata/delete runtime is deliberately not included and remains the next GPT
  task after this runtime is accepted.
- The Claude Tiptap/admin editor UI remains closed until Post and Media runtimes merge.
- The route uses the configured `UPLOAD_PUBLIC_URL`; invalid/missing configuration causes detail
  queries to fail closed.
- First-class DELETE audit semantics and admin mutation rate limiting require explicit contract
  decisions rather than hidden behavior in this runtime.
