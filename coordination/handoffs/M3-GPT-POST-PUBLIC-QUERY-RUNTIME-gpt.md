# Handoff — M3-GPT-POST-PUBLIC-QUERY-RUNTIME

- Task ID: `M3-GPT-POST-PUBLIC-QUERY-RUNTIME`
- Branch: `ai/gpt/m3-post-public-query-runtime`
- Frozen assignment base SHA: `9467635`
  (`origin/coordination/m3-gpt-post-public-query-runtime-assignment`)
- Manifest integration base SHA: `0d23c46`
- Implementation SHA: `cfe176e`
- Handoff SHA: recorded by the following documentation commit

## Summary

Implemented the server-only public list and detail query boundary for the frozen M3 Post contract.
The runtime validates strict public inputs, derives the publication cutoff from the injected UTC
server clock, applies neutral-slug filters, resolves exact locale with Indonesian fallback, and
projects only the frozen public view.

Both queries require a published Indonesian translation even when EN or AR is requested. This
preserves the mandatory-content contract and prevents an EN/AR-only record from becoming partially
public. Exact EN/AR is returned only when that Post also has usable published Indonesian content.

## Files changed

- `src/lib/content/post-public-queries.ts`
- `tests/m3/runtime/post-public-queries.test.ts`
- `tests/m3/runtime/post-public-queries.integration.test.ts`
- `coordination/handoffs/M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md`

## Runtime behavior

- List and detail accept only the frozen strict query schemas plus trusted server dependencies.
- Visibility is fixed to matching Post type, `PUBLISHED`, non-null `publishedAt`, and
  `publishedAt <= server now`.
- Detail additionally matches the locale-neutral slug.
- List supports neutral category/tag slugs, bounded pagination, total count, `hasNextPage`, and
  deterministic `publishedAt desc, id asc` ordering.
- A published Indonesian translation is mandatory for every visible Post.
- Exact ID/EN/AR content is preferred; missing EN/AR falls back only to ID with explicit fallback
  metadata. Requested ID never falls back.
- Projection includes only the frozen public parent, author display name, category slug, safe
  cover, and resolved translation fields.
- Cover URLs are built from a validated trusted HTTPS or root-relative upload base plus the stored
  hashed storage key.
- Private, non-WebP, malformed, or accessibility/dimension-invalid cover metadata becomes
  `cover: null`.
- Corrupt list results fail with `QUERY_UNAVAILABLE`; invalid, missing, hidden, corrupt, and failed
  detail queries share the non-disclosing `NOT_FOUND` result.
- Unexpected database errors are caught without returning Prisma, SQL, filesystem, credential, or
  environment details.

## API, schema, migration, and dependency impact

- Adds server-only TypeScript exports:
  - `listPublicPosts`
  - `getPublicPostDetail`
- Adds only local result conventions for the server module.
- No HTTP route, Server Action, React component, metadata function, preview behavior, admin
  loader, search query, related-content query, or Media persistence.
- No contract, Prisma schema, migration, generated client, dependency, lockfile, environment,
  framework config, auth, storage, UI, or message change.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/runtime/post-public-queries.test.ts` | PASS — 6 passed |
| Targeted PostgreSQL public-query suite | PASS — 5 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` with configured PostgreSQL env | PASS |
| `npm test` | PASS — 424 passed, 67 database-gated skipped |
| `npm run test:integration` with configured PostgreSQL env | PASS — 67 passed |
| `git diff --check` | PASS |
| Task scope-check against frozen assignment | PASS — 3 implementation files within lease before this handoff |

The PostgreSQL suites use unique synthetic markers and deterministic cleanup. No production or
staging data was used. GitHub CI remains the final isolated-database evidence after integration.

## Security and negative evidence

- Status, preview, caller publication cutoff, fallback override, and upload-origin injection are
  rejected before database access.
- Draft, archived, future, wrong-type, wrong-slug, and EN-only Posts remain unavailable.
- The exact server-clock boundary is visible.
- Category/tag joins do not duplicate parent Posts.
- Public results exclude author/content-owner/uploader IDs, checksums, original filenames, storage
  classes/keys, governance fields, versions, workflow metadata, and raw relations.
- Missing, future, wrong-type, wrong-slug, corrupt, and unusable-locale detail outcomes are
  indistinguishable.
- Private/PDF/corrupt cover records do not disclose their storage metadata.
- Generic database failures return only stable non-technical codes.

## Untested areas, risks, and follow-ups

- HTTP/Server Action transport, cache policy, metadata, hreflang, JSON-LD, and public routes remain
  intentionally deferred.
- Public UI, loading/error states, RTL rendering, accessibility E2E, and visual/performance work
  remain Claude-lane concerns after their own manifests are opened.
- Search, related Posts, sitemap integration, preview, admin queries, and Media persistence remain
  outside this task.
- List behavior intentionally fails the entire result closed if any selected database row violates
  the frozen public projection. An independent review should confirm this conservative policy is
  acceptable for the first reference slice.

## Contract/dependency requests

None.

## Confirmation

- No route, UI, metadata, Media persistence, schema, dependency, shared contract, or M4 work was
  started.
- No source outside the manifest lease changed.
- The branch must receive one independent DeepSeek adversarial review before integration.
