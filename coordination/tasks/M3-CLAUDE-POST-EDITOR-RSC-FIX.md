---
id: M3-CLAUDE-POST-EDITOR-RSC-FIX
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 08ccaa1
allowed_paths:
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-labels.ts"
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-EDITOR-RSC-FIX-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "e2e/m3/admin-post-editor.spec.ts"
  - "src/components/admin/posts/post-editor-payload.ts"
  - "src/components/admin/posts/post-editor-errors.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: high
token_class: M
status: ready
---

# M3 Claude Post editor RSC boundary fix

## The defect (confirmed at runtime, browser-loaded)

`/admin/posts/new` and `/admin/posts/[postId]/edit` **crash to the error boundary on every load**:

```text
Error: Functions cannot be passed directly to Client Components unless you explicitly
expose it by marking it with "use server".
```

`buildPostEditorLabels(t)` returns an object whose members are **functions** (`localeLegend`,
`byLabel`, `errorFor`, `editLabelFor`, …). The server components `new/page.tsx` and `edit/page.tsx`
pass that object as the `labels` prop into `PostEditorForm`, which is a Client Component. React
cannot serialize functions across the server/client boundary, so the page renders
"This page couldn't load".

Found by `M3-DEEPSEEK-POST-EDITOR-QA`: all 8 of its cases fail because the form never renders. The
existing unit tests missed it because they render `PostEditorForm` directly in jsdom with no RSC
boundary, and the original "runtime verification" was API-level only — it never loaded the page in a
browser.

## Required fix

`PostEditorForm` is already `"use client"`. Make it resolve its own strings with next-intl's client
`useTranslations("AdminPostEditor")` instead of receiving a `labels` object of functions:

- drop the `labels`-of-functions prop; keep only serializable props (`mode`, `listHref`, `postId`,
  `expectedVersion`, `carried`, `initialDraft`);
- inside the form, call `useTranslations` and interpolate `localeLegend`, `errorFor`, etc. locally;
- `new/page.tsx` and `edit/page.tsx` stop calling `buildPostEditorLabels` and stop passing `labels`.
  Delete `post-editor-labels.ts` if nothing else imports it (the list uses its own labels; verify).
- The `AdminPostList` (list) is a **Server Component**, so its function labels are fine — do not
  touch its plumbing.

Do not change the messages, the payload/error modules, the API, or the E2E spec.

## Mandatory verification — the step that was skipped last time

Unit + typecheck + build are **not** sufficient; they already passed while the page was broken. You
MUST load both routes in a real browser against PostgreSQL and confirm the form renders:

1. Boot the dev app, create an EDITOR session row, navigate a real browser (Playwright or the probe
   pattern) to `/id/admin/posts/new` and `/ar/admin/posts/new`, and assert `h1` is "Tulis Berita" /
   "كتابة خبر" (NOT "This page couldn't load") and that `getByLabel("Judul")` / the Arabic title
   field resolves to exactly one input.
2. Then run the pending QA spec end to end to confirm it now passes:
   `PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile`
   (that spec sets the auth cookie domain to `localhost`, so the browser must navigate to
   `localhost`, not `127.0.0.1`).

Paste the browser-render evidence and the spec result in the handoff.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). This corrects a defect the
stand-in itself shipped and its own review missed; it must be re-reviewed by Codex, and the
browser-render check above is non-negotiable.
