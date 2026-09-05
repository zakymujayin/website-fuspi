# M6-GPT-HERO-TAB-REMOVAL

- Owner: GPT
- Branch: `ai/gpt/m6-homepage-polish`
- Base: `bf4fe9b` (completed homepage-polish handoff)
- Authority: user correction explicitly removes the identity panel extending into the Hero; continuation in the coordinator-authorized workspace.
- Active scope: `src/components/public/hero-slider.tsx`, `src/components/public/home-design.module.css`, `e2e/m4/homepage-polish.spec.ts`, this manifest and `coordination/handoffs/M6-GPT-HERO-TAB-REMOVAL-gpt.md`.
- Read-only: existing homepage/header implementation, institution contract, `docs/README.md`, `docs/24-implementation-plan-multi-model.md`.
- Forbidden: all other product files, backend, CMS, API, routes, content, dependencies, and existing unrelated package/skill-lock changes.
- Acceptance: remove the tab and its exclusive CSS; retain header brand visibility, Search, hero content, and all other refinements; verify ID/EN/AR desktop/mobile without overflow.

```sh
npm run lint
npm run typecheck
npm run test
npx playwright test e2e/m4/homepage-polish.spec.ts --project=chromium --workers=2
git diff --check
```
