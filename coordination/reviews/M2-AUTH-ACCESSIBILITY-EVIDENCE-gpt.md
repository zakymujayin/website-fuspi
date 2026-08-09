# M2 Auth Accessibility Evidence

Review date: 2026-07-15 (Asia/Jakarta)

Scope: login ID/EN/AR, password change, protected admin landing, session failure, keyboard flow,
focus, live regions, RTL, mobile layout, and reduced browser viewport behavior.

## Automated evidence

- Added pinned `@axe-core/playwright@4.12.1`.
- Axe runs WCAG 2 A/AA, WCAG 2.1 AA, and WCAG 2.2 AA tags on login in ID, EN, and AR.
- Axe also scans the authenticated admin landing and password-change surface.
- Targeted Chromium result: **40 passed**, including five surfaces with zero axe violations.
- The complete Playwright suite retains desktop Chromium and Pixel 7 coverage.
- Existing tests verify keyboard order, error-focus transfer, skip-link behavior, focus restoration,
  aria-live announcements, LTR credential values inside Arabic RTL, 360 px overflow, generic
  errors, and credentials absent from URL/storage/cookies/scripts/visible copy.

## Web Interface Guidelines review

`src/app/[locale]/(auth)/layout.tsx:60` - fixed: the programmatically focusable skip-link target
removed its outline without a visible replacement. It now uses a focus-visible primary inset ring.

`src/components/auth/login-form.tsx` - pass: labeled/autocomplete inputs, bounded async state,
live status/error regions, focusable error, keyboard-safe submit behavior, and no paste blocking.

`src/components/auth/password-change-form.tsx` - pass: labeled password fields, generic inline
errors, focus transfer, loading announcement, and one-request guard.

`src/components/auth/password-field.tsx` - pass: named input, accessible icon-only toggle,
aria-pressed/controls, decorative icon hiding, and correct tab order.

## Assistive-technology boundary

The development gate is covered by semantic DOM assertions, axe, keyboard/focus tests, and live
region behavior. A human NVDA/VoiceOver listening session cannot be manufactured by CLI and
remains a staging/go-live sign-off item. It does not block starting M3 feature development; every
new M3 template must add its own axe and keyboard evidence.
