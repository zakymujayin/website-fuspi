---
id: M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA
milestone: M3
owner: deepseek-v4-pro
reviewer: gpt
tester: deepseek-v4-pro
base_sha: 298034a
allowed_paths:
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "next.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/auth/**"
  - "e2e/experience/**"
  - "e2e/foundation/**"
  - "e2e/locales.spec.ts"
  - "e2e/m3/public-post-experience.spec.ts"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M3-CLAUDE-MEDIA-LIBRARY-BROWSE.md"
  - "coordination/handoffs/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-claude.md"
  - "coordination/tasks/M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW.md"
  - "coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-gpt.md"
  - "coordination/handoffs/M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW-gpt.md"
  - "e2e/auth/password-session.spec.ts"
  - "e2e/m3/public-post-experience.spec.ts"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "tests/m3/runtime/media-admin-transport.integration.test.ts"
  - "tests/security/admin-media-transport-adversarial.integration.test.ts"
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/[locale]/admin/media/**"
  - "src/components/admin/media/**"
  - "src/contracts/media.ts"
  - "src/contracts/media-admin.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/db/client.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-CLAUDE-MEDIA-LIBRARY-BROWSE
  - M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW
contracts:
  - src/contracts/media.ts
  - src/contracts/media-admin.ts
  - src/lib/content/media-admin-transport.ts
acceptance_commands:
  - npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile
  - npx vitest run tests/m3/ui/admin-media-library-browse.test.tsx
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA.md TASK_BASE=origin/coordination/m3-deepseek-media-library-browse-qa-assignment npm run check:scope
risk: medium
token_class: L
status: assigned
---

# M3 DeepSeek Media Library Browse QA

Independently test corrected Claude candidate `dbdeda2` (implementation `fd0ea2a`), which GPT
re-review approved in `59c4944`. This is a PostgreSQL-backed browser QA lane, not a second
implementation or design pass. Add only the leased Playwright spec plus durable review and handoff.
Do not edit product code, messages, unit/runtime tests, contracts, dependencies, schema, config,
task status, ownership, or milestone state.

## Fixture and runtime safety

1. Require an isolated local PostgreSQL `DATABASE_URL`. Refuse any non-PostgreSQL, non-loopback,
   production, staging, or ambiguously named database. Never print credentials or the connection
   string. Use only reserved `example.invalid` identities and unique synthetic markers.
2. Create the minimum ADMIN, EDITOR-A, and EDITOR-B users, active database sessions, and public
   image/PDF Media rows needed for the evidence. Include more than 24 rows for pagination and both
   owners for isolation. Clean sessions, Media, and users in dependency order in `afterAll`, even
   after assertion failure. Do not modify shared seeds or migrations.
3. Use only frozen-valid storage keys, checksums, MIME types, sizes, dimensions, alt/decorative
   combinations, filenames, and UTC timestamps. If image network success is required, intercept
   only the synthetic public upload request in Playwright with deterministic non-sensitive bytes;
   do not write a production-style storage tree or weaken Next image validation.
4. Run serially with the existing dev server contract and inherited environment. Never reuse a
   server/database belonging to another model. Do not expose session tokens, IDs, storage keys,
   emails, database values, or fixture internals in review screenshots/output.

## Required executable coverage

1. Prove unauthenticated and expired/revoked sessions redirect to the locale login path before any
   Media filename/count is rendered. Prove active ADMIN and EDITOR sessions reach the page without
   role, email, user ID, token, or internal error disclosure.
2. Prove ADMIN sees all synthetic public Media while EDITOR-A sees only its own uploads and never
   EDITOR-B filenames. Verify the visible total and pagination are ownership-scoped. This task does
   not open mutation/negative-IDOR coverage; it tests the read-only browse boundary only.
3. Prove the ALL/IMAGE/PDF filters show only the selected frozen MIME type, reset to page 1, retain
   the active locale, and preserve correct current-filter semantics. Prove 24-item pagination,
   next/previous links, and active filter preservation across pages.
4. Prove missing/default, valid, unknown-key, repeated-array, empty, zero, negative, fractional,
   leading-zero, excessive, hostile, and invalid-kind query combinations render the canonical
   safe page without reflecting hostile input, leaking technical output, or revealing hidden Media.
5. Prove image/PDF cards show the frozen display fields: safe thumbnail or intentional placeholder,
   filename, localized type/size/dimensions, accessibility state/alt, optional uploader label, and
   `Asia/Jakarta` timestamp. Long filenames/alt text must not create horizontal overflow.
6. Prove ID, EN, and AR copy is present and product-facing. Arabic document direction remains RTL,
   Media does not mirror, pagination chevrons are direction-safe, and numeric/date presentation is
   locale-aware. Do not assert implementation-private class names except when necessary to prove
   the explicit reduced-motion or RTL contract.
7. Run axe WCAG A/AA checks on populated ID and AR Media pages for ADMIN and at least one EDITOR
   view. Verify exactly one main landmark and H1, semantic Media list, visible keyboard focus on
   filter/pagination links, and no horizontal overflow at 360, 390, 768, 1024, and 1440 px across
   representative LTR and RTL views.
8. Exercise empty-owner and unavailable-safe presentation where feasible without changing product
   configuration. Do not force an unsafe server restart solely to manufacture environment failure;
   rely on the corrected deterministic unit boundary for that case and record the limitation.
9. Use resilient role/name/URL assertions. Do not add cosmetic pixel snapshots, arbitrary timing,
   duplicate the 43 unit assertions, test out-of-scope upload/edit/delete/picker controls, or treat
   the known Turbopack NFT tracing warning as a new UI regression.

## Findings and verdict

Write `coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md` with candidate/review SHAs,
fixture safeguards, exact browser counts, axe/viewport/role evidence, and reproduction steps for
every finding. Verdict is `APPROVE` only with no reproducible Critical/High/Medium defect;
otherwise use `CHANGES_REQUESTED`. Record Low/cosmetic observations once without silently changing
product code.

Run every acceptance command, commit the spec/review/handoff, push the task branch, and stop. Do
not merge, edit the Claude/GPT branches, close leases, start picker/upload/editor work, or open a
retest task.
