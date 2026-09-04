# Handoff — M6-CLAUDE-HOMEPAGE-INSTITUTIONAL-REDESIGN (claude)

- **Task ID:** M6-CLAUDE-HOMEPAGE-INSTITUTIONAL-REDESIGN (user-assigned; no coordination manifest exists — GPT may create the formal task record)
- **Branch:** `ai/claude/m6-homepage-institutional-redesign`
- **Base SHA:** `70ad9c1` (HEAD of `ai/claude/m5-lecturer-profile-redesign`)
- **Head SHA:** `9852052`
- **Lane:** claude (public UI, design system, accessibility/RTL) — all touched paths within claude-owned scope (`src/components/public/**`, `src/app/[locale]/(public)/**`, `src/app/globals.css`, `messages/**`, plus shell test maintenance)

## Summary

Implemented the approved homepage audit as **MODERN INSTITUTIONAL ACADEMIC**: sans-serif heading system, light-first canvas, royal-500 brand bands, normalized type scale, restored compact header, removed all editorial-magazine devices, and fixed every P0 a11y/i18n/perf issue. Homepage now reads as a formal university faculty site: Satoshi bold headings, slate-50/white alternation, navy only in the top bar/hero scrim/footer, brass reduced to micro-accents.

## Files changed

- **Tokens:** `src/app/globals.css` — `--font-display` → Satoshi, new `--font-serif-display` (Newsreader), base bg → slate-50, heading weight contract 700/600, RTL heading fonts (IBM Plex Sans Arabic), `.font-serif-display` utility (Amiri in RTL)
- **Shell:** `shell/sticky-header.tsx` (restored docs/17-B compact 60px contract), `shell/header-scroll.ts` (restored), `site-header.tsx` (76px bar), `desktop-nav.tsx` / `mobile-nav.tsx` (lg breakpoint, 13px→sm adaptive), `identity-badges.tsx`, `top-bar.tsx`, `language-switcher.tsx`
- **Sections:** hero-slider, home-quick-access, dean-welcome, stats, faculty-intro, services, home-newsroom, achievements, facilities, academic-voices, testimonials, video-section, home-video-gallery-item, video-player, partners-section, home-cta-section, site-footer
- **Removed:** `src/components/public/editorial-motion.tsx` (ScrubText + PinnedEditorialSection)
- **Composition:** `src/app/[locale]/(public)/page.tsx` (achievements title fallback, og:image from first hero slide), `layout.tsx`
- **i18n:** 11 new keys × id/en/ar (`heroEyebrow`, `heroRegion`, slider aria-labels, `newsroomEyebrow`, `Footer.slogan`, `achievementsTitle`)
- **Assets:** `public/fonts/satoshi/*.woff2`
- **Tests:** updated `tests/m4/ui/public-shell-hardening.test.tsx`, `tests/m4/ui/public-home-video-section.test.tsx`, `tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts`, `e2e/m4/public-shell-hardening.spec.ts` (7-item IA, academics/research group targets)

## API / schema / migration impact

None. No backend, contract, route, or URL changes. CMS section system untouched.

## Verification (exact commands + results)

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run test` | 1496 passed / 140 files |
| `npm run build` | Compiled successfully |
| `npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile` | 96 passed |
| `npx playwright test e2e/m4/public-post-experience.spec.ts e2e/m4/page-admin.spec.ts --project=chromium` | 6 passed |
| axe WCAG A/AA (homepage `/id`, `/en`, `/ar`, settled animations) | 0 violations |
| horizontal overflow at 360/390/768/1024/1440 × id/en/ar | 0 |
| compact header geometry | 60px pinned bar, no reflow |
| RTL | `dir=rtl`, headings IBM Plex Sans Arabic, quotes Amiri |
| reduced motion | marquee static wrap, hero autoplay disabled, transitions 0ms |
| console errors (homepage) | none |

## Untested areas / risks / follow-ups

- **Package deps:** `gsap` + `@gsap/react` were added to `package.json`/`package-lock.json` by the superseded editorial WIP and are now unused (only `editorial-motion.tsx` imported them, deleted). Left uncommitted — GPT lane owns dependencies; please remove in a contract task.
- **`next-env.d.ts`** flip-flops between dev/build type paths; committed the build variant (regenerated on demand).
- **og:image** falls back to the first CMS hero slide; a purpose-designed 1200×630 brand og image is still recommended.
- Homepage axe was verified with settled animations; opacity-based reveals can transiently trip automated contrast scans that run mid-fade (expected behavior of fade-in motion).
- Visual QA was DOM/computed-style based (this model cannot view screenshots); screenshots saved to `test-results/qa/` for human review.
- `skills-lock.json` (opencode metadata) left untracked; not project content.
- E2E specs for admin/editor flows beyond the shell were not re-run against this branch's full suite (only shell + post + page-admin).
