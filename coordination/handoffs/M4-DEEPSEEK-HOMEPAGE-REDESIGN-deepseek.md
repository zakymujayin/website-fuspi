# Handoff — M4 DeepSeek Homepage Redesign

- **Task ID:** M4-DEEPSEEK-HOMEPAGE-REDESIGN
- **Branch:** deepseek/continue-fuspi-20260805
- **Base SHA:** ec71bde5c64c4d0a3e6d6a37b22d25f14e1b0b0e
- **Head SHA:** 2b9890f76152ae9d9f6bf01afa9c89a6cbee6dff

## Summary
Redesigned the FUSPI public homepage and header following the visual rhythm of https://uinssc.ac.id. Introduced a two-tier header (navy top bar + white main header), a full-width hero slider, alternating section backgrounds, animated stats, dummy content modules, and richer footer. Colors and fonts remain unchanged per the FUSPI design contract.

## Files Changed

### New components
- `src/components/public/top-bar.tsx` — navy utility bar with email, PMB/SIAKAD/E-Learning/GKM, language switcher.
- `src/components/public/hero-slider.tsx` — autoplaying full-width slider with manual controls.
- `src/components/public/advantages-section.tsx` — 6 icon highlights of FUSPI disciplines.
- `src/components/public/dean-welcome-section.tsx` — dean portrait + quote + CTA.
- `src/components/public/stats-section.tsx` — animated counters (Client Component).
- `src/components/public/vision-mission-section.tsx` — vision card + mission list.
- `src/components/public/study-programs-section.tsx` — 5 program cards.
- `src/components/public/news-announcements-events.tsx` — 3-column content block.
- `src/components/public/facilities-section.tsx` — 4 facility image cards.
- `src/components/public/partners-section.tsx` — partner logo grid.
- `src/components/public/home-cta-section.tsx` — final CTA band.

### Dummy data modules
- `src/lib/data/dummy-hero-slides.ts`
- `src/lib/data/dummy-dean.ts`
- `src/lib/data/dummy-news.ts`
- `src/lib/data/dummy-announcements.ts`
- `src/lib/data/dummy-events.ts`
- `src/lib/data/dummy-facilities.ts`
- `src/lib/data/dummy-partners.ts`

### Modified components/pages
- `src/components/public/site-header.tsx` — two-tier header composition.
- `src/components/public/site-footer.tsx` — added address and social links.
- `src/app/[locale]/(public)/layout.tsx` — updated scroll offset to ~112px.
- `src/app/[locale]/(public)/page.tsx` — assembled new sections.
- `messages/id.json`, `messages/en.json`, `messages/ar.json` — added new Home keys.
- `tests/m4/ui/public-shell-hardening.test.tsx` — updated assertions for two-tier header.

### Assets
- `public/images/hero/slide-{1,2,3}.jpg` — downloaded from uinbanten.ac.id.
- `public/images/facilities/library.jpg` — downloaded from uinbanten.ac.id.
- `public/images/news/news-{1,2}.jpg` — downloaded from uinbanten.ac.id.
- `public/images/dean/dean-portrait.jpg` — placeholder portrait (Unsplash stock photo).

### Documentation
- `docs/superpowers/specs/2026-08-05-fuspi-homepage-redesign-design.md`
- `docs/superpowers/plans/2026-08-05-fuspi-homepage-redesign-plan.md`

## API / Schema / Migration Impact
- No Prisma schema changes.
- No API route changes.
- New i18n keys only; existing keys preserved.

## Verification Commands & Results

```bash
npm run lint        # passed (3 pre-existing img warnings)
npm run typecheck   # passed
npm run test        # 1104 passed
npm run build       # 220 pages generated successfully
npm run ci:quick    # passed
```

## Untested Areas / Risks / Follow-ups
- **Dean portrait:** I do not have an image-generation tool available in this environment, so a stock Unsplash placeholder is used. Replace with an actual dean photo before production.
- **Hero/facility images:** Downloaded from uinbanten.ac.id for demo. Confirm usage rights or replace with CMS uploads.
- **RTL visual QA:** Components use logical utilities, but a manual browser check in Arabic is recommended.
- **Reduced motion:** Hero slider and animated stats respect pause/reduced-motion basics; full `prefers-reduced-motion` audit can be tightened.
- **Performance:** Hero slider uses `next/image` priority; consider preloading remaining slides if LCP budgets tighten.
- **DB-driven content:** Homepage now uses dummy data modules; re-enable DB-driven news/events/services/partners when real content is available.

## Contract / Dependency Change Requests
- None.
