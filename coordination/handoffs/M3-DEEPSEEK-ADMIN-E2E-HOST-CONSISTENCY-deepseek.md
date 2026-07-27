# Handoff — M3-DEEPSEEK-ADMIN-E2E-HOST-CONSISTENCY

- **Task:** M3-DEEPSEEK-ADMIN-E2E-HOST-CONSISTENCY
- **Branch:** `ai/deepseek/m3-admin-e2e-host-consistency`
- **Base SHA:** `d845c77` (integration with the manifest)
- **Head SHA:** `d54e1d7`
- **Author:** Claude standing in for DeepSeek (ADR-0002 window). No independent review yet.

## Summary

Made the whole `e2e/m3` admin suite runnable at a single host. `admin-post-editor.spec.ts` must run
at `localhost:3004` (its mutations hit `isSameOriginRequest` against `AUTH_URL=http://localhost:3004`),
but `admin-media-library-browse.spec.ts` and `admin-post-list-browse.spec.ts` hardcoded
`domain: "127.0.0.1"`, so a `localhost` cookie was never sent to them and every admin route
redirected to login. Both browse specs are read-only (no CSRF-gated mutations), so they carry no
origin constraint — the cookie just has to reach the run host. Bound both to the base URL host, the
same host-agnostic form the editor spec now uses:

```ts
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
function sessionCookie(token: string) {
  return { name: "authjs.session-token", value: token, url: BASE_URL };
}
```

Two files, +10/−2.

## Results

- `npx tsc --noEmit` — 0 errors.
- Both browse specs together at `PLAYWRIGHT_BASE_URL=http://localhost:3004`, chromium, `--workers=1`
  — **85/86 passed** (2.1m). Before this fix, **zero** browse tests could run at `localhost` (all
  redirected to login), so this is the enabling change for a single-host suite run.

### The one failure is pre-existing, not caused by this change

`admin-media-library-browse.spec.ts:646` — "keyboard focus order accounts for skip link and verifies
visible focus indicator" — fails at `expect(firstFilter).toBeFocused()` (line 661) with
`Received: inactive`. It fails **identically and consistently (2/2) at `127.0.0.1`**, i.e. on the
spec's original host and independent of the cookie form, so it is neither introduced by nor in scope
for this cookie change. Diagnosis: the media page renders the filter tabs before the upload control
(no focusable element was inserted ahead of the filter nav), so this is a **fragile focus-order
assertion** against the admin-layout chrome — the expected `Tab → skip link → Tab → first filter
link` sequence no longer holds. Whether that is a real skip-link/a11y regression or a stale test is a
UI/a11y-lane call. Recorded as a carried defect in `M3-REFERENCE-SLICE-ENTRY.md`; **not fixed here**
to avoid widening this cookie task.

## Follow-ups / risks

- `playwright.config.ts`'s `127.0.0.1` default baseURL is inconsistent with `AUTH_URL=localhost`;
  reconciling (GPT root-config lane) would let the whole suite pass on the default without a
  `PLAYWRIGHT_BASE_URL` override.
- The media focus-order test (above) needs a UI/a11y-lane decision: fix the skip-link/focus order or
  update the test's expected Tab sequence.
- **Independence.** Self-reviewed by the stand-in; Codex/DeepSeek must re-verify on return.

## Contract / dependency changes

None. Test-only.
