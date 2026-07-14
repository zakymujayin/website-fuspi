---
id: M2-CLAUDE-PASSWORD-SESSION-UI
milestone: M2
owner: claude
reviewer: gpt
tester: claude
base_sha: 02cabd1
allowed_paths:
  - "src/app/[locale]/(auth)/**"
  - "src/app/[locale]/admin/**"
  - "src/components/auth/**"
  - "src/components/ui/field.tsx"
  - "src/components/ui/label.tsx"
  - "src/components/ui/separator.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "e2e/auth/password-session.spec.ts"
  - "coordination/handoffs/M2-CLAUDE-PASSWORD-SESSION-UI-claude.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/auth.ts"
  - "src/app/api/**"
  - "src/lib/**"
  - "src/contracts/**"
  - "src/proxy.ts"
  - "src/config/**"
  - "src/app/globals.css"
readonly_paths:
  - "src/contracts/auth.ts"
  - "src/app/api/auth/credentials/route.ts"
  - "src/app/api/auth/password/route.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/redirect.ts"
  - "src/config/institution.ts"
  - "src/i18n/**"
  - "coordination/handoffs/M2-GPT-AUTH-BRIDGE-gpt.md"
depends_on:
  - M2-GPT-AUTH-BRIDGE
contracts:
  - docs/03-design-system.md
  - docs/06-autentikasi-role.md
  - docs/12-multibahasa-rtl.md
  - docs/17-komponen-ui-detail.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npx playwright test e2e/auth/login.spec.ts e2e/auth/password-session.spec.ts --workers=1
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-CLAUDE-PASSWORD-SESSION-UI.md TASK_BASE=origin/coordination/m2-claude-password-session-ui-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M2 Claude Password and Session UI

Implement the localized password-change flow and the smallest protected admin landing page
against the merged GPT bridge. This is a focused UI task, not the full admin shell. Do not
change security decisions, runtime, contracts, proxy, dependencies, global tokens, or M3.

## Required preparation

1. Read the Next.js 16 local guides for async `params`/`searchParams`, cookies, redirecting,
   authentication checks near the page/data boundary, and Server/Client Components.
2. Run `npx shadcn@latest info`. You may canonicalize the leased `Field` dependencies through
   leased `label.tsx` and `separator.tsx` only if shadcn does not request dependency, lockfile,
   config, or global CSS changes.
3. Read only this manifest, its listed feature documents, the frozen public schemas, and the
   GPT handoff.

## Required implementation

1. Add `/{locale}/change-password` as a Server Component page plus the smallest Client form.
   Revalidate the opaque database session on the server. Invalid sessions redirect to the
   localized login route; active sessions may view the form, including those forced to change.
2. Post current/new/confirmation values to `/api/auth/password`, passing `locale` and the raw
   untrusted `next` value as `redirectTo`. Parse the response with the frozen Zod result and
   navigate only to the server-returned destination.
3. Provide accessible localized handling for generic wrong-current-password, password policy,
   invalid session, unavailable service, loading, success navigation, visibility controls,
   focus recovery, and duplicate submission. Never expose which policy rule failed, account
   state, token, ID, role, email, host, stack, or raw error.
4. Update the existing login request to send its active locale explicitly. Preserve all
   existing transient in-memory locale-switch behavior and never move credentials to URL,
   storage, cookie, log, analytics, or RSC payload.
5. Add the smallest `/{locale}/admin` Server Component landing page needed to close the current
   404. Call the server session reader and protected-route decision at the page boundary; use
   `redirect()` outside catch blocks. Do not render actor identifiers/role or treat the page as
   authorization for future loaders/actions.
6. On the login page, an invalid cookie may trigger a generic localized “sign in again” notice
   only after server revalidation. Do not trust or render a raw `reason` query parameter. An
   absent cookie must not falsely claim that a session expired.
7. Preserve ID/EN/AR, Arabic RTL with LTR password values, logical direction utilities,
   keyboard order, programmatic labels, visible focus, 360px no-overflow, and reduced motion.
   Arabic copy remains explicitly draft pending native review.
8. Add focused Playwright coverage for successful/failed password mutation via interception,
   safe server destination use, hostile response refusal, forced-password route, invalid
   session redirect/notice, active admin landing, duplicate submit, focus, ID/EN/AR, RTL,
   keyboard, no credential leakage, and 360px layout. Keep the existing 46 login cases green.

Commit implementation and handoff, push the Claude branch, and stop. Do not merge or start
another task.
