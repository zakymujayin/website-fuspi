---
id: M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA
milestone: M3
owner: deepseek-v4-pro
reviewer: gpt
tester: deepseek-v4-pro
base_sha: 154840d
allowed_paths:
  - "e2e/m3/public-post-experience.spec.ts"
  - "coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-deepseek.md"
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
readonly_paths:
  - "AGENTS.md"
  - "docs/05-halaman-publik.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M3-CLAUDE-PUBLIC-POST-EXPERIENCE.md"
  - "coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md"
  - "coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-gpt.md"
  - "e2e/auth/password-session.spec.ts"
  - "e2e/experience/homepage-shell.spec.ts"
  - "tests/m3/ui/public-post-experience.test.tsx"
  - "tests/m3/runtime/post-public-queries.integration.test.ts"
  - "src/app/[locale]/(public)/berita/page.tsx"
  - "src/app/[locale]/(public)/berita/[slug]/page.tsx"
  - "src/components/public/post/**"
  - "src/contracts/post.ts"
  - "src/lib/content/post-public-queries.ts"
  - "src/lib/db/client.ts"
  - "src/lib/security/sanitize.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-CLAUDE-PUBLIC-POST-EXPERIENCE
contracts:
  - src/contracts/post.ts
  - src/lib/content/post-public-queries.ts
acceptance_commands:
  - npx playwright test e2e/m3/public-post-experience.spec.ts --project=chromium --project=mobile
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA.md TASK_BASE=origin/coordination/m3-deepseek-public-post-experience-qa-assignment npm run check:scope
risk: medium
token_class: M
status: ready
---

# M3 DeepSeek Public Post Experience QA

Independently test the merged FUSPI Berita public reference slice with executable PostgreSQL-backed
browser coverage. This is a QA lane, not a second implementation or design pass. Add only the one
leased Playwright spec plus the durable review and handoff. Do not edit product code, translations,
contracts, schema, dependencies, configuration, or existing tests.

## Fixture safety

1. Require an isolated non-production `DATABASE_URL`; skip with a precise reason when it is absent.
   Refuse hosts/databases that are not clearly local or test-scoped. Never use production/staging
   data and never print credentials or the connection string.
2. Create synthetic rows with a unique process/time marker and reserved `example.invalid` identity.
   Use PostgreSQL/Prisma only from the test process. Clean every created Post translation, Post,
   Media, Category, Tag, and User in `afterAll`, including after assertion failure.
3. Seed only the minimum deterministic data needed: published ID/EN/AR Berita, ID-only fallback,
   draft, future, archived, wrong-type, pagination rows, same-origin cover metadata, long content,
   and stored hostile HTML. Do not modify migrations or shared seed files.

## Required executable coverage

1. Prove populated list and detail routes render only `PUBLISHED` BERITA with
   `publishedAt <= now`; draft, future, archived, wrong-type, and unknown slugs remain
   indistinguishable from public not-found behavior.
2. Prove exact ID/EN/AR translation and deterministic ID fallback. On an Arabic route, fallback
   title, excerpt, breadcrumb, caption, and article content must expose `lang=id` and `dir=ltr`,
   while the surrounding document remains Arabic RTL and the fallback notice is visible once.
3. Prove server pagination at 10 items and safe normalization of missing, repeated, zero, negative,
   fractional, excessive, and hostile `page` values without reflecting hostile input or leaking a
   technical error.
4. Prove current detail is excluded from the latest-Berita sidebar, publication date remains
   Jakarta/locale aware, and no fabricated view count, tags, previous/next ranking, or archive total
   appears.
5. Prove stored hostile HTML cannot execute or survive as script/event-handler/javascript URL;
   assert the rendered article keeps expected safe headings, lists, links, blockquote, table/code,
   images, and long-word containment.
6. Prove canonical, ID/EN/AR hreflang plus `x-default`, Open Graph article metadata, and escaped
   `NewsArticle`/`BreadcrumbList` JSON-LD on a real detail response. Assert raw article HTML,
   storage keys, database details, and fixture identity are absent from metadata/JSON-LD.
7. Run axe WCAG A/AA checks on populated ID and AR list/detail pages. Verify keyboard-visible links,
   exactly one main landmark and H1, and no horizontal overflow at 360, 390, 768, 1024, and 1440 px
   in both LTR and RTL paths.
8. Use resilient role/label/URL assertions. Do not encode cosmetic pixel snapshots, arbitrary
   animation timing, implementation-private class names, or duplicate the 55 unit assertions.

## Findings and verdict

Write `coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-deepseek.md` with reviewed SHAs,
commands, evidence, and exact reproduction for every finding. `REQUEST_CHANGES` is reserved for a
reproducible functional, privacy, accessibility, localization, responsive, or metadata acceptance
defect. Record Low/cosmetic observations once as follow-ups; do not reopen a review loop for them.
If a product defect is found, do not fix it in this lane.

Commit the spec, review, and handoff, push the task branch, and stop. Do not merge or start the
admin transport/editor phase.
