---
id: M3-DEEPSEEK-ADMIN-E2E-HOST-CONSISTENCY
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: cf0f27b
allowed_paths:
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "e2e/m3/admin-post-list-browse.spec.ts"
  - "coordination/handoffs/M3-DEEPSEEK-ADMIN-E2E-HOST-CONSISTENCY-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "playwright.config.ts"
readonly_paths:
  - "AGENTS.md"
  - "e2e/m3/admin-post-editor.spec.ts"
acceptance_commands:
  - npx tsc --noEmit
  - npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --workers=1
  - npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --workers=1
risk: low
token_class: S
status: ready
---

# M3 DeepSeek admin E2E host consistency

Make the whole `e2e/m3` admin suite runnable at one host. `admin-post-editor.spec.ts` was already
made host-agnostic (`url: BASE_URL`) and **must** run at `localhost:3004` because its mutations hit
the CSRF same-origin check against `AUTH_URL=http://localhost:3004`. But the two browse specs still
hardcode `domain: "127.0.0.1"`, so a `localhost` cookie is never sent to them there and every admin
route redirects to login — the whole directory cannot pass at a single host.

## Fix

In both `admin-media-library-browse.spec.ts` and `admin-post-list-browse.spec.ts`, replace the
hardcoded-domain cookie with the same host-agnostic form the editor spec uses:

```ts
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
function sessionCookie(token: string) {
  return { name: "authjs.session-token", value: token, url: BASE_URL };
}
```

Both specs are read-only (no mutating POSTs), so they carry no CSRF-origin constraint; the cookie
just has to reach whatever host the run uses. After the fix the whole admin suite runs green at
`PLAYWRIGHT_BASE_URL=http://localhost:3004`.

## Verification

- `npx tsc --noEmit` — 0 errors.
- Each browse spec at `PLAYWRIGHT_BASE_URL=http://localhost:3004 ... --project=chromium --workers=1`
  passes (they previously could not run at `localhost`).

## Stand-in note

Authored by the Claude stand-in for DeepSeek during the 2026-07-23…07-29 window (ADR-0002). No
independent review yet. Follow-up: `playwright.config.ts`'s `127.0.0.1` default baseURL is
inconsistent with `AUTH_URL=localhost` — GPT root-config lane should reconcile so the suite passes on
the default without a `PLAYWRIGHT_BASE_URL` override.
