---
id: M2-GPT-PASSWORD-SESSION-UI
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 157bbcb
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
  - "coordination/handoffs/M2-GPT-PASSWORD-SESSION-UI-gpt.md"
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
  - M2-DEEPSEEK-AUTH-BRIDGE-REVIEW
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
  - TASK_MANIFEST=coordination/tasks/M2-GPT-PASSWORD-SESSION-UI.md TASK_BASE=origin/coordination/m2-gpt-password-session-ui-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M2 GPT Password and Session UI Takeover

The project owner directed GPT to continue M2 alone. This task supersedes
`M2-CLAUDE-PASSWORD-SESSION-UI` without modifying Claude's branch or worktree. Implement
the same frozen UI scope against the merged and independently reviewed auth bridge.

## Required implementation

1. Add localized `/{locale}/change-password` with server-side database-session
   revalidation and the smallest accessible client form.
2. Send locale and untrusted `next` to the frozen password API, validate its public Zod
   response, and navigate only to the server-returned destination.
3. Handle wrong password, policy, invalid session, service unavailable, duplicate submit,
   success navigation, password visibility, focus recovery, and safe generic messaging.
4. Add the smallest protected `/{locale}/admin` Server Component landing page. Revalidate
   the session at the page boundary; never expose actor identity or role.
5. Update login requests to send the active locale. Show a generic session-expired notice
   only when server revalidation establishes an invalid cookie; never trust a raw reason.
6. Preserve ID/EN/AR, Arabic RTL, LTR password fields, logical direction utilities,
   keyboard order, visible focus, reduced motion, and 360px no-overflow.
7. Add focused Playwright tests for password success/failure, safe destination handling,
   hostile response refusal, forced-password routing, invalid-session messaging, protected
   admin, duplicate submit, focus, locale/RTL/keyboard, leakage, and mobile layout.

No security/runtime/schema/dependency/global-style decision may change in this task.
