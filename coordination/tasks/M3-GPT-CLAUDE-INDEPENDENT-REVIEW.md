---
id: M3-GPT-CLAUDE-INDEPENDENT-REVIEW
milestone: M3
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: a8435af
allowed_paths:
  - "coordination/reviews/M3-CLAUDE-INDEPENDENT-REVIEW-gpt.md"
  - "coordination/handoffs/M3-GPT-CLAUDE-INDEPENDENT-REVIEW-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "messages/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/05-halaman-publik.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md"
  - "coordination/reviews/M3-EXIT-GATE-EVIDENCE-MAP.md"
  - "coordination/tasks/M3-CLAUDE-*.md"
  - "coordination/handoffs/M3-CLAUDE-*.md"
  - "src/app/[locale]/(public)/berita/**"
  - "src/app/[locale]/admin/media/**"
  - "src/app/[locale]/admin/posts/**"
  - "src/components/admin/media/**"
  - "src/components/admin/posts/**"
  - "src/components/public/post/**"
  - "src/components/ui/alert-dialog.tsx"
  - "src/components/ui/checkbox.tsx"
  - "src/components/ui/textarea.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/**"
  - "e2e/m3/**"
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - npx playwright test e2e/m3/public-post-experience.spec.ts --project=chromium --project=mobile --workers=1
  - npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile --workers=1
  - npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile --workers=1
  - npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile --workers=1
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-CLAUDE-INDEPENDENT-REVIEW.md TASK_BASE=origin/coordination/m3-gpt-claude-independent-review-assignment npm run check:scope
risk: high
token_class: L
status: assigned
---

# M3 GPT independent review of Claude stand-in work

Independently review every Claude-authored M3 public/admin Post and Media change merged during the
temporary integrator stand-in window. This task is read-only with respect to product source, tests,
messages, configuration, contracts, and schema.

## Required review

1. Reconstruct every Claude implementation commit and compare its changed paths to the immutable
   task manifest. Record missing manifests, out-of-lease changes, and self-review gaps.
2. Review the public Post experience, Media Library/upload, Post list/editor/navigation,
   publication/delete/cover, Tiptap, autosave, and lint correction for contract fidelity,
   authorization-boundary assumptions, locale fallback, ID/EN/AR, RTL, accessibility, responsive
   behavior, safe error handling, and optimistic-version correctness.
3. Re-run the static, unit, PostgreSQL, build, and four M3 browser suites on the consolidated
   integration head. A known failure may not be waived merely because GitHub CI omits Playwright.
4. Classify findings by severity with exact file/line and reproducible evidence. Do not fix findings
   in this review task.
5. Give one verdict: `APPROVED` only when no Critical/High finding, every mandatory acceptance
   command passes, and governance violations are reconciled; otherwise `CHANGES_REQUESTED`.

The M3 exit contract and M4 entry remain closed until a separate integrator closure task consumes an
approved review and the build-tracing task has been independently reviewed and merged.
