---
id: M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: deepseek-v4-pro
base_sha: 0eee728
allowed_paths:
  - "coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-gpt.md"
  - "coordination/handoffs/M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
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
  - "src/app/[locale]/admin/media/**"
  - "src/components/admin/media/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "src/contracts/media.ts"
  - "src/contracts/media-admin.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/lib/db/client.ts"
  - "src/app/globals.css"
depends_on:
  - M3-CLAUDE-MEDIA-LIBRARY-BROWSE
contracts:
  - src/contracts/media.ts
  - src/contracts/media-admin.ts
  - src/lib/content/media-admin-transport.ts
acceptance_commands:
  - npx vitest run tests/m3/ui/admin-media-library-browse.test.tsx
  - npm run lint
  - npm run typecheck
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-LIBRARY-BROWSE-REVIEW.md TASK_BASE=origin/coordination/m3-gpt-media-library-browse-review-assignment npm run check:scope
risk: medium
token_class: M
status: assigned
---

# M3 GPT Media Library Browse Review

Perform one bounded, read-only review of Claude candidate `0eee728` (implementation `9a36cd9`).
Do not edit source, tests, messages, dependencies, schema, contracts, routes, task status, ownership,
or milestone state. Record only the durable review and handoff files granted above.

Review the candidate against its manifest, frozen Media contracts/runtime, the FUSPI design system,
ID/EN/AR behavior, logical RTL utilities, WCAG AA, current Web Interface Guidelines, and Next.js 16
Server Component conventions. Verify especially:

1. Session/locale authorization occurs before the Media load and UI never broadens EDITOR scope.
2. Unknown, repeated, malformed, and excessive query parameters collapse to the canonical bounded
   default without reflecting input or bypassing the strict Media list contract.
3. Missing/invalid environment or database initialization failures render translated non-technical
   unavailable state rather than throwing from the route boundary.
4. Only frozen `AdminMediaListResult` fields reach presentation; no PII, storage keys, exceptions,
   session details, or internal codes leak into UI/RSC output.
5. Thumbnail resolution is same-origin/local and fails closed; PDF and invalid image cases have
   intentional accessible placeholders.
6. Grid/filter/pagination semantics, focus, touch targets, long text, heading hierarchy, loading,
   empty/error states, contrast, reduced motion, Arabic RTL, and responsive behavior satisfy the
   manifest and referenced design documents.
7. ID/EN/AR copy is natural, FUSPI-only, user-facing rather than implementation-facing, and all
   dates/numbers use locale-aware `Intl` formatting in `Asia/Jakarta`.
8. Tests assert the real boundary behavior instead of encoding a weaker interpretation of the
   manifest. Report any acceptance-command/environment artifact separately from product defects.

Use severity Critical/High/Medium/Low. Verdict is `APPROVE` only if no Critical/High/Medium defect
remains; otherwise `CHANGES_REQUESTED`. Give exact file:line evidence and a bounded correction for
each blocking item. Finish with a committed handoff and stop; do not fix the candidate or merge.
