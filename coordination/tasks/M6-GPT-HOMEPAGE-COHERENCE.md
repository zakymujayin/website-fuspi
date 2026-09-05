# M6-GPT-HOMEPAGE-COHERENCE

- Owner: GPT
- Branch: `ai/gpt/m6-homepage-coherence`
- Base SHA: `79345e5758f4f456f9ca8adaf129874111a51d69`
- Authority: coordinator-authorized workspace continuation; current brief explicitly requests targeted visual refinement, lecturer rail, and facility lightbox.
- Active lease / allowed paths: homepage-specific components and scoped styles in `src/components/public/`; `messages/{id,en,ar}.json` for new interaction labels only; related browser tests under `e2e/m4/`; this task's manifest, review, and handoff.
- Read-only: `docs/README.md`, `docs/24-implementation-plan-multi-model.md`; institutional/data contracts, existing public query/composer, UI primitives.
- Forbidden: backend, CMS, API, routes, navigation registry, dependencies, global tokens, UI primitives, header, hero, statistics markup, factual content, and other tasks/leases. CTA, news, and facility layouts are locked; presentation and requested gallery affordance may be refined.
- Existing package.json/package-lock.json/skills-lock.json changes remain excluded. Previous tasks are handed off; this is a new scoped refinement lease.

## Deliverables (10)

1. Connected homepage heading/CTA family.
2. Purposeful divider reduction.
3. Leadership portrait and real-message hierarchy.
4. Branded Quick Access interaction.
5. About/program-icon refinement and one restrained motif language.
6. Service index visual depth.
7. Navigable responsive lecturer rail and normalized portraits.
8. Academic feature/image/motion coherence without structure changes.
9. Balanced compact footer brand lockup, map preserved.
10. Accessible facility lightbox, regression coverage, visual review, and committed handoff.

## Acceptance commands

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test e2e/m4/homepage-curated-refinement.spec.ts e2e/m4/homepage-polish.spec.ts e2e/m4/homepage-coherence.spec.ts --project=chromium --workers=2
git diff --check
```

Review at 1440/1280/1024/768/390/360px and ID/EN/AR. Verify lightbox keyboard/focus/scroll restoration/reduced motion/lazy full-size rendering, lecturer navigation/native swipe, header/hero unchanged, no overflow, and compact footer. Autoplay on the lecturer rail is optional; prefer user-controlled navigation. No merge, push, or deployment inferred.
