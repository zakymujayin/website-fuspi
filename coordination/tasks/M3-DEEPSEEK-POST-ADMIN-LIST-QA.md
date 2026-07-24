---
id: M3-DEEPSEEK-POST-ADMIN-LIST-QA
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: cb78a3f
allowed_paths:
  - "e2e/m3/admin-post-list-browse.spec.ts"
  - "coordination/reviews/M3-CLAUDE-POST-ADMIN-LIST-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-ADMIN-LIST-QA-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "src/app/[locale]/admin/posts/**"
  - "src/components/admin/posts/**"
  - "src/contracts/post-admin.ts"
  - "src/lib/content/post-admin-transport.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-ADMIN-LIST
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - "npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile"
  - git diff --check
risk: medium
token_class: M
status: ready
---

# M3 DeepSeek Post Admin List QA

Independent PostgreSQL-backed browser QA of the read-only Post admin list
(`M3-CLAUDE-POST-ADMIN-LIST`, merged at `c93c5ae`). Mirror the Media Library QA harness frozen in
`e2e/m3/admin-media-library-browse.spec.ts`: per-project fixture identity, a PostgreSQL advisory
lock so ADMIN global counts stay correct across projects, and cleanup in `afterAll`/`finally`.

## Required coverage

1. Session/redirect: unauthenticated and expired-session both redirect to the locale login; ADMIN
   and EDITOR reach the page with no role/email/token leak.
2. Ownership: ADMIN sees all Berita; EDITOR-A sees only rows they both authored and own, never
   EDITOR-B titles; EDITOR pagination total is ownership-scoped.
3. Status filter: ALL/DRAFT/PUBLISHED/ARCHIVED tabs, `aria-current` on the active tab, reset to
   page 1. Note the frozen contract: a future-dated PUBLISHED row shows the SCHEDULED badge but is
   still returned by the PUBLISHED filter — assert accordingly.
4. Publication-state badge: DRAFT, PUBLISHED, SCHEDULED, and ARCHIVED are each proven with distinct
   text, not colour alone.
5. Hostile/repeated/unknown/excessive query params collapse to canonical page-1/ALL and never leak
   hidden posts to an EDITOR.
6. Display fields: title, featured flag, available locales (ID/EN/AR), category with a safe
   "uncategorized" fallback, author with a safe unknown-author fallback, and Asia/Jakarta time.
7. Locale ID/EN/AR with genuine Arabic copy, `dir="rtl"`, RTL chevron mirroring, no physical
   direction utilities.
8. axe WCAG 2.0/2.1/2.2 A/AA on populated ID and AR pages for ADMIN and EDITOR; one main landmark
   and one h1; keyboard focus order accounts for the skip link and verifies a visible focus ring.
9. Viewport: no horizontal overflow at 360/390/768/1024/1440.
10. No PII/token/technical-error disclosure in the DOM; empty state is not `role="alert"`.

## Constraints

- Enforce an isolated test/qa/e2e/audit database; refuse production/staging.
- Do not APPROVE if any required command is blocked, skipped, interrupted, or failing. Record actual
  counts from the mandated combined chromium+mobile run.
- Change only the three leased QA files. No product, contract, schema, dependency, or config change.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). The named reviewer/tester cannot
run; the stand-in authored both the UI under test and this QA, so any approval carries the standing
independence caveat and must be re-verified on their return.
