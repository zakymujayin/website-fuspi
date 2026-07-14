# M2 — GPT Integrator Review of Claude Auth Login UI

## Metadata

- Reviewed branch: `ai/claude/m2-auth-login-ui`
- Reviewed head: `8952b53`
- Implementation: `ac44363`
- Verdict: **REQUEST_CHANGES**
- Correction policy: one correction pass, then final gate and merge

## Blocking finding

### High — locale switching destroys credentials and safe destination

The UX contract requires the language switcher to retain already typed form contents.
An independent Chromium run against `/id/login?next=/id/admin/berita` filled both fields,
selected Arabic, and observed:

```json
{"url":"/ar/login","email":"","password":""}
```

The `next` query was also removed. The auth layout currently reuses the public
`LanguageSwitcher`, which preserves only `usePathname()` and has no auth-form state bridge.
This is a real user-facing failure: changing language forces users to retype credentials and
silently discards their post-login destination.

Implement an auth-owned switcher with single-use, transient in-memory transfer. Credential
values must never enter URL/history state, storage, cookies, logs, analytics, or server
payloads. Add regression coverage for preservation and cleanup.

## Required small corrections

- `src/components/auth/login-form.tsx`: email should disable spellcheck.
- `src/components/auth/password-field.tsx`: icons inside `Button` require `data-icon`.
- The focused error region currently removes its outline without a replacement; provide a
  visible focus treatment.
- The handoff says 12 changed files; the scope checker reports 13.

## Non-blocking follow-ups

- Locale-normalizing a validated stored redirect belongs to the next GPT-owned auth bridge
  contract; Claude must continue navigating only to the server-returned safe destination.
- The shadcn `label`/`separator` canonicalization and automated axe dependency can be handled
  by the next form-platform task.
- Arabic copy requires native review before production release. It may remain explicitly
  marked draft on the development integration branch so this task does not loop.

All original acceptance commands passed: lint, typecheck, 133 unit tests, build, 38/38
Playwright cases, diff check, and scope check. No other functional or security blocker was
found in this review.
