---
id: M2-GPT-AUTH-BRIDGE
milestone: M2
owner: gpt
reviewer: deepseek
tester: gpt
base_sha: ff1cdad
allowed_paths:
  - "src/contracts/auth.ts"
  - "src/app/api/auth/credentials/route.ts"
  - "src/app/api/auth/password/route.ts"
  - "src/lib/auth/runtime/credentials.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/redirect.ts"
  - "tests/platform/auth-bridge/**"
  - "coordination/handoffs/M2-GPT-AUTH-BRIDGE-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/proxy.ts"
  - "src/app/[locale]/**"
  - "src/components/**"
  - "messages/**"
readonly_paths:
  - "src/app/api/auth/[...nextauth]/route.ts"
  - "src/lib/auth/runtime/password.ts"
  - "src/lib/auth/runtime/session.ts"
  - "src/lib/auth/runtime/cookie.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/i18n/**"
  - "coordination/handoffs/M2-CLAUDE-AUTH-LOGIN-UI-claude.md"
depends_on:
  - M2-GPT-AUTH-RUNTIME
  - M2-DEEPSEEK-AUTH-RUNTIME-REVIEW
  - M2-CLAUDE-AUTH-LOGIN-UI
contracts:
  - docs/06-autentikasi-role.md
  - docs/12-i18n-rtl-aksesibilitas-seo.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-AUTH-BRIDGE.md TASK_BASE=origin/coordination/m2-gpt-auth-bridge-assignment npm run check:scope
risk: critical
token_class: M
status: assigned
---

# M2 GPT Auth Bridge

Close the narrow server boundary required by the already-merged login UI. Implement the
password-change HTTP endpoint, request-session reader, and locale-safe redirect contract.
Do not build UI, an admin shell, proxy authorization, unrelated M2 capabilities, or M3.

## Required framework inspection

Before framework changes, read the installed Next.js 16 guides for route handlers, cookies,
redirecting, and authentication under `node_modules/next/dist/docs/`. Inspect the installed
Auth.js cookie contract rather than relying on older examples.

## Required implementation

1. Add strict public result schemas for password change and route-session decisions. Never
   expose a token, user identifier, email, role, raw validation issue, or technical error.
2. Add a locale-aware redirect normalizer for `id`, `en`, and `ar`. It must validate an
   internal path before use, replace a leading supported locale with the active locale,
   prefix locale-less admin destinations, reject protocol-relative/backslash/control-value
   tricks, and default to `/{locale}/admin`.
3. Extend the credentials boundary with a strictly validated locale hint. The server—not the
   client—normalizes the final safe destination. Preserve the generic login failure shapes.
4. Add a server-only request-session reader using the opaque Auth.js database cookie and the
   existing database revalidation primitive. Return only the frozen session-invalid result
   or active server session. Provide a pure route-decision helper: invalid sessions go to the
   localized login route; `mustChangePassword` sessions go to the localized password route;
   valid sessions may continue.
5. Add `POST /api/auth/password`. Require same-origin CSRF validation, JSON/form parsing,
   the opaque session cookie, and the existing transactional `changeOwnPassword` primitive.
   On success, all sessions are already revoked; return a validated localized login
   destination carrying only an optional validated safe `next` path. Clear the session
   cookie. Map failures deterministically without leaking policy internals or account state.
6. Add unit and MariaDB integration coverage for locale normalization, hostile redirects,
   cookie-name variants, invalid/expired/revoked sessions, forced-password route decisions,
   password endpoint CSRF, public response sanitization, successful revocation, and safe
   post-change destination.

## Exit and next handoff

Commit implementation plus `coordination/handoffs/M2-GPT-AUTH-BRIDGE-gpt.md`, push the GPT
task branch, and stop for integration. After this merges, the coordinator may issue Claude
the non-overlapping password/session UI task while GPT proceeds to the separate shared
security-capabilities contract. Do not start M3.
