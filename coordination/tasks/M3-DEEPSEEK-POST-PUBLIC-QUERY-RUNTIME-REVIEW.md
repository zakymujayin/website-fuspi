---
id: M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 0704d84
allowed_paths:
  - "coordination/reviews/M3-GPT-POST-PUBLIC-QUERY-RUNTIME-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "coordination/tasks/M3-GPT-POST-PUBLIC-QUERY-RUNTIME.md"
  - "coordination/handoffs/M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md"
  - "coordination/reviews/M3-POST-MUTATION-RUNTIME-INTEGRATION-gpt.md"
  - "src/lib/content/post-public-queries.ts"
  - "tests/m3/runtime/post-public-queries.test.ts"
  - "tests/m3/runtime/post-public-queries.integration.test.ts"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/contracts/storage.ts"
  - "src/lib/db/client.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-POST-PUBLIC-QUERY-RUNTIME
contracts:
  - docs/05-halaman-publik.md
  - docs/07-upload-media-hostinger.md
  - docs/09-fitur-cms-editor.md
  - docs/12-multibahasa-rtl.md
  - docs/19-halaman-berita-detail.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-public-queries.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-post-public-query-runtime-review-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M3 DeepSeek Independent Post Public Query Runtime Review

Perform one bounded, read-only adversarial review of GPT candidate `0704d84`
(implementation `cfe176e`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start another M3 task.

## Review requirements

1. Confirm both public functions parse untrusted input with the frozen strict schemas and reject
   caller injection of status, preview, publication cutoff, fallback behavior, author identity,
   storage key, or upload origin before database access.
2. Confirm visibility is fixed to the requested Post type, `PUBLISHED`, non-null publication time,
   and `publishedAt <=` the injected UTC server clock. Detail must additionally use the neutral
   slug. Draft, archived, future, wrong-type, and wrong-slug records must remain unavailable.
3. Confirm every visible Post requires a usable published Indonesian translation even when EN or
   AR is requested. Exact requested locale must win; missing EN/AR may fall back only to ID with
   correct metadata; requested ID must never fall back.
4. Confirm list category/tag filters use neutral slugs without duplicate parents. Verify bounded
   page/pageSize, total, `hasNextPage`, and deterministic `publishedAt desc, id asc` ordering,
   including equal timestamps.
5. Confirm Prisma selection and final projection expose only the frozen public fields. Author,
   content-owner, uploader IDs, checksums, original filename, storage class/key, governance,
   versions, workflow status, raw relations, and technical errors must never escape.
6. Confirm the upload base is a trusted server dependency, validated as HTTPS or root-relative
   without credentials/query/hash/control characters. Cover URLs must join that base only with a
   valid stored hashed storage key.
7. Confirm only coherent public WebP cover Media is exposed. Private/PPKS-private, PDF, malformed
   storage key, invalid size/dimensions/accessibility metadata, or corrupt Media must become
   `cover: null` without disclosing why.
8. Confirm every projected item and list result passes the frozen Zod public schemas. Corrupt
   detail must be indistinguishable from missing/hidden detail. Corrupt list data and unexpected
   database failures must fail closed with non-technical stable results.
9. Inspect transaction/count behavior for a reproducible consistency, pagination, duplication, or
   error-handling defect. Do not reject merely because list failure is conservatively all-or-
   nothing unless it contradicts the frozen contract or creates a High-impact availability flaw.
10. Inspect unit and PostgreSQL integration tests for false positives, missing high-risk negative
    cases, incorrect setup/cleanup, time-boundary mistakes, and assertions that accidentally pass
    while private data is exposed.
11. Run the acceptance commands. Use the configured local PostgreSQL environment only; never use
    production or staging data. If integration execution is blocked solely by reviewer-worktree
    dependency/environment setup, verify the committed design and GPT's recorded 67/67 evidence,
    document the limitation, and do not misclassify it as a candidate defect.
12. Keep routes, cache policy, metadata, hreflang/JSON-LD, public UI, search, related Posts,
    preview, admin queries, and Media persistence separate. They are later tasks and are not
    grounds to reject this server-only boundary unless the implementation makes their safe
    completion impossible.

## Verdict rule

- `APPROVE` when no reproducible Critical/High runtime defect or candidate-caused acceptance
  failure remains.
- `REQUEST_CHANGES` only for a reproducible Critical/High confidentiality, integrity,
  publication-visibility, locale-isolation, or fail-closed defect; a frozen-contract
  contradiction that makes later safe implementation impossible; or a candidate-caused failing
  acceptance command.
- Record Medium/Low hardening observations once as bounded follow-ups. Do not request another
  review cycle for style, naming, task size, conservative fail-closed behavior, hypothetical
  future changes, or work explicitly deferred by the manifest.

Write findings ordered by severity with exact file/line references, reproduction for every
Critical/High finding, reviewed SHAs, command results, residual risks, and the verdict. Commit only
the two allowed documentation files, push the review branch, and stop.
