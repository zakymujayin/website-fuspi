---
id: M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek-v4-pro
base_sha: dac98f8
allowed_paths:
  - "src/components/public/post/post-sidebar-latest.tsx"
  - "tests/m3/ui/public-post-experience.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/**"
  - "src/components/ui/**"
  - "src/components/public/site-header.tsx"
  - "src/components/public/site-footer.tsx"
  - "src/components/public/nav-items.ts"
  - "src/components/public/post/cover-image.ts"
  - "src/components/public/post/format.ts"
  - "src/components/public/post/hreflang.ts"
  - "src/components/public/post/json-ld.ts"
  - "src/components/public/post/locale.ts"
  - "src/components/public/post/pagination.ts"
  - "src/components/public/post/post-article-body.tsx"
  - "src/components/public/post/post-breadcrumb.tsx"
  - "src/components/public/post/post-card-horizontal.tsx"
  - "src/components/public/post/post-cover-image.tsx"
  - "src/components/public/post/post-detail-skeleton.tsx"
  - "src/components/public/post/post-fallback-banner.tsx"
  - "src/components/public/post/post-json-ld.tsx"
  - "src/components/public/post/post-list-skeleton.tsx"
  - "src/components/public/post/post-meta-row.tsx"
  - "src/components/public/post/post-state-notice.tsx"
  - "src/components/public/post/sanitize.ts"
  - "src/components/public/post/site-origin.ts"
  - "messages/**"
  - "tests/m3/runtime/**"
  - "tests/security/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M3-CLAUDE-PUBLIC-POST-EXPERIENCE.md"
  - "coordination/tasks/M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA.md"
  - "coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md"
  - "coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-gpt.md"
  - "src/app/globals.css"
  - "src/components/public/post/post-meta-row.tsx"
depends_on:
  - M3-CLAUDE-PUBLIC-POST-EXPERIENCE
  - M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA
contracts: []
acceptance_commands:
  - npx vitest run tests/m3/ui/public-post-experience.test.tsx
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-CLAUDE-PUBLIC-POST-CONTRAST-CORRECTION.md TASK_BASE=origin/coordination/m3-claude-public-post-contrast-correction-assignment npm run check:scope
risk: low
token_class: S
status: merged
---

# M3 Claude Public Post Contrast Correction

Correct exactly one reproducible accessibility defect found by the independent DeepSeek browser
QA of the merged Berita public reference slice. This is a bounded UI correction, not a redesign or
a new review cycle.

## Evidence and defect

DeepSeek's corrected QA branch `origin/ai/deepseek/m3-public-post-experience-qa` at `483352b`
reports `REQUEST_CHANGES` for one WCAG 2.1 AA color-contrast failure:

- component: `src/components/public/post/post-sidebar-latest.tsx`;
- element: the latest-Berita sidebar `<time>` label;
- current utility: `text-slate-400`;
- measured foreground/background: `#90a1b9` on `#ffffff`;
- measured contrast: `2.63:1`;
- required contrast for this text: at least `4.5:1`.

All other public Berita acceptance areas passed. Do not reopen or restyle them.

## Required correction

1. Replace only the failing sidebar date color with an existing FUSPI semantic token or existing
   palette utility that provides at least `4.5:1` contrast on the component's white background.
   Prefer the installed semantic token when it satisfies the measured requirement. Do not edit
   `globals.css`, introduce a new token, add a dependency, or change typography/layout.
2. Preserve the existing `<time dateTime>`, locale behavior, RTL behavior, focus behavior, title
   wrapping, cover presentation, hover treatment, and sidebar structure.
3. Extend the focused UI test with a deterministic assertion that the sidebar date no longer uses
   the failing `text-slate-400` utility and uses the selected approved token/utility. Do not copy
   the DeepSeek Playwright spec into this branch and do not weaken or exclude axe rules.
4. Treat header/footer contrast as outside this correction. Do not make global or neighboring
   cosmetic changes.

## Verification and handoff

Run every command in `acceptance_commands`, commit the implementation and handoff, push branch
`ai/claude/m3-public-post-contrast-correction`, and stop. The handoff must record the task ID,
assignment/base SHA, implementation/head SHA, exact files changed, contrast decision, commands and
results, and any untested area. Do not merge to `integration/*` or `main`, edit task status/lease,
or start the DeepSeek re-test. GPT will review the correction; after integration, DeepSeek will
rerun the PostgreSQL-backed Chromium/mobile axe gate.
