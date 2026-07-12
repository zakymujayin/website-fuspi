# HANDOFF — M1-CLAUDE-EXPERIENCE

- **Task:** M1-CLAUDE-EXPERIENCE (owner: claude, reviewer: gpt, tester: deepseek)
- **Branch:** `ai/claude/m1-experience` (pushed)
- **Base SHA:** `77f2901454be2699144241accee3e9a3805f2b02` (main / M0 foundation)
- **Head SHA:** `6f0fd19481df90383e452f69d9b64bdabf51eb07`
- **Status:** ready for review. Not merged; no integration branch touched.

## Summary

Final design tokens from `docs/03` plus the accessible public shell in ID/EN/AR with
RTL from the first implementation. No schema, dependency, auth, proxy, or contract
change. Navigation is a typed mock (`src/components/public/nav-items.ts`) pending the
CMS navigation registry.

## Files changed (19, all within lease)

- `src/app/globals.css` — royal/navy/brass/slate scales, semantic shadcn mapping, font
  stacks (`--font-display|body|arabic-ui|arabic`), layered shadows, `container-fuspi`,
  `section-rule` (2px brass signature), `prose-measure`, focus-visible ring, reduced
  motion, Arabic stack + 1.8 leading on `html[dir="rtl"]`. M0 `.foundation-*` classes kept.
- `src/app/[locale]/(public)/layout.tsx` — shell: `next/font` (Plus Jakarta Sans, Inter,
  IBM Plex Sans Arabic, Amiri), skip link, header, `<main id="main">`, footer.
- `src/app/[locale]/(public)/prodi/page.tsx` — study-programs route from `institution.ts`.
- `src/components/public/*` — `site-header` (3 layers per docs/17-B), `desktop-nav`
  (Base UI Menu: hover + keyboard + Esc), `mobile-nav` (Base UI Dialog drawer from the
  inline-end side), `language-switcher` (path-preserving, works without JS),
  `site-footer`, `section-heading`, `skip-link`, `brand-mark`, `nav-items(+test)`.
- `src/components/ui/` — `container.tsx`; `button.tsx` size scale moved to the 40px
  control height required by docs/03 and docs/17-A (no other lane consumes Button yet).
- `messages/{id,en,ar}.json` — `Nav`, `Footer`, `StudyPrograms` namespaces. M0 untouched.
- `e2e/experience/shell.spec.ts` — 14 specs × 2 projects.

## API / schema / migration impact

None. No file under `prisma/**`, `package*.json`, or `src/proxy.ts` was touched.

## Commands and results

| Command | Result |
|---|---|
| `npm run lint` | pass — no issues |
| `npm run typecheck` | pass |
| `npm test` | pass — 3 files, 8 tests |
| `npm run test:e2e` | pass — 28 passed (chromium + Pixel 7) |
| `npm run build` | pass — `/id`, `/en`, `/ar`, `/{locale}/prodi` prerendered |

Prereqs in a fresh worktree: `npm ci`, a `.env` (dotenv in `prisma.config.ts` reads
`.env`, not `.env.local`), then `npx prisma generate` — otherwise `typecheck` fails on
`prisma/seed.ts`, which is a pre-existing M0 condition, not a change of mine.

## Defects found and fixed (both now guarded by e2e)

1. **Link colour on dark bars (WCAG failure, from M0).** `globals.css` had an unlayered
   `a { color: inherit }`. Unlayered CSS outranks every `@layer utilities` rule, so all
   `text-slate-*` utilities on links were dead: topbar/footer links rendered at body
   colour on navy — measured **1.14:1**. Moved the rule into `@layer base`. Guarded by
   "text on the dark bars meets WCAG AA contrast" (samples real sRGB pixels, since
   Tailwind emits `oklch()`/`lab()` that a regex parser mangles).
2. **EN nav overflowed at 768px** (22px horizontal scroll). The primary nav now hands
   over to the drawer up to `lg`. Guarded by "never scrolls horizontally" at
   360/390/768/1024/1440 in all three locales.

## Blocking issue for the integrator — `scripts/check-task-scope.mjs` (GPT-owned)

**`npm run check:scope` currently fails for every task, including clean ones.** The
manifest parser strips `- ` but not the surrounding YAML quotes, so the glob becomes
`"src/components/public/**"` (quotes included) and matches nothing — every changed file
is reported outside the lease. This affects all three lanes, not just mine.

Fix is one line in `scripts/check-task-scope.mjs` (GPT's lane, so I did not touch it):

```js
.map((line) => line.replace(/^\s+-\s+/, "").trim().replace(/^"|"$/g, ""))
```

I verified my diff against the lease with the corrected matcher: **19 changed files,
0 outside lease.** Please land the fix before relying on CI scope-check.

## Contract requests (GPT)

1. **Homepage route.** `src/app/[locale]/page.tsx` (M0 placeholder) resolves to the same
   path as `(public)/page.tsx`, and it is outside my lease, so the shell cannot own the
   homepage yet. Next.js errors on two parallel pages for one path. Please move it into
   `src/app/[locale]/(public)/page.tsx` (or grant me that path) so the public homepage
   sits inside the shell. Until then the shell is exercised via `/{locale}/prodi`.
2. **Fonts in the root layout.** `next/font` is loaded in the `(public)` layout because
   `[locale]/layout.tsx` is GPT-owned; admin routes will need the same variables. Worth
   hoisting to the locale layout in a contract task.
3. **`NEXT_LOCALE` cookie** on locale switch (docs/12-F) belongs to proxy/env config.

## Untested areas / risks / follow-ups

- No axe/Lighthouse run yet — DeepSeek (tester) should add axe to `e2e/experience`.
- Sticky/shrinking header on scroll (docs/17-B) is **not** implemented; deferred to M4.
- `BrandMark` is a wordmark placeholder; the real logo is a media asset (must not mirror
  in RTL).
- Footer contact block is a placeholder until `SiteSetting` exists.
- Nav labels/links are a typed mock; they must be replaced by the navigation registry.
- Dark mode tokens are defined but no route opts into `.dark` yet — unverified.
- No FUDA identity, domain, or copy anywhere; the five v1 prodi and their order are
  asserted against `src/config/institution.ts` in `nav-items.test.ts`.
