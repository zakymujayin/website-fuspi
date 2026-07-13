---
id: M1-CLAUDE-HOMEPAGE-SHELL
milestone: M1
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 2da38f7
allowed_paths:
  - "src/app/[locale]/page.tsx"
  - "src/app/[locale]/(public)/page.tsx"
  - "e2e/experience/homepage-shell.spec.ts"
  - "coordination/handoffs/M1-CLAUDE-HOMEPAGE-SHELL-claude.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/proxy.ts"
  - "src/app/globals.css"
  - "src/components/**"
  - "messages/**"
readonly_paths:
  - "src/app/[locale]/(public)/layout.tsx"
  - "src/components/public/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "messages/**"
depends_on:
  - M1-CLAUDE-EXPERIENCE
contracts:
  - docs/03-design-system.md
  - docs/05-halaman-publik.md
  - docs/12-multibahasa-rtl.md
  - docs/17-komponen-ui-detail.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:e2e
  - npm run build
risk: low
token_class: S
status: ready
---

# M1 Claude Homepage Shell Integration

Close the homepage route contract request from the original Claude handoff without implementing the M4 editable homepage:

1. Move the existing locale homepage from `src/app/[locale]/page.tsx` to the `(public)` route group so `/id`, `/en`, and `/ar` render inside the shared public header/footer/skip-link shell.
2. Remove the nested `<main>` landmark from the page because the public layout owns the single page `<main>`.
3. Preserve the current M0 foundation copy/status and all existing locale behavior so this remains a routing/shell task, not a homepage redesign.
4. Add focused Playwright coverage proving one main landmark, public header/footer, skip-link target, ID/EN/AR direction, no FUDA identity, and no horizontal overflow at representative mobile/desktop widths.

Do not modify messages, global styles, shared components, schema, dependencies, proxy, contracts, or security code. Commit the implementation and required handoff; do not merge it.
