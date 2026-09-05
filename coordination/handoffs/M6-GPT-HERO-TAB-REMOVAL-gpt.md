# M6-GPT-HERO-TAB-REMOVAL — GPT handoff

- Branch: `ai/gpt/m6-homepage-polish`
- Base: `bf4fe9b` (previous homepage-polish handoff)
- Implementation head: `50b168b2db3f5e1531322dd59b8cda85a9d0e4e3`
- Authority: user explicitly corrected the identity-tab interpretation and requested its removal.

## Change

Removed the faculty identity overlay from `src/components/public/hero-slider.tsx`, its unused institutional import, and its desktop/mobile CSS from `home-design.module.css`. Removed the tab-dependent rule hiding the mobile header faculty name, so identity remains in the header. Hero imagery, heading, CTA, height, and carousel behavior are unchanged. Header markup, Search, footer, and other refinements are unchanged.

Updated `e2e/m4/homepage-polish.spec.ts` to assert no identity tab, visible hero heading and header identity, no overflow, and functioning search in ID/EN/AR at 1440/390/360px. Added the scoped task manifest. This correction supersedes the earlier review/handoff statements approving the Hero identity tab; those records otherwise describe the preceding refinement accurately.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: 140 files, 1,496 tests passed.
- `npx playwright test e2e/m4/homepage-polish.spec.ts --project=chromium --workers=2`: 8 passed, including search axe scans, keyboard behavior, motion, and autoplay regressions.
- `git diff --check` and `git diff --cached --check`: passed.
- Local visual inspection: 360px and 1440px screenshots at `/tmp/fuspi-hero-no-tab-360.png` and `/tmp/fuspi-hero-no-tab-1440.png`; no identity panel overlaps the hero, and header identity and controls fit.
- Read-only cross-review of the three-file product/test diff found no blockers. The identified mobile-width risk passed browser checks.

No backend/API/schema/migration/dependency/route/locale-content impact. No contract or dependency change requested. Build and the full 96-case shell suite were not rerun for this narrow removal; the prior refinement had passed both. No non-Chromium or assistive-technology matrix was run. Existing unrelated changes in package files and `skills-lock.json` remain untouched and uncommitted. No push, merge, or deployment performed.
