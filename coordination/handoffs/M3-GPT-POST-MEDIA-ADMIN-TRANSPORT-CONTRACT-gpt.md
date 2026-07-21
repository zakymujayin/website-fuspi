# Handoff — M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT

- Task ID: `M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT`
- Branch: `ai/gpt/m3-post-media-admin-transport-contract`
- Integration base SHA: `311292f48f42db050ad8a21d34589d7d21263799`
- Frozen assignment SHA: `f402d4aa118cccc8873be174065c0f1a1d3f8d9e`
- Implementation SHA: `a05f337db32bd1ecc868f6c9afa00807f10bb6d6`
- Handoff SHA: recorded by the following documentation commit

## Summary

Froze the untrusted server/client boundary for the remaining M3 Berita admin and public Media
Picker work without implementing a loader, action, Route Handler, multipart parser, deletion
runtime, or UI.

The Post contract normalizes bounded singular URL query values, rejects repeated/array and
caller-scoped forms, and exposes only strict JSON-safe list/editor views. It carries Indonesian
admin titles and translation availability, deterministic publication state, optimistic versions,
safe category/author presentation, safe cover Media, and server-derived capability flags. Strict
create/update/autosave/publication/delete envelopes compose the frozen Post schemas while omitting
caller-controlled Post type and column type; adapters restore only `BERITA`/`null`. Domain mutation
results are converted from `Date` to offset-aware ISO strings and map forbidden to the same public
failure as missing.

The Media contract composes the frozen list/upload/delete schemas, normalizes bounded picker
queries without uploader scope, and permits only public image/PDF presentation fields. Multipart
metadata permits at most 20 CMS images or exactly one public PDF, never file bytes or storage
metadata. Metadata update/delete commands remain ownership-neutral at the client boundary.
Persistence results lose storage state and technical failure detail; `MEDIA_IN_USE` remains a
generic stable response. A separate invariant disposition pairs the public `UNAVAILABLE` response
with a fixed critical operational alert code for a caught `MediaPersistenceInvariantError`.

## Files changed

- `src/contracts/post-admin.ts`
- `src/contracts/media-admin.ts`
- `tests/m3/contracts/post-admin-transport-contract.test.ts`
- `tests/m3/contracts/media-admin-transport-contract.test.ts`
- `coordination/handoffs/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-gpt.md`

## Exported contract surface

### Post admin

- Query/read: `AdminPostListQuerySchema`, `AdminPostListSearchParamsSchema`,
  `AdminPostSummarySchema`, `AdminPostListResultSchema`, `AdminPostEditorViewSchema`,
  `AdminPostPublicationStateSchema`, `AdminPostCapabilitiesSchema`, `AdminPostSortSchema`.
- Commands: `AdminPostCreatePayloadSchema`, `AdminPostUpdatePayloadSchema`,
  `AdminPostAutosavePayloadSchema`, `AdminPostDeletePayloadSchema`,
  `AdminPostTransportCommandSchema`, and `ADMIN_POST_AUTOSAVE_INTERVAL_MS`.
- Results/adapters: `AdminPostMutationResponseSchema`, `AdminPostTransportFailureCodeSchema`,
  `toBeritaCreateInput`, `toBeritaUpdateInput`, `toBeritaAutosaveInput`, and
  `toAdminPostMutationResponse`.

### Media admin

- Query/read: `AdminMediaListQuerySchema`, `AdminMediaListSearchParamsSchema`,
  `AdminMediaItemSchema`, and `AdminMediaListResultSchema`.
- Commands: `AdminMediaUploadMetadataSchema`, `AdminMediaMetadataUpdatePayloadSchema`,
  `AdminMediaDeletePayloadSchema`, `AdminMediaTransportCommandSchema`,
  `ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT`, and `ADMIN_MEDIA_PDF_UPLOAD_LIMIT`.
- Results/adapters: `AdminMediaMutationResponseSchema`, `AdminMediaTransportFailureCodeSchema`,
  `toAdminMediaMutationResponse`, `AdminMediaPersistenceInvariantDispositionSchema`, and
  `adminMediaPersistenceInvariantDisposition`.

## API, schema, migration, and compatibility impact

- Adds Zod/TypeScript transport contracts and adapters only; there is no HTTP or Server Action
  implementation and no browser-facing UI.
- No Prisma schema, migration, generated client, dependency, lockfile, environment contract,
  framework config, auth implementation, storage implementation, or existing frozen contract was
  changed.
- Later loaders must derive ADMIN-all versus EDITOR-own scope from the validated session and add
  it only to database queries. The client schemas intentionally have no author/uploader/role/scope
  input.
- Later Berita mutation transports must retain a server-side `type=BERITA` target predicate before
  calling the existing generic Post runtime; the input adapter alone must not be treated as a
  database target authorization check.
- Later Media deletion must check all model/HTML references and preserve the 30-day backup/orphan
  policy; this contract never authorizes direct unlinking.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/contracts/post-admin-transport-contract.test.ts tests/m3/contracts/media-admin-transport-contract.test.ts` | PASS — 23 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 511 passed, 69 database-gated skipped |
| `npm run prisma:validate` with the existing local development `DATABASE_URL` loaded | PASS — schema valid |
| `npm run build` with the existing local development environment loaded | PASS — production build and 22 static pages generated |
| `git diff --check origin/coordination/m3-gpt-post-media-admin-transport-contract-assignment...HEAD` | PASS |
| `TASK_MANIFEST=coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-post-media-admin-transport-contract-assignment npm run check:scope` | PASS — 4 implementation files within lease |

The first bare `npm run prisma:validate` invocation failed before validation because this GPT
worktree has no local `DATABASE_URL`. It passed after loading the already-existing development
environment from the main checkout; no secret value was printed or changed. `next build` generated
a one-line `next-env.d.ts` path drift, which was restored immediately and is absent from the task
diff.

## Adversarial evidence

- Rejects unknown keys; actor/role/author/uploader/ownership injection; arbitrary Post type and
  column type; arbitrary sort/field selectors; oversized/control-character search and labels;
  repeated query values and duplicate IDs; invalid translations; malformed ISO instants;
  non-integer/oversized pagination; delete without optimistic Post version; and `force` Media
  deletion.
- Rejects unsafe/non-HTTPS/path-traversing Media URLs, path-like original names, storage keys,
  checksums, storage classes, absolute paths, author/uploader email, revision data, raw causes,
  stacks, and reference reports in public output.
- Covers safe ADMIN and EDITOR-shaped Post list data, multilingual editor bootstrap data, public
  image/PDF picker data, all Berita publication transitions, 30-second draft autosave, maximum
  multipart counts, generic stable failures, and Date-to-ISO response conversion.

## Untested areas, risks, and follow-ups

- Server Component loaders, Route Handlers, Server Actions, per-request session/permission/type
  predicates, CSRF enforcement, HTTP status mapping, and rate limiting are intentionally deferred.
- Multipart parsing, byte-to-intent cardinality, magic-byte validation, staging/persistence
  invocation, partial multi-upload policy, and operational alert delivery are intentionally
  deferred.
- Media list/detail/update/delete database queries, reference discovery, and the 30-day orphan
  cleanup runtime do not yet exist.
- Tiptap, Media Picker/editor UI, 30-second browser debounce, local conflict preservation,
  responsive/RTL/accessibility behavior, and E2E are deferred to their owning lanes.
- The contract tests are pure boundary tests; database-gated suites remain covered by their
  existing runtime tasks and CI.

## Contract/dependency requests

None.

## Confirmation

- No implementation outside the manifest lease changed.
- No admin runtime, route, action, UI, E2E, schema, dependency, environment, or M4 work started.
- This branch requires the assigned independent DeepSeek review before integration.
