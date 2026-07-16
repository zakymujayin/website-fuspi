---
id: M3-GPT-POST-PUBLIC-QUERY-RUNTIME
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: gpt
base_sha: 0d23c46
allowed_paths:
  - "src/lib/content/post-public-queries.ts"
  - "tests/m3/runtime/post-public-queries.test.ts"
  - "tests/m3/runtime/post-public-queries.integration.test.ts"
  - "coordination/handoffs/M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md"
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
  - "docs/05-halaman-publik.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/reviews/M3-POST-MEDIA-CONTRACT-INTEGRATION-gpt.md"
  - "coordination/reviews/M3-POST-MUTATION-RUNTIME-INTEGRATION-gpt.md"
  - "prisma/schema.prisma"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/storage.ts"
  - "src/lib/content/post-mutations.ts"
  - "src/lib/db/client.ts"
depends_on:
  - M3-GPT-POST-MUTATION-RUNTIME
  - M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW
contracts:
  - src/contracts/post.ts
  - src/contracts/media.ts
  - src/contracts/storage.ts
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-public-queries.test.ts
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-POST-PUBLIC-QUERY-RUNTIME.md TASK_BASE=origin/coordination/m3-gpt-post-public-query-runtime-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 GPT Post Public Query Runtime

Implement the server-only public list and detail query boundary for the frozen M3 Post contract.
Do not add route files, React components, metadata functions, preview behavior, admin loaders,
search, related-post queries, Media persistence, schema/dependency/config changes, or a new
contract in this task.

## Public visibility and query requirements

1. Export list and detail functions that accept an untrusted public-query payload plus trusted
   server dependencies: database, UTC clock, and canonical public-upload base URL. Parse the
   untrusted query with the frozen strict schemas. Never accept status, publication cutoff,
   fallback override, preview, storage key, author identifier, or arbitrary upload origin from the
   caller.
2. Both list and detail must query only `status=PUBLISHED AND publishedAt<=server now`, with
   non-null publication time. Match the requested Post type. Detail additionally matches the
   locale-neutral slug.
3. List must apply the frozen bounded pagination, deterministic ordering
   (`publishedAt desc`, stable ID tie-break), total count, and `hasNextPage`. Category and tag
   filters use their neutral slugs and must not duplicate a parent Post when relations match.
4. Select only the requested locale plus Indonesian fallback. Resolve exact locale first; when EN
   or AR is absent, return ID with `isFallback=true`. A requested ID locale never falls back to
   another language. A Post without a usable ID translation is unavailable rather than partially
   exposed.
5. Project only frozen public fields: parent ID/type/column/slug/featured/publication time,
   non-sensitive author display name, category slug, safe cover view, and resolved translation.
   Never return author/content-owner/uploader IDs, checksums, original filename, storage class,
   private paths, governance fields, versions, raw relations, translation workflow metadata, or
   technical errors.
6. Build cover URLs only by joining a server-validated canonical public-upload base URL with the
   stored hashed `storageKey`. Never trust a stored absolute URL or caller origin. Only public
   WebP Media with coherent dimensions/accessibility metadata may appear; corrupt/private/
   non-image cover records become `cover: null` without leaking why.
7. Parse every projected item/result through `PublicPostViewSchema` and
   `PublicPostListResultSchema`. Invalid/corrupt rows must fail closed and must not expose raw
   database data. Define a small server-only result convention in this module without modifying
   the frozen contracts: invalid public input and unexpected query failure are non-technical;
   not-found/corrupt detail is indistinguishable.

## Verification requirements

Add focused unit tests and PostgreSQL integration tests for:

- strict rejection of status, preview, publication cutoff, fallback override, and upload-origin
  injection;
- future scheduled, draft, archived, wrong-type, and wrong-slug Posts never appearing;
- exact ID/EN/AR translation and deterministic ID fallback metadata;
- no fallback from missing Indonesian content and no duplicate parent results;
- category/tag filtering, pagination boundaries, stable ordering, total, and `hasNextPage`;
- public projection excludes every private identifier and workflow/storage field;
- canonical upload URL construction and fail-closed private/corrupt/PDF cover behavior;
- same non-disclosing detail outcome for missing, future, wrong-type, and corrupt records;
- UTC server-clock boundary where `publishedAt === now` is visible;
- generic database failures never leak Prisma, SQL, filesystem paths, or environment values.

Finish with a committed handoff and stop for independent review. Public routes, metadata,
hreflang/JSON-LD, admin UI, and Media persistence remain closed.
