# Handoff — M3-GPT-POST-MUTATION-RUNTIME

- Task ID: `M3-GPT-POST-MUTATION-RUNTIME`
- Branch: `ai/gpt/m3-post-mutation-runtime`
- Frozen base SHA: `93a6289`
  (`origin/coordination/m3-gpt-post-mutation-runtime-assignment`)
- Implementation SHA: `3f4f3f6`
- Handoff SHA: recorded by the following documentation commit

## Summary

Implemented the server-only Post mutation core for the M3 reference slice:

- `createPost` for draft, publish-now, and future scheduling;
- `updatePost` for full optimistic replacement;
- `autosavePost` restricted to owned drafts;
- `mutatePostPublication` for publish-now, schedule, archive, and return-to-draft.

Every operation accepts a revalidated database-session shape and an untrusted payload. The module
parses both boundaries, allows only active ADMIN/EDITOR actors, derives author/owner and time from
server inputs, invokes the central permission matrix, scopes EDITOR reads and guarded writes to
their own records, and returns only frozen `PostMutationResult` shapes.

Parent fields, mandatory Indonesian content, optional English/Arabic content, tag relations,
reference validation, optimistic claims, and revisions are handled within PostgreSQL transactions.
All supplied rich text is sanitized before Prisma receives it. Revisions are split into a neutral
root snapshot plus one snapshot per supplied locale so multilingual content remains below the
existing per-revision size boundary without storing session, credential, token, or storage-key
data.

## Files changed

- `src/lib/content/post-mutations.ts`
- `tests/m3/runtime/post-mutations.test.ts`
- `tests/m3/runtime/post-mutations.integration.test.ts`
- `coordination/handoffs/M3-GPT-POST-MUTATION-RUNTIME-gpt.md`

## Runtime behavior

- Invalid, expired, inactive, and non-CMS sessions fail before database access.
- ADMIN can mutate any Post; EDITOR queries and guarded writes require both server-owned author and
  content-owner identity.
- Missing and another-owner Post IDs both return the same non-disclosing `NOT_FOUND` result.
- Category/tag existence and cover Media visibility are checked inside the owning transaction.
- EDITOR cannot attach another uploader's Media; ADMIN may use public Media visible to the CMS.
- Create status/time are derived from publication intent and the injected server UTC clock.
- Full update and autosave claim the expected version before parent, translation, tag, and revision
  writes. Conflicts leave no partial changes.
- Autosave is rejected for non-draft Posts.
- Re-scheduling a published Post writes a future `publishedAt`; a later public-query task must hide
  it until that time.
- Archive retains the previous publication timestamp for history while the `ARCHIVED` status keeps
  the record non-public. Return-to-draft clears the timestamp.
- Translation workflow status follows the parent mutation: `PUBLISHED`, `DRAFT`, or `STALE` when
  archived.
- Unique-write failures map to the frozen slug-conflict result under the task's reachable
  invariants; unexpected failures return only `INTERNAL_ERROR`.

## API, schema, migration, and dependency impact

- Adds server-only TypeScript exports; no public HTTP route or Server Action transport.
- No contract, Prisma schema, migration, generated client, dependency, lockfile, environment,
  framework config, auth implementation, storage implementation, UI, or message change.
- No new result code or payload shape was introduced.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/runtime/post-mutations.test.ts` | PASS — 8 passed |
| Targeted PostgreSQL runtime suite | PASS — 8 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` with configured PostgreSQL env | PASS |
| `npm test` | PASS — 418 passed, 62 database-gated skipped |
| `npm run test:integration` with configured PostgreSQL env | PASS — 62 passed |
| `git diff --check` | PASS |
| Task scope-check against frozen assignment | PASS — 3 implementation files within lease before this handoff |

The local PostgreSQL role cannot create the documented `fuspi_dev_gpt` database and passwordless
sudo is unavailable. Local integration tests therefore used the configured `fuspi_dev` database
with unique synthetic markers and deterministic cleanup. No production or staging data was used.
GitHub CI must remain the final isolated-database evidence after integration.

## Security and negative evidence

- Caller injection of author, owner, role, status, and publication clock is rejected.
- Stored-XSS corpus is sanitized for ID, EN, and AR before persistence and revision creation.
- Negative-ID IDOR returns the same public result as a missing record.
- Missing category/tag/Media and foreign-owned Media do not create partial Posts.
- Stale update/autosave and slug conflicts roll back the optimistic claim and downstream writes.
- Revision snapshots exclude private storage keys, session fields, credentials, tokens, technical
  errors, and unsanitized HTML.
- Publication tests cover legal and illegal transitions plus the exact server-clock scheduling
  boundary.

## Untested areas, risks, and follow-ups

- HTTP/Server Action transports and per-mutation CSRF enforcement are intentionally deferred.
- Public list/detail queries and locale fallback are intentionally deferred.
- Media database/filesystem persistence, delete reference reports, and orphan cleanup are
  intentionally deferred.
- UI autosave debounce, local conflict preservation, Tiptap, metadata, RTL, and E2E are deferred to
  their owning Claude/DeepSeek tasks.
- The implementation is a large reference-runtime task because the frozen manifest grants a
  single source module for four mutation families plus unit/integration coverage. It should be
  reviewed as one bounded pattern and not expanded with transport or query behavior.

## Contract/dependency requests

None. The four Medium observations from the contract review remain bounded as follows:

- Re-scheduling visibility is represented by future `publishedAt` and will be enforced by public
  queries.
- Post deletion/reference semantics are outside this task.
- Media uploader filtering and Media optimistic deletion remain future Media task concerns.

## Confirmation

- No M3 public query, Media persistence, route handler, Server Action, UI, or M4 work started.
- No source outside the manifest lease changed.
- The branch must receive one independent DeepSeek adversarial review before integration.
