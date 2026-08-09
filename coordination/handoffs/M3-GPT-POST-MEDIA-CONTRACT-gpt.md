# Handoff — M3-GPT-POST-MEDIA-CONTRACT

- Task: `M3-GPT-POST-MEDIA-CONTRACT`
- Branch: `ai/gpt/m3-post-media-contract`
- Base SHA: `fa4abe0` (`origin/coordination/m3-gpt-post-media-contract-assignment`)
- Implementation SHA: `6bf5e3c`
- Handoff SHA: recorded by the following documentation commit

## Summary

Froze the trust-boundary contract for the M3 Post + Media + i18n reference slice. Untrusted Post
payloads now have strict, bounded schemas for create, full update, 30-second draft autosave,
publish-now, future scheduling, return-to-draft, archive, public list, and public detail. The
contract requires Indonesian content, allows optional English/Arabic content, validates the
Post/Column combination, requires optimistic versions, and rejects caller-supplied role, owner,
status, publication bypass, and preview fields.

Trusted server-only schemas separately model ADMIN-any and EDITOR-own scopes, legal publication
state transitions, the server clock, and public visibility. Public results carry explicit locale
fallback metadata, reject duplicate parent records, and do not expose author identifiers.

The Media contract binds upload intent to the existing M2 storage policy, requires coherent
image accessibility metadata, validates public image/PDF record metadata and hashed storage-key
extensions, bounds list/delete input, and rejects uploader/storage overrides. Public Media views
accept only canonical public upload URLs and exclude `storageKey` and `uploaderId`. Persistence
results allow only committed success or failure whose staged file was never created/discarded;
an orphaned state cannot be represented as a normal result.

## Files changed

- `src/contracts/post.ts`
- `src/contracts/media.ts`
- `tests/m3/contracts/post-contract.test.ts`
- `tests/m3/contracts/media-contract.test.ts`
- `coordination/handoffs/M3-GPT-POST-MEDIA-CONTRACT-gpt.md`

## API, schema, migration, and dependency impact

- Adds TypeScript/Zod contracts only; no route, Server Action, service, UI, or runtime database
  implementation.
- No Prisma schema, generated client, migration, dependency, lockfile, environment, auth,
  navigation, or root-configuration change.
- Existing Prisma enums, permission matrix, optimistic-lock contract, upload policy, and storage
  key contract remain authoritative dependencies.
- Contract callers must construct `TrustedPostActorScope` and `TrustedMediaActorScope` only from
  the validated server session; these objects are not request payloads.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/contracts` | PASS — 30 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 410 passed, 54 database-gated skipped |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M3-GPT-POST-MEDIA-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-post-media-contract-assignment npm run check:scope` | PASS — 4 implementation files within lease before this handoff |

The local ignored Prisma client was regenerated from the already-merged schema before typecheck;
no generated file is included in the commit.

## Untested areas, risks, and follow-ups

- Runtime session/permission/ownership checks, database transactions, revision creation,
  optimistic claims, slug conflicts, and public query filters belong to the next GPT runtime task.
- Upload multipart parsing, staged-file commit/discard behavior around database failure, reference
  checks, and orphan cleanup require PostgreSQL/filesystem integration tests in the runtime task.
- Sanitizing Tiptap HTML is intentionally not performed by a Zod shape. The runtime writer must
  pass rich text through the merged M2 sanitizer before persistence and test stored-XSS cases.
- Claude UI and DeepSeek integration/E2E work must target these exported contracts only after this
  branch is independently reviewed and merged.
- Public Post output intentionally omits raw `authorId`; author display uses the non-sensitive
  `authorName` projection.

## Contract/dependency requests

None. Any field, error code, payload shape, schema, or dependency change discovered during
runtime/UI implementation requires a new GPT-owned contract task rather than an inline edit.
