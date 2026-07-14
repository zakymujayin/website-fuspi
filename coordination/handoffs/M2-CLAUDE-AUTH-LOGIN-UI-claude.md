# Handoff — M2-CLAUDE-AUTH-LOGIN-UI — claude

- Branch: `ai/claude/m2-auth-login-ui-correction`
- Base: `origin/coordination/m2-claude-auth-login-ui-correction-assignment` (`bd7c8b4`)
- Manifest base_sha: `dc68138`
- Implementation SHA: `ac44363` (`feat(auth): implement localized login UI`)
- Correction SHA: `9aeed3f` (`fix(auth): preserve login state across locale switch`)
- Review answered: `coordination/reviews/M2-CLAUDE-AUTH-LOGIN-UI-gpt.md` (REQUEST_CHANGES, one correction pass)
- Merge status: **not merged**. Password change, session guard, admin shell, proxy authorization, runtime, and M3 were not touched.

## Result

`/[locale]/login` is implemented in a dedicated `(auth)` route group against the frozen
credentials endpoint. The page is a Server Component; only the form is a Client Component.

Behaviour, mapped to the reviewed UX specification (`coordination/reviews/M2-AUTH-UX-SPEC-claude.md`):

1. **One error surface.** All three public failure codes render into a single `role="alert"` /
   `aria-live="assertive"` region that exists from first render. Failure clears only the
   password, keeps the email, highlights no individual field, and moves focus to the alert
   region — not to the password input, because focusing password would confirm the email was
   accepted (§2, §5).
2. **Enumeration class.** `INVALID_CREDENTIALS` is the only code the client ever sees for an
   unknown email, a wrong password, and an inactive account. The client cannot distinguish
   them: it renders `code` and nothing else. No status code, timing, or field state is read.
3. **Rate limit / unavailable.** `TRY_AGAIN_LATER` and `AUTH_UNAVAILABLE` render the spec copy
   with no counter, no timing, no hostname, no account state, and no technical error. A
   malformed or off-origin response also degrades to `AUTH_UNAVAILABLE`.
4. **Submission.** One in-flight request at a time via a ref lock; the button uses
   `aria-disabled`, never `disabled`, so keyboard focus never falls to `<body>`. Inputs go
   `readOnly`, not disabled. One polite announcement. No artificial delay.
5. **Redirect.** The untrusted `?next=` value is forwarded verbatim as the `redirectTo` query
   parameter and is never inspected, resolved, or navigated to on the client. The response is
   re-parsed through `LoginResultSchema`, so a `redirectTo` that fails `SafeInternalPathSchema`
   is refused rather than followed. `requiresPasswordChange: true` routes to the localized
   `/change-password` with the server destination preserved in `?next=`.
6. **i18n / RTL.** ID, EN, AR copy added. Arabic is RTL end-to-end; email and password values
   stay `dir="ltr"` so `@` and dots do not mirror. Logical direction utilities only.

## Correction pass (answers `M2-CLAUDE-AUTH-LOGIN-UI-gpt.md`)

**Blocking finding — locale switching destroyed credentials and the destination.** Confirmed
and fixed. The auth shell had reused the public `LanguageSwitcher`, which preserves only
`usePathname()`: it dropped the query string, so `?next=` vanished, and the navigation
remounted the form, so both fields emptied.

- `src/components/auth/auth-language-switcher.tsx` (new) — auth-owned switcher. Keeps the query
  string on the link (`next` rides along in the URL untouched, exactly as before — it is not a
  credential), intercepts the click, snapshots the form, then navigates.
- `src/components/auth/auth-draft.tsx` (new) — single-use, module-scoped in-memory draft plus
  the provider that lets the switcher read the live form. Credentials go **nowhere else**: not
  the URL, history state, cookies, `localStorage`/`sessionStorage`, RSC payload, log, or
  analytics.
- Lifecycle: the destination form initialises from the draft, then erases it in a mount effect
  (single-use). It is also erased on submit and on leaving the auth flow. A `handoffPending`
  flag keeps the shell's own teardown from erasing the draft *while the locale navigation is
  in flight* — without it the draft died between the two shells, which the first test run
  caught.
- Regression coverage in `e2e/auth/login.spec.ts`: values and `next` survive the switch;
  credentials appear in no script/RSC payload, history state, storage, cookie, URL, or body
  text; a fresh `/login` visit starts empty; a submit discards the draft.

**Required small corrections** — all applied: `spellCheck={false}` on email; `data-icon` on the
toggle icons inside `Button`; a visible focus ring on the error region (bound to `:focus`, not
`:focus-visible`, because the region is focused programmatically and `:focus-visible` is not
reliably applied then); and the file count below, which said 12 where the scope checker
reported 13.

One consequence worth naming: `useSearchParams()` in the shared shell forced
`/[locale]/login` to bail out of prerendering. It is wrapped in `<Suspense>` with a
height-holding fallback, which is the sanctioned fix; the route was already dynamic because
the page reads `searchParams`.

## Files changed (13 in the original pass, all inside the lease)

- `src/app/[locale]/(auth)/layout.tsx` — auth shell: fonts, skip link, single `<main>`, auth language switcher (no public nav/search)
- `src/app/[locale]/(auth)/login/page.tsx` — Server Component page, FUSPI identity from `src/config/institution.ts`, `robots: noindex`
- `src/components/auth/login-form.tsx` — Client Component: submission, failure states, focus management
- `src/components/auth/password-field.tsx` — password input + show/hide toggle (`aria-pressed`, changing label)
- `src/components/ui/{card,field,input,spinner}.tsx` — leased shadcn primitives
- `messages/{id,en,ar}.json` — `Auth` namespace
- `e2e/auth/login.spec.ts` — Playwright coverage
- `coordination/handoffs/M2-CLAUDE-AUTH-LOGIN-UI-claude.md` — this handoff (the 13th file the scope checker counts)

The correction pass adds `src/components/auth/auth-draft.tsx` and
`src/components/auth/auth-language-switcher.tsx` and touches the shell, the form, the password
field, and the e2e spec.

No change to `package.json`, `package-lock.json`, `prisma/**`, `src/auth.ts`, `src/lib/**`,
`src/contracts/**`, `src/proxy.ts`, `src/config/**`, `src/app/api/**`, `globals.css`, or
`src/app/[locale]/layout.tsx`.

## Contract / schema / migration impact

None. This task **consumes** `src/contracts/auth.ts` and the credentials route; it changes
neither.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | pass — no issues |
| `npm run typecheck` | pass — no errors |
| `npm test` | pass — 133 passed, 8 skipped (13 files) |
| `npm run build` | pass — no errors, no warnings; `/[locale]/login` is dynamic (reads `searchParams`) |
| `npx playwright test e2e/auth/login.spec.ts` | pass — 46/46 (23 tests × chromium + mobile) |
| `git diff --check` | pass |
| `TASK_MANIFEST=… TASK_BASE=origin/coordination/m2-claude-auth-login-ui-correction-assignment npm run check:scope` | pass — all changed files within lease |

`npm ci` was required first: `next-auth` and `@auth/prisma-adapter` were in the lockfile but
absent from this worktree's `node_modules`, so typecheck failed on GPT's runtime files before
any of my code existed. `npm ci` left `package.json` and `package-lock.json` untouched.

## Deviations that need a decision

1. **`shadcn add field` pulls two files outside the lease.** The registry's `field` depends on
   `ui/label` and `ui/separator`, which the manifest does not lease. Rather than write outside
   the lease, I inlined the label and the separator rule into `field.tsx` and deleted the two
   generated files. **Request to GPT:** lease `src/components/ui/label.tsx` and
   `src/components/ui/separator.tsx` to the next form-bearing UI task and let shadcn regenerate
   them properly; `field.tsx` should then import them again.
2. **`ui/input.tsx` default height changed from `h-8` to `h-10`.** 40px is the control height
   contract (`docs/03`, `docs/17-A`) and `ui/button.tsx` already encodes it. Changing the
   primitive rather than patching each call site keeps the contract in one place.
3. **`ui/spinner.tsx` no longer hard-codes `aria-label="Loading"`.** The registry ships an
   English string; in a trilingual UI that is a defect. The spinner is now decorative and the
   form announces progress in its own localized polite region.
4. **Rate-limit lock releases on edit, not on a timer.** §6 asks the form to return to idle by
   itself when the block expires, but the block duration is deliberately not exposed (§A1: no
   remaining-attempt count, no precise block time). With nothing to count down against, the
   lock releases as soon as the user edits a field, and the server stays the sole authority on
   whether the block still holds. A timer would require the server to disclose the window.
5. **Default destination is `/${locale}/admin`, supplied by the client when `?next=` is absent.**
   The runtime's own fallback is the hard-coded `/id/admin`, which would land an Arabic user on
   an Indonesian route and violates §12(d). The client therefore sends the locale-correct admin
   path as `redirectTo` when there is no `next`. This is not a client-side authorization or
   validation decision — the server still validates the value through `SafeInternalPathSchema`
   and the destination page still enforces its own authorization. **If GPT prefers the fallback
   to be locale-aware in the runtime instead, that is a one-line change in
   `src/lib/auth/runtime/credentials.ts` and I will drop the client default.**

## Dependency request

**`@axe-core/playwright`** — the UX spec's acceptance criteria call for automated axe checks
(§3(a): no critical/serious violations). It is not in `package.json` and dependencies are
forbidden to this lane, so the accessibility assertions in `e2e/auth/login.spec.ts` are
structural (labels, roles, focus order, `aria-pressed`, `aria-disabled`, no horizontal
overflow) rather than axe-driven. Adding the package is a GPT-owned contract change.

## Arabic copy — draft, blocks production not integration

**The Arabic copy in `messages/ar.json` (`Auth` namespace) is an unreviewed draft.** It exists
so RTL can be exercised, and it has **not** been validated by a native speaker.

Per the reviewer's ruling, it **may remain explicitly marked draft on the development
integration branch**, so this task does not loop. Native-speaker review is required **before a
production release**, and until then the copy must not be described as approved.

## Untested areas and risks

- **No test runs against the real credentials endpoint.** Every e2e test intercepts the
  network. Server-side enumeration equivalence, timing equalization, and the real rate-limit
  counter are DeepSeek's adversarial tests against GPT's runtime, not this UI's.
- **`/[locale]/change-password` and `/[locale]/admin` do not exist yet.** The form navigates to
  them; today both 404. The tests assert the URL, not the destination page. The
  `requiresPasswordChange` bridge is GPT-owned.
- **No session-expired / session-revoked banner on the login page.** §9/§10 require one, but
  its trigger is a session guard, which this task must not implement. §9 also warns that a
  banner driven by an unvalidated query parameter is a phishing surface, so I did not add a
  `?reason=` flag. This stays for the session-guard task (M2).
- **Caps Lock hint (§1) not implemented** — optional in the spec, deferred.
- **The locale hand-off needs JavaScript.** Without it the switcher is still a working link, but
  nothing can carry browser-only state across a document load. This is inherent, not a defect.

## Follow-ups (all M2)

1. Native-speaker review of the Arabic `Auth` copy — **blocks production, not development
   integration**. — *Claude / reviewer*
2. Decide deviation 5 (locale-aware redirect fallback: client-supplied vs runtime). The reviewer
   assigned locale-normalizing a validated stored redirect to the next GPT-owned auth bridge
   contract; until then this UI keeps navigating only to the server-returned destination. — *GPT*
3. Lease `ui/label.tsx` + `ui/separator.tsx` and restore the registry's `field.tsx` imports. — *GPT*
4. `@axe-core/playwright` dependency so the axe acceptance criteria become executable. — *GPT*
5. Session-expired / revoked banner on the login screen, once the session guard exists. — *GPT / Claude*

**No request to start M3.** M3 (Post + Media + i18n vertical slice) remains inactive.
