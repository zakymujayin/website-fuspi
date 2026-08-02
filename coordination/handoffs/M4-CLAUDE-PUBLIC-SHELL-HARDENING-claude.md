# Handoff — M4-CLAUDE-PUBLIC-SHELL-HARDENING — claude

- Task: `M4-CLAUDE-PUBLIC-SHELL-HARDENING`
- Branch: `ai/claude/m4-public-shell-hardening`
- Base branch: `origin/integration/m4-features`
- Base SHA: `184c64c9ad5eac262de9417edcdc447eab82b824`
- Frozen milestone base (manifest `base_sha`, verified ancestor): `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- Implementation head SHA: `a99f256ac34d919e7a9201a72d495f08dc620c5b`
- Round-1 implementation head (superseded): `c2b0f2b394577bf2737c0f98344a1d1ffd6d274f`
- Handoff head SHA: this commit
- Verdict: **READY FOR INDEPENDENT RE-REVIEW**

## Review corrections (round 2)

`cbfdd9125876e9ecb0b1ce66166dde995e4929cd` was reviewed **CHANGES_REQUESTED**.
All three findings were valid and are fixed. Each fix was mutation-tested: the
fix was reverted, the new assertions were confirmed to fail, and the fix was
restored.

### 1. Reduced-motion drawer coverage — fixed

`Dialog.Backdrop` was the only animated drawer element without its own
`motion-reduce:transition-none`; it now carries it, alongside `Dialog.Popup`
and the accordion chevron, which already did.

The component test no longer relies on a whole-file string match. It extracts
the `className` of the `Dialog.Backdrop` and `Dialog.Popup` elements
individually and requires each to (a) actually declare a transition and (b)
carry the reduced-motion escape, so one element can never vouch for the other.
A structural sweep additionally fails any *future* animated drawer element that
lacks the escape. Reverting the backdrop class fails 3 component tests.

Playwright emulates `reducedMotion: "reduce"`, opens the drawer, and reads the
computed `transitionDuration` of `[data-slot="drawer-backdrop"]` and
`[data-slot="drawer-panel"]`, requiring every entry below 0.05s.

**Honest limitation, reported rather than glossed:** that duration assertion
passes with or without the utility class, because `src/app/globals.css:296-305`
already forces `transition-duration: 0.01ms !important` under
`prefers-reduced-motion: reduce` globally. Measured: `0.00001s` in both states.
So the end-user behaviour was already correct before this fix; the real defect
was that the backdrop depended solely on that global `!important` reset while
every sibling declared its own. The fix removes that asymmetry, and the
component test is what actually detects the regression. To stop the e2e
assertion from being vacuous, a paired baseline test now asserts that **without**
reduced motion both elements animate for **more** than 0.05s — so the pair
proves the media query is doing the work, rather than proving the elements
never animate. `globals.css` was not modified; it is outside this lease.

### 2. Locale-safe internal utility link — fixed

`UtilityLink` now renders site-relative destinations through the localized
`Link` from `@/i18n/navigation`, so `localePrefix: "always"` emits `/id/gkm`,
`/en/gkm`, and `/ar/gkm`. External `http(s)` destinations remain raw
`<a target="_blank" rel="noopener noreferrer">` anchors — prefixing an absolute
origin would corrupt it, and a test now asserts the external branch never
routes through the localized Link. No destination is rewritten, guessed, or
hard-coded; only the locale segment that routing owes is added.

Playwright asserts the **exact** `href` per locale, in both the desktop topbar
and the drawer. `href$="/gkm"` was removed from the existing spec, as required:
it passes even when the locale segment is missing.

The navigation test was strengthened after mutation testing exposed it as weak.
A locale-less `/gkm` still ends on `/id/gkm` because the proxy redirects it, so
the final URL cannot distinguish the two. The test now records redirect
responses and requires that no `/gkm` redirect was needed. Reverting the fix
fails that assertion and all six href assertions.

This supersedes the round-1 follow-up that flagged the `gkm` entry as
unconvertible. The reviewer's direction is followed: the emitted path is
unchanged, only the locale prefix routing already owns is applied.

### 3. Drawer closure — fixed

`UtilityLink` accepts an optional `onClick`, applied to both link branches, and
`MobileNav` passes `close`. The prop is optional because `SiteHeader` is a
Server Component and cannot pass a function prop; a test pins that the shared
topbar usage stays handler-free so the dual-use module keeps building.

Playwright covers both destination kinds: activating an external entry closes
the drawer while this page stays put (the new tab is awaited and closed), and
activating the internal GKM entry navigates to exactly `/id/gkm` with no dialog
left open.

### 4. Regression requirements — held

FUSPI identity and the five programs in contract order (IAT, IH, AFI, SAA,
TASPI) are still asserted per locale; the `FUDA is never present` spec still
passes. No SILA or guessed domain was added. RTL inline-end entry, keyboard
operation, focus return, external-link announcements, 44px targets, landmarks,
axe, and the five viewports all still pass. `nav-items.ts`, `globals.css`,
`src/components/ui/**`, contracts, config, dependencies, schema, and backend
files were read only — the diff is 4 files, all inside `allowed_paths`.

## Reconciliation against integration

This branch was rebased from `b6e7bbd081daf79f7f57c094d1c9daaab62c601f` onto
`184c64c9ad5eac262de9417edcdc447eab82b824`, which adds the accepted
`M4-GPT-PPKS-QUERY-ISOLATION` work plus its coordination records.

- The rebase applied all three commits with **zero conflicts**. No `ours`,
  `theirs`, force checkout, or cross-worktree file copy was used.
- The two lease path sets do not intersect, so no shared file was rewritten.
  `git diff <old head> <rebased head>` returns exactly the ten incoming
  integration files (`src/contracts/ticket.ts`,
  `src/features/tickets/query-isolation.ts`,
  `src/lib/tickets/protected-fields.ts`, three `tests/m4/tickets/*`, and four
  coordination records) and nothing else — every file this task owns is
  byte-identical to the pre-rebase head.
- No incoming PPKS source, schema, dependency, contract, auth, backend file,
  task status, ownership lease, integration ref, or `main` was modified.

Previous SHAs, superseded and retained for audit: base
`b6e7bbd081daf79f7f57c094d1c9daaab62c601f`, implementation head
`b196480d4d0a10dc4d0448f8bcc0e489155ea58d`, handoff head
`c853cc353941768ef7d0edd2d1b5b848025247a1`.

## Result

All seven required outcomes are implemented as a presentation-only change. The
frozen navigation data, shared contracts, global CSS, shadcn primitives,
dependencies, schema, routes, and backend logic are untouched.

1. **Layer parity.** The three desktop layers keep their markup and accessible
   names. The mobile drawer carries all three layers as named sections, with the
   language choice first and every target at 44px.
2. **Keyboard and focus.** Desktop dropdown (Base UI Menu), drawer (Base UI
   Dialog), language switcher, skip link, and footer all operate by keyboard with
   the global `:focus-visible` ring, Escape closing overlays, and focus returning
   to the trigger. No landmark was added: one `banner`, one `main`, one
   `contentinfo`.
3. **Compact sticky header.** `src/components/public/shell/sticky-header.tsx`
   pins the header and, past 100px, collapses it to the specified 60px bar with
   `shadow-sm` over 200ms. The collapse is a **translate only** and the bar
   heights moved onto the bordered wrappers, so the header's flow box is a
   constant 148px on desktop / 76px on mobile and no page content moves. The
   component renders the expanded state on the server and on the first client
   paint, then reconciles a restored scroll position in an effect, so hydration
   cannot mismatch. Reduced motion drops the transition and keeps the behaviour.
4. **Arabic RTL.** Logical utilities throughout; the drawer is anchored with
   `end-0` and its slide transform carries an explicit `rtl:` pair (transforms
   have no logical equivalent). The external-link glyph mirrors with
   `rtl:-scale-x-100`; the wordmark stays unmirrored (`dir="ltr"`, docs/12-E-4).
5. **Viewports.** No horizontal page overflow at 360/390/768/1024/1440 in ID, EN,
   and AR, expanded and compact, and with the drawer open. Content and utility
   bars scroll inside themselves rather than widening the page; primary nav items
   are `whitespace-nowrap` and the wordmark subtitle yields width first, so the
   long EN labels stay fully readable at 1024px.
6. **External destinations.** `shell/nav-url.ts` classifies each frozen
   destination at render time. `http(s)` origins get `target="_blank"`,
   `rel="noopener noreferrer"`, a mirrored glyph, and a translated screen-reader
   hint; site-relative paths stay plain same-tab links; anything else
   (`javascript:`, `data:`, `//host`, unparsable) is rendered as text and never
   handed to the browser. No destination is rewritten, invented, or hard-coded,
   and no SILA URL was added.
7. **Coverage.** 45 component cases and 84 Playwright cases, below.

### Defects found and fixed in scope

- **Footer contrast (WCAG AA, serious).** The footer bottom bar used
  `text-slate-500` on `navy-900` = **3.29:1** at 13px. This is the first axe pass
  that includes the shell's own header and footer — the existing M3 specs exclude
  both. Fixed to `text-slate-400` (≈6:1). 54 axe nodes cleared.
- **Header transition never animated.** Tailwind v4 emits translate utilities as
  the standalone `translate` property, so the initial
  `transition-[transform,box-shadow]` compiled to a property list that omitted
  it and the compaction snapped. Fixed to `transition-[translate,box-shadow]`;
  a component test now fails any arbitrary transition list on the shell that
  omits `translate`.
- **Header flow box was 150px, not 148px.** The 36/76px heights sat inside the
  bordered wrappers, so each rule added a pixel and the pinned bar settled at
  62px. Heights moved onto the bordered wrappers (border-box), giving exactly
  36 + 36 + 76 = 148px and a 60px pinned bar.

## Files changed

New:

- `src/components/public/shell/header-scroll.ts` — pure 100px threshold.
- `src/components/public/shell/nav-url.ts` — pure destination classification.
- `src/components/public/shell/sticky-header.tsx` — the only client scroll state.
- `src/components/public/shell/utility-link.tsx` — hook-free external-link semantics.
- `tests/m4/ui/public-shell-hardening.test.tsx`
- `e2e/m4/public-shell-hardening.spec.ts`

Modified:

- `src/app/[locale]/(public)/layout.tsx` — `scroll-mt-[148px]` on `#main` so the
  skip link and in-page anchors clear the sticky header.
- `src/components/public/site-header.tsx` — sticky wrapper, exact bar geometry,
  compact re-centring nudge, `UtilityLink`, overflow containment.
- `src/components/public/mobile-nav.tsx` — language section first, named
  sections, 44px targets, `UtilityLink`.
- `src/components/public/desktop-nav.tsx` — no-wrap labels, tighter lg gaps,
  44px menu items.
- `src/components/public/language-switcher.tsx` — `size` and `labelledBy` props
  (replaces the arbitrary-selector target override in the drawer).
- `src/components/public/brand-mark.tsx` — shrinks and truncates the subtitle
  before the primary menu loses width.
- `src/components/public/site-footer.tsx` — contrast fix, link target heights.
- `messages/{id,en,ar}.json` — one new key, `Nav.externalLinkHint`.

Round-2 corrections touched four already-leased files and added none:

- `src/components/public/shell/utility-link.tsx` — localized `Link` for
  site-relative destinations, optional `onClick`.
- `src/components/public/mobile-nav.tsx` — backdrop reduced-motion escape,
  `data-slot` hooks on backdrop and panel, `onClick={close}` on `UtilityLink`.
- `tests/m4/ui/public-shell-hardening.test.tsx` — element-specific
  reduced-motion assertions, structural sweep, localized-Link assertions,
  handler-forwarding and Server-Component-usage guards.
- `e2e/m4/public-shell-hardening.spec.ts` — exact locale hrefs in topbar and
  drawer, drawer-closure for both destination kinds, redirect-free navigation,
  drawer reduced-motion durations plus animated baseline.

## Contract/schema/migration impact

None. No schema, migration, Prisma, dependency, root config, auth, proxy,
env-contract, navigation-registry, route, or shared-contract change. The only
data contract touched is additive UI copy (`Nav.externalLinkHint` in all three
locales). `src/components/public/nav-items.ts`, `src/config/institution.ts`,
`src/i18n/*`, `globals.css`, and `src/components/ui/**` were read only.

## Verification

Every `acceptance_commands` entry, re-run in order after the round-2
corrections. No test was skipped in any run; skipped is not counted as passed.

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/public-shell-hardening.test.tsx src/components/public/nav-items.test.ts` | PASS — 2 files, **52/52** tests, 0 skipped |
| `npm run lint` | PASS — exit 0, no findings |
| `npm run typecheck` | PASS — exit 0, `tsc --noEmit` silent |
| `npm test` | PASS — 52 files, **789/789** tests, 0 skipped |
| `npm run build` | PASS — compiled in 5.8s, 34/34 static pages, zero warnings, zero errors |
| `npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=1` | PASS — **104/104** (52 per project), 0 skipped |
| `git diff --check` | PASS — exit 0 |
| `TASK_MANIFEST=… TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — "17 changed file(s) are within lease" |

Round-2 deltas, all from the corrections above: targeted component suite
45 → **52** (+7), full unit suite 782 → **789** (the same +7), M4 Playwright
84 → **104** (+20 = 10 new cases × 2 projects: 6 exact-href locale assertions,
2 drawer-closure cases, the reduced-motion drawer check, and its animated
baseline). `check:scope` stays at 17 files: the round-2 diff modifies four
already-leased files and adds none.

Mutation evidence — each fix was reverted, the new assertions were confirmed to
fail, then the fix was restored and the suites re-run green:

| Reverted fix | Failures observed |
|---|---|
| backdrop `motion-reduce:transition-none` | 3 component tests fail. The e2e duration check does **not** fail — see the limitation under correction 1 |
| localized `Link` → bare `<a>` | 1 component test, 6 exact-href e2e assertions, and the navigation test's redirect assertion fail |

Additional regression run (not required by the manifest, run because this task
changes the shell every public route inherits):

| Command | Result |
|---|---|
| `npx playwright test e2e/experience e2e/foundation --project=chromium --project=mobile --workers=1` | PASS — **84/84**, 0 skipped, including the pre-existing shell contrast, landmark, skip-link, and drawer specs |

`npm run build` rewrites the tracked `next-env.d.ts` import from
`./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`. That file is
outside this lease, so it was restored with `git checkout --` after the build
and is **not** part of any commit. `git status` is clean and no generated
artifact is tracked.

New Playwright coverage, per locale where the axis is locale-sensitive:
compaction only past 100px with an unchanged document position and scroll height;
pinned-bar geometry; hydration console/pageerror sweep; reduced motion; skip-link
clearance under the sticky header; dropdown Enter/ArrowDown/Escape/focus-return;
drawer focus containment over 8 tabs; accordion by keyboard; drawer section order;
44px targets including the expanded submenu; inline-end drawer entry in ID/EN/AR;
external `target`/`rel`/announcement and the internal exception; no guessed
integration host; landmark counts; axe WCAG A/AA over the whole shell, with the
drawer open, and on the compact header; overflow at five widths expanded and
compact; 1024px menu fit; 360px zoom-equivalent reachability.

## Untested areas

- Real assistive-technology passes (NVDA/VoiceOver) and real pinch/browser zoom.
  Zoom is approximated by the 360px CSS viewport (≈400% on 1440px).
- Only `/prodi` is exercised. It is the one public route that renders the full
  shell without seeded content; other routes inherit the same layout but are not
  asserted here.
- The compact header is verified in the Playwright dev server, not against
  `next start`.
- Firefox and WebKit: the manifest's acceptance command pins chromium and mobile.
- No visual-regression baseline was added.

## Risks and follow-ups

- **Medium — sticky geometry is calibrated by constant.** The compact translate
  (16px mobile, 88px desktop) assumes bars of exactly 36 + 36 + 76px. Any future
  change to a bar height must update `sticky-header.tsx` together with it. Three
  component tests and the e2e pinned-bar assertion fail loudly if they drift, but
  the coupling is real and deliberate — it is what buys zero layout shift.
- **Low — full-height sticky between 0 and 100px.** While scrolled 0–100px the
  expanded 148px header overlays content, which is inherent to the docs/17-B
  behaviour. Past the threshold only 60px is covered.
- ~~**Low — the `gkm` utility entry is a bare `<a href="/gkm">`.**~~
  **Resolved in round 2.** It now routes through the localized `Link`, so the
  locale prefix is emitted directly and no proxy redirect is needed. The
  destination in `nav-items.ts` is unchanged.

- **Low — externality is still inferred from URL shape.** `UtilityLink` decides
  internal vs. external by parsing the destination, because the frozen contract
  carries no `isExternal` flag. Correct for the current four entries, but an
  entry pointing at an absolute URL on this site's own origin would be treated
  as external. Resolved by the navigation-registry contract task below.
- **Low — `Nav.externalLinkHint` touches all three message catalogs.** Trivial
  additive keys, but they are a common conflict point during integration.
- Keyboard focus moving into the off-screen top bars while compact makes the
  browser scroll them back into view, which expands the header. This is
  intentional and desirable, not a defect.

All of the above remain valid after reconciliation; none was introduced,
resolved, or altered by the rebase. The incoming PPKS query boundary adds no
route, UI, or navigation entry, so it does not interact with the public shell
and the shell suites cover it neither before nor after the rebase.

New in round 2:

- **Low — `/gkm` has no route yet.** The link is now locale-correct, but
  `src/app/[locale]/(public)/` has no `gkm` segment, so it lands on the 404
  boundary. That was equally true before this change and is a content/route
  matter outside this lease; the navigation test asserts the URL and the absence
  of a redirect, not that the page renders.
- **Low — the e2e reduced-motion duration check cannot fail on its own** while
  the `globals.css` `!important` reset stands. Documented under correction 1;
  the component test carries that regression signal instead. If the global reset
  is ever removed, the e2e check becomes load-bearing on its own.

## Requested shared changes

None. No contract or dependency change was needed, and nothing in scope was
blocked.

Follow-ups for a future **GPT-owned contract task**, not requested as blockers:

1. The CMS-backed navigation registry that replaces `nav-items.ts`. When it
   lands, an `isExternal` (or explicit `kind`) field on each entry would let the
   shell stop inferring externality from the URL shape, and would let the `gkm`
   entry become a locale-aware internal link.
2. `NEXT_PUBLIC_SILA_URL` wiring whenever SILA deep-link integration is
   authorised. Nothing SILA-related was added, guessed, or stubbed.
