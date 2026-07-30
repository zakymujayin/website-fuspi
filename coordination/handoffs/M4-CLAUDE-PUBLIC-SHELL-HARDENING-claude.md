# Handoff — M4-CLAUDE-PUBLIC-SHELL-HARDENING — claude

- Task: `M4-CLAUDE-PUBLIC-SHELL-HARDENING`
- Branch: `ai/claude/m4-public-shell-hardening`
- Base branch: `origin/integration/m4-features`
- Base SHA: `184c64c9ad5eac262de9417edcdc447eab82b824`
- Frozen milestone base (manifest `base_sha`, verified ancestor): `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- Implementation head SHA: `c2b0f2b394577bf2737c0f98344a1d1ffd6d274f`
- Handoff head SHA: this commit
- Verdict: **READY FOR INDEPENDENT REVIEW**

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

## Contract/schema/migration impact

None. No schema, migration, Prisma, dependency, root config, auth, proxy,
env-contract, navigation-registry, route, or shared-contract change. The only
data contract touched is additive UI copy (`Nav.externalLinkHint` in all three
locales). `src/components/public/nav-items.ts`, `src/config/institution.ts`,
`src/i18n/*`, `globals.css`, and `src/components/ui/**` were read only.

## Verification

Every `acceptance_commands` entry, re-run in order on the rebased branch. No
test was skipped in any run; skipped is not counted as passed.

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/public-shell-hardening.test.tsx src/components/public/nav-items.test.ts` | PASS — 2 files, **45/45** tests, 0 skipped |
| `npm run lint` | PASS — exit 0, no findings |
| `npm run typecheck` | PASS — exit 0, `tsc --noEmit` silent |
| `npm test` | PASS — 52 files, **782/782** tests, 0 skipped |
| `npm run build` | PASS — compiled in 5.5s, 34/34 static pages, zero warnings, zero errors |
| `npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=1` | PASS — **84/84** (42 per project), 0 skipped |
| `git diff --check` | PASS — exit 0 |
| `TASK_MANIFEST=… TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — "17 changed file(s) are within lease" |

`npm test` moved from 778 to 782 and from 50 to 52 files purely because the
rebase brings in the accepted PPKS unit suites
(`tests/m4/tickets/ticket-contract.test.ts` and
`tests/m4/tickets/query-isolation.authorization.test.ts`). This task added no
test to that delta. `check:scope` moved from 16 to 17 files because it is now
run at the handoff commit, which includes this file; the previous run was at the
implementation head before the handoff existed.

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
- **Low — the `gkm` utility entry is a bare `<a href="/gkm">`.** It is
  site-relative in the frozen contract and therefore renders without the locale
  prefix that `@/i18n/navigation` would add; the proxy handles the redirect.
  Converting it would change an emitted destination, which this task may not do.
  Flagged for the navigation-registry contract task rather than fixed here.
- **Low — `Nav.externalLinkHint` touches all three message catalogs.** Trivial
  additive keys, but they are a common conflict point during integration.
- Keyboard focus moving into the off-screen top bars while compact makes the
  browser scroll them back into view, which expands the header. This is
  intentional and desirable, not a defect.

All of the above remain valid after reconciliation; none was introduced,
resolved, or altered by the rebase. The incoming PPKS query boundary adds no
route, UI, or navigation entry, so it does not interact with the public shell
and the shell suites cover it neither before nor after the rebase.

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
