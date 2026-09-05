# M6-GPT-HOMEPAGE-POLISH

- Owner: GPT
- Base: `4595aefdfdb4bd662f86d81833f8adefbfa2922b`
- Branch: `ai/gpt/m6-homepage-polish`
- Authority: continuation of the coordinator-authorized homepage work in this workspace; latest request explicitly locks the approved structure and permits visual refinements, search, identity tab, and carousel/reveal interaction.
- Active task scope: public homepage components and scoped CSS under `src/components/public/`; existing header search presentation; new presentation-only SVG icons; UI labels in `messages/{id,en,ar}.json`; related UI and browser tests; this task's review and handoff.
- Read-only: institutional contract, existing query/API implementations, public route composition, UI primitives, docs.
- Forbidden: backend, CMS, API, schema, routes, navigation registry, dependencies, env, global design tokens, invented institutional content.
- Existing `package.json`, `package-lock.json`, and `skills-lock.json` changes are excluded.
- Reference documents: `docs/README.md`, `docs/24-implementation-plan-multi-model.md`; latest user brief overrides conflicting design-skill prescriptions. Existing M6 refinement review is the visual baseline.
- Deliverables: preserve and inspect all 21 existing areas; implement requested visual/motion/header/search refinements; responsive and accessibility evidence; committed handoff.

## Acceptance

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test e2e/m4/homepage-curated-refinement.spec.ts e2e/m4/homepage-polish.spec.ts --project=chromium --workers=2
npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=2
git diff --check
```

Manual/browser review: 1440, 1280, 1024, 768, 390, 360px in ID/EN/AR; initial/sticky logo and identity tab; real search and error/empty states; testimonial pause, controls and reduced motion; once-only reveals; footer/map geometry; no horizontal overflow. No deployment or merge authorization is inferred.
