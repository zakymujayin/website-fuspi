---
id: M3-DEEPSEEK-POST-EDITOR-QA-LOCATOR-FIX
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: f94d258
allowed_paths:
  - "e2e/m3/admin-post-editor.spec.ts"
  - "coordination/reviews/M3-CLAUDE-POST-EDITOR-BASIC-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-EDITOR-QA-deepseek.md"
forbidden_paths:
  - ".env*"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
readonly_paths:
  - "AGENTS.md"
  - "src/components/admin/posts/post-editor-form.tsx"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile"
  - git diff --check
risk: medium
token_class: S
status: ready
---

# M3 Post editor QA — locator fix

The editor-page **product** crash you found (RSC boundary) is fixed and merged
(`M3-CLAUDE-POST-EDITOR-RSC-FIX`, integration @ `f94d258`). Your spec's cases 7 and 8 already
pass against the fix. Cases 1–6 now fail on a **spec bug**, not a product bug:

```text
strict mode violation: getByLabel('Judul') resolved to 3 elements
  1) getByRole('group', { name: 'Konten Bahasa Indonesia' }).getByLabel('Judul')
  2) getByRole('group', { name: 'Konten Bahasa Inggris' }).getByLabel('Judul')
  3) getByRole('group', { name: 'Konten Bahasa Arab(opsional)' }).getByLabel('Judul')
```

The editor renders three content-locale sections (id/en/ar), each with a "Judul"/"Ringkasan"/"Isi"
label. `fillIndonesianFields` targets `page.getByLabel("Judul")`, which is ambiguous.

## Required fix

Scope the Indonesian-content locators to the Indonesian fieldset, as Playwright itself suggests:

```ts
const idSection = page.getByRole("group", { name: "Konten Bahasa Indonesia" });
await idSection.getByLabel("Judul").fill(title);
await idSection.getByLabel("Ringkasan").fill(excerpt);
await idSection.getByLabel("Isi").fill(content);
// slug and featured live outside the locale sections; keep targeting them at page scope.
```

Apply the same scoping to any other case that fills or reads a locale field (VERSION_CONFLICT,
SLUG_CONFLICT, round-trip). The `role="alert"` assertion that resolved to 5 elements also needs
scoping — target the specific form-level alert or the field error you mean, not a bare
`[role="alert"]`.

The fieldset accessible names come from the frozen copy: "Konten Bahasa Indonesia",
"Konten Bahasa Inggris", "Konten Bahasa Arab". Do not change the product to make the test pass.

## Verification

`PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile`
must pass with **zero** failures, and the whole `e2e/m3/` directory must stay green. Paste raw
output. Do not APPROVE the editor while any case fails.

## Stand-in note

Codex and DeepSeek are out of usage limit (ADR-0002); the standing independence caveat applies.
