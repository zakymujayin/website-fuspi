# M6-GPT-HOMEPAGE-CURATED-REFINEMENT

- Owner: GPT
- Base: `7f6ac6941601ad84ad59894d43bfb8044aae55f5`
- Branch: `ai/gpt/m6-homepage-curated-refinement`
- Authority: coordinator explicitly instructed this session to ignore the prior worktree/lease blocker and start implementing the homepage brief. Existing uncommitted changes were preserved; the existing sticky-header correction is included in this task.
- Scope: incremental homepage and shared header/footer presentation, accessibility, responsive behavior, and verification. The user's final institutional design brief overrides conflicting skill prescriptions.
- Status: implemented; see committed handoff and visual review.

## Allowed paths

- The homepage section components under `src/components/public/`, including the existing video leaf and partner strip.
- `src/components/public/home-design.module.css`
- `src/components/public/identity-badges.tsx`
- `src/components/public/site-header.tsx`
- `src/components/public/site-footer.tsx`
- `src/components/public/shell/sticky-header.tsx`
- `tests/m4/ui/public-shell-hardening.test.tsx`
- `tests/m4/ui/public-home-video-section.test.tsx`
- `e2e/m4/public-shell-hardening.spec.ts`
- `e2e/m4/homepage-curated-refinement.spec.ts`
- This task record, its review, and its handoff.

## Boundaries

No edits to backend, CMS, queries, contracts, schema, dependencies, environment configuration, route composition, navigation registry, message catalogs, global tokens, or shared UI primitives. Reuse existing published content, local leadership portraits, program descriptions, and map destination. No synthetic photographs, new institutional facts, or external deployments.

## Acceptance commands

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=2
npx playwright test e2e/m4/homepage-curated-refinement.spec.ts --project=chromium --workers=2
git diff --check
```

Additional visual inspection: 1440, 1280, 1024, 768, 390, and 360 CSS pixels in ID/EN/AR; contrast checks at desktop and mobile; all 21 requested section/utility assessments in the review.
