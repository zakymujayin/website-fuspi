# GPT Review — M3 Claude Media Library Browse

Verdict: **APPROVE after correction**

Candidate: `0eee72854ca579e56339107dc1c2398d9ce3509d`
Implementation: `9a36cd9866fc21239b1d7c34872cc67dde69505d`

The initial review found no Critical/High defect but did find two Medium acceptance defects, so the
candidate returned to Claude on the existing lease before DeepSeek browser/negative QA or integration.

## Re-review — corrected candidate

Corrected branch head: `dbdeda28152043cebe47bd9d0ce0c1754c21b612`
Corrected implementation: `fd0ea2a`

Claude resolved both Medium and all four bounded Low findings without expanding scope:

- full-record query normalization now accepts only `page`/`kind`, mirrors the frozen strict page
  form, and resets the complete query to `{page: 1, kind: "ALL", pageSize: 24}` for any unknown,
  repeated, malformed, leading-zero, or excessive member;
- client acquisition and the Media service call now execute inside a non-technical route-level
  failure boundary;
- deterministic tests cover the strict query and thrown/rejected load cases;
- filter links are 40 px tall, all skeleton pulses honor reduced motion, the heading uses the one
  existing brass-rule token, and ID/EN/AR descriptions are user-facing.

Independent re-review found no remaining Critical, High, Medium, or Low defect in the bounded
slice. Current Web Interface Guidelines, FUSPI identity, RTL/logical utilities, frozen Media
contracts, and scope boundaries pass. The earlier findings below are retained as durable history;
they are resolved and no longer block QA/integration.

Re-review evidence:

- target UI suite: **43/43 passed**;
- lint, typecheck, and Prisma validation: passed;
- unit suite: **579 passed**, 75 database-gated skipped in the unit configuration;
- isolated PostgreSQL integration: **82/82 passed**;
- Next.js 16 production build: passed, 28 routes/pages generated including
  `ƒ /[locale]/admin/media`;
- task scope: **18 changed files within lease**;
- `git diff --check 4f01bbb...dbdeda2`: clean;
- working tree: clean after restoring generated `next-env.d.ts` and deleting the isolated test
  database. The known Turbopack NFT tracing warning remains non-blocking and predates this UI slice.

## Medium

Resolved by corrected implementation `fd0ea2a`; retained below as initial-review history.

### `src/app/[locale]/admin/media/page.tsx`

- `src/app/[locale]/admin/media/page.tsx:35` — the page reads only `kind` and `page`, so an unknown
  key such as `?owner=other&page=2` is silently ignored instead of collapsing the whole query to
  the canonical `{page: 1, kind: "ALL", pageSize: 24}` default required by manifest item 3.
- `src/app/[locale]/admin/media/page.tsx:42` — `getPrismaClient()` executes outside any route-level
  failure boundary. With a missing/invalid `DATABASE_URL`, client creation throws before
  `listAdminMedia` can return its safe `UNAVAILABLE` result, contrary to manifest item 4. Catch
  client acquisition and the service call at this route boundary and render only the existing
  translated unavailable state; do not expose or log the exception in UI/RSC output.

### `src/components/admin/media/media-query.ts`

- `src/components/admin/media/media-query.ts:17` — the page parser accepts leading-zero forms and
  clamps excessive values (`99999` → `10000`) rather than rejecting them to page 1. This is weaker
  than both the task manifest and frozen `AdminMediaListSearchParamsSchema`. Replace the independent
  permissive parsers with one full-record normalizer (or equivalent) that accepts only keys
  `page`/`kind`, rejects arrays/repeated values and unknown keys, uses the frozen strict page form
  `1..10000`, and returns the complete canonical default on any invalid member.

### `tests/m3/ui/admin-media-library-browse.test.tsx`

- `tests/m3/ui/admin-media-library-browse.test.tsx:55` — the test encodes the weaker excessive-page
  behavior (`99999` → `10000`) and has no full-record unknown-key case. Correct the expectation to
  page 1 and add whole-query cases for unknown keys, repeated values, leading zeroes, and one invalid
  member resetting both fields. Add a route-boundary test proving a thrown client/service setup
  failure produces non-technical unavailable presentation.

## Low

Resolved by corrected implementation `fd0ea2a`; retained below as initial-review history.

### `src/components/admin/media/media-filter-tabs.tsx`

- `src/components/admin/media/media-filter-tabs.tsx:26` — filter controls are approximately 32 px
  tall (`py-1.5`) instead of the 40 px control/touch target required by `docs/17`. Use a logical
  inline-flex/min-height treatment while keeping visible focus and current-page semantics.

### `src/components/admin/media/media-grid-skeleton.tsx`

- `src/components/admin/media/media-grid-skeleton.tsx:15` — every pulse animation lacks a
  `motion-reduce:animate-none` equivalent. Add the reduced-motion variant to each animated block.

### `src/app/[locale]/admin/media/page.tsx`

- `src/app/[locale]/admin/media/page.tsx:51` — the requested single quiet brass rule/detail is
  absent. Add one restrained existing-token detail at the heading; do not change global CSS or add
  decorative noise.

### `messages/id.json`

- `messages/id.json:146` — public-facing admin copy narrates implementation staging (management
  “available at a later stage”). Keep the page honest but product-facing: describe browsing and
  finding approved site media without exposing the delivery roadmap. Apply equivalent natural
  wording in EN and AR.

## Passed review areas

- Session and locale decision precede the Media load; the page delegates ownership entirely to the
  frozen server runtime and does not widen EDITOR visibility.
- Presentation consumes only `AdminMediaItem`/`AdminMediaListResult` data and discloses no uploader
  ID/email, storage key, session detail, database value, or exception.
- Thumbnail resolution fails closed to local `/uploads/...` sources and intentional PDF/image
  placeholders; image dimensions/alt handling are sound.
- Server Components, semantic list structure, H1/H2 hierarchy, locale-aware `Intl` formatting,
  Jakarta time, same-locale navigation, global visible focus, Arabic logical utilities, and safe
  directional icon mirroring are correct.
- FUSPI identity is clean. No FUDA identity, copied data, external domain, or out-of-scope program
  appears in the candidate.
- Current Web Interface Guidelines were applied from
  `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.

## Verification evidence

- `npx vitest run tests/m3/ui/admin-media-library-browse.test.tsx`: **45/45 passed** after deleting
  only the generated stale `.next` build cache. A prior rerun in the Claude worktree also executed
  the 45 source tests but discovered a duplicate `.next/standalone/tests` copy; this is a generated
  build-order artifact, not a product defect in this candidate.
- `npm run lint`: passed in the candidate worktree.
- `npm run typecheck`: passed in the candidate worktree.
- Candidate scope check: **17 changed files within lease**.
- `git diff --check 4f01bbb...0eee728`: clean.

## Required next action

Claude should correct only the two Medium findings and the four bounded Low findings on
`ai/claude/m3-media-library-browse`, update deterministic tests and handoff evidence, rerun every
original acceptance command, commit, push, and stop. No picker/upload/edit/delete, dependency,
shared primitive, global style, backend, schema, contract, or browser E2E work is opened by this
review.
