---
id: M2-CLAUDE-AUTH-LOGIN-UI
milestone: M2
owner: claude
reviewer: gpt
tester: claude
base_sha: 8952b53
allowed_paths:
  - "src/app/[locale]/(auth)/**"
  - "src/components/auth/**"
  - "src/components/ui/card.tsx"
  - "src/components/ui/field.tsx"
  - "src/components/ui/input.tsx"
  - "src/components/ui/spinner.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "e2e/auth/login.spec.ts"
  - "coordination/handoffs/M2-CLAUDE-AUTH-LOGIN-UI-claude.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/auth.ts"
  - "src/app/api/**"
  - "src/lib/auth/**"
  - "src/lib/security/**"
  - "src/contracts/**"
  - "src/proxy.ts"
  - "src/config/**"
  - "src/app/[locale]/layout.tsx"
  - "src/app/[locale]/admin/**"
  - "src/app/globals.css"
  - "src/components/public/**"
readonly_paths:
  - "src/contracts/auth.ts"
  - "src/app/api/auth/credentials/route.ts"
  - "src/lib/auth/runtime/cookie.ts"
  - "src/config/institution.ts"
  - "src/i18n/**"
  - "coordination/reviews/M2-AUTH-UX-SPEC-claude.md"
  - "coordination/handoffs/M2-GPT-AUTH-RUNTIME-gpt.md"
depends_on:
  - M2-GPT-AUTH-RUNTIME
contracts:
  - docs/03-design-system.md
  - docs/06-autentikasi-role.md
  - docs/12-i18n-rtl-aksesibilitas-seo.md
  - docs/20-test-acceptance-go-live.md
  - coordination/reviews/M2-AUTH-UX-SPEC-claude.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npx playwright test e2e/auth/login.spec.ts
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-CLAUDE-AUTH-LOGIN-UI.md TASK_BASE=origin/coordination/m2-claude-auth-login-ui-correction-assignment npm run check:scope
risk: high
token_class: M
status: revision_required
---

# M2 Claude Auth Login UI

Implement the localized login UI against the already-frozen credentials endpoint. This is
a focused UI slice: do not implement password-change submission, session guards, admin
shell, proxy authorization, Auth.js behavior, security decisions, dependencies, or M3.

## Required framework and component inspection

Before changing code:

1. Read the relevant Next.js 16 guides under `node_modules/next/dist/docs/` for App Router
   pages/layouts, async `params`/`searchParams`, and client/server component boundaries.
2. Run `npx shadcn@latest info`. Use `npx shadcn@latest add` only for the specifically
   leased primitives. If it wants to modify dependencies, lockfiles, root config, or global
   CSS, stop and record a GPT dependency request instead.
3. Read only the contracts and UX specification listed in this manifest.

## Required implementation

1. Add `/${locale}/login` in a dedicated auth route group with one main landmark, a visible
   FUSPI identity, localized language switching that preserves the login path, and an
   accessible skip link. Do not copy FUDA identity or invent contact/domain data.
2. Use a Server Component page and the smallest necessary Client Component for form state.
   Inputs are email and password with programmatic labels, `username` and
   `current-password` autocomplete, and LTR value direction even in Arabic.
3. Submit JSON to `POST /api/auth/credentials`, passing an untrusted `next` query value only
   as `redirectTo`; never validate or trust it client-side. Parse the response through the
   frozen login result contract. Navigate only to the server-returned `redirectTo`.
4. For `INVALID_CREDENTIALS`, render the single generic localized error, move focus to its
   alert region, retain email, and clear only password. Do not highlight either field or
   vary behavior by account state.
5. For `TRY_AGAIN_LATER` and `AUTH_UNAVAILABLE`, render the exact UX-spec intent without
   exposing counters, timing, hostnames, account state, or technical errors. Loading has one
   polite announcement, disables duplicate submission, and does not add artificial delay.
6. Add an accessible show/hide password button with changing label and `aria-pressed`.
   Keyboard order, focus, disabled/loading state, contrast, 360px layout, and Arabic RTL
   must follow the reviewed UX specification and logical-direction utilities.
7. If login succeeds with `requiresPasswordChange: true`, navigate to the localized
   `/change-password` route while preserving the server-returned safe destination for the
   later GPT-owned bridge task. Do not implement or fake password mutation in this task.
8. Add focused Playwright coverage using network interception for all public result classes,
   exact generic-error equivalence, focus recovery, password clearing, duplicate-submit
   prevention, safe-destination use, ID/EN/AR, RTL/LTR form values, keyboard order, and no
   horizontal overflow. Never put real credentials or FUSPI staff PII in fixtures.

## Arabic copy gate

The reviewed UX document marks Arabic strings as intent pending native-speaker review.
Claude may add a clearly identified draft needed to exercise RTL in this task, but the
handoff must mark native review as a merge blocker. Do not claim the Arabic copy is approved.

Commit implementation and handoff, push the Claude branch, and stop. Do not merge, edit the
runtime, start password/session UI, or begin M3.

## Integrator correction gate

This is the only correction pass for this task. Read
`coordination/reviews/M2-CLAUDE-AUTH-LOGIN-UI-gpt.md` and fix the proven locale-switch state
loss without touching GPT runtime or shared public components.

Required corrections:

1. Replace the public-shell language switcher on the auth surface with an auth-owned
   implementation under `src/components/auth/**`.
2. Preserve the typed email, typed password, and raw `next` value across an ID/EN/AR locale
   switch using transient in-memory state only. Never put credentials in URL parameters,
   history state, cookies, web storage, logs, analytics, or RSC payloads.
3. Consume and clear the transient draft immediately after the destination login form
   initializes. Clear it on submit and when leaving the auth flow so credentials cannot be
   recovered later.
4. Add Playwright coverage proving both fields and `next` survive one locale switch, while
   no credential appears in the URL or page text. Also prove a fresh login navigation does
   not restore a prior draft.
5. Add `spellCheck={false}` to the email input, add `data-icon` to icons inside shadcn
   buttons, and give the programmatically focused alert a visible focus treatment.
6. Correct the handoff file count and record the correction SHA/results. Arabic copy remains
   a pre-release native-review requirement, but it does not block merging this development
   branch into `integration/m2-security`.
