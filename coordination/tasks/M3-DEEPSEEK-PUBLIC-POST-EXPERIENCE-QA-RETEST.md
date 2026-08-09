---
id: M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST
milestone: M3
owner: deepseek-v4-pro
reviewer: gpt
tester: deepseek-v4-pro
base_sha: babf9f1
allowed_paths:
  - "e2e/m3/public-post-experience.spec.ts"
  - "coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST-deepseek.md"
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
  - "coordination/tasks/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA.md"
  - "coordination/handoffs/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-deepseek.md"
  - "coordination/tasks/M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION.md"
  - "coordination/handoffs/M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION-claude.md"
  - "coordination/reviews/M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION-gpt.md"
  - "src/components/public/post/post-sidebar-latest.tsx"
  - "tests/m3/ui/public-post-experience.test.tsx"
  - "src/contracts/post.ts"
  - "src/lib/content/post-public-queries.ts"
  - "src/lib/db/client.ts"
  - "src/lib/security/sanitize.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA
  - M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION
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
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST.md TASK_BASE=origin/coordination/m3-deepseek-public-post-experience-qa-retest-assignment npm run check:scope
risk: medium
token_class: S
status: merged
---

# M3 DeepSeek Public Post Experience QA Retest

Rerun the corrected PostgreSQL-backed public Berita browser QA against the integration candidate
that contains both the accepted Claude contrast fix and the previously corrected DeepSeek test
harness. This is a final verification pass, not a product implementation task or a broad new QA
design cycle.

## Frozen candidate

The assignment branch contains:

- corrected integration head `529f4a7`, including Claude candidate `b1e7a4d` where the sidebar
  latest-post `<time>` uses `text-slate-500` with approximately `4.76:1` contrast on white;
- the corrected DeepSeek QA harness from actual branch head `483352b`, staged by integrator merge
  `babf9f1` without placing its prior `REQUEST_CHANGES` result directly on integration.

Do not rebase onto another branch, merge another candidate, cherry-pick product code, or edit any
read-only path. Start exactly from the assignment branch named in the scope command.

## Required verification

1. Preserve the isolated local/test-scoped PostgreSQL guard and per-run fixture cleanup. Never use
   or print production/staging data, credentials, or a connection string.
2. Run the exact combined Playwright command for both `chromium` and `mobile`. The command must
   finish with zero failures. Do not dismiss a failing assertion, quarantine a test, add a retry,
   weaken selectors, exclude the sidebar/header/footer further, or remove an axe rule merely to
   obtain green output.
3. Confirm the former sidebar `<time>` color-contrast violation is absent on populated detail
   pages. Record per-project totals and the final combined total.
4. The existing E2E spec should remain unchanged unless the frozen candidate exposes a
   reproducible harness defect. Any spec edit must stay within the original acceptance criteria
   and be explained exactly in the review and handoff.
5. Run every remaining command in `acceptance_commands`. A database-gated integration suite may
   be reported as skipped only when its own safe environment contract requires that result; the
   PostgreSQL-backed Playwright command itself must not be skipped.

## Durable verdict and provenance

Append a clearly dated final-retest section to
`coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-deepseek.md`. Record assignment SHA,
candidate SHAs, commands, per-project evidence, and a verdict. Use `APPROVE` only if the combined
browser run and all non-gated acceptance commands pass with zero failures.

Create `coordination/handoffs/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST-deepseek.md` with the
new task ID, branch, assignment/base SHA, implementation commit SHA, final branch head, exact
files changed, results, remaining risk, and confirmation that no product path changed. Use actual
reachable commits: the prior QA branch head is `483352b`; do not present dangling intermediate
objects such as `b1c0916` or `8e2dd39` as that branch's final head.

Commit and push branch `ai/deepseek/m3-public-post-experience-qa-retest`, then stop. Do not merge
to `integration/*` or `main`, edit task status/leases, or start the admin transport/editor phase.
