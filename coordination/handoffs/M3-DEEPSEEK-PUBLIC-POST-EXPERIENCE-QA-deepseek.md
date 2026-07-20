# Handoff — M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA (corrected v3)

- Task ID: `M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA`
- Branch: `ai/deepseek/m3-public-post-experience-qa`
- Base SHA: `dac98f8`
- Head SHA: b1c0916

## Summary

Third correction pass of the FUSPI Berita public reference slice QA. Fixed
parallel-safe fixtures, DATABASE_URL validation message, and completed coverage
per the manifest. Verdict: **REQUEST_CHANGES** — one reproducible WCAG 2.1 AA
color-contrast violation (`text-slate-400` in sidebar `<time>` elements)
remains.

## Correction Pass Changes

1. **Parallel-safe fixtures**: Marker uses `randomUUID()` instead of
   `process.pid + Date.now()`. Describe configured as `serial`. All list
   page assertions scoped to slug-specific selectors to avoid cross-project
   title collisions in parallel `--project=chromium --project=mobile` runs.

2. **DATABASE_URL validation**: Error message no longer prints protocol or
   hostname.

3. **Coverage completions**:
   - Repeated page: `?page=3&page=1` duplicate-key normalization
   - Hostile page: `<script>alert(1)</script>`, `1' OR '1'='1`,
     `../../../etc/passwd`
   - AR fallback: checks title, excerpt (in JSON-LD), breadcrumb, cover caption,
     and content — all with `lang=id dir=ltr` inside RTL document
   - Detail structure: exactly one `main`, exactly one `h1`,
     keyboard-focusable visible links
   - Added coverMediaId to ID-only post to enable visible caption check

## Acceptance Commands

| Command | Result |
|---------|--------|
| `npx playwright test e2e/m3/public-post-experience.spec.ts --project=chromium` | 21 passed, 1 failed (WCAG color-contrast) |
| `npx playwright test e2e/m3/public-post-experience.spec.ts --project=chromium --project=mobile` | 36 passed, 1 failed (WCAG color-contrast) |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 487 passed, 0 failed |
| `npm run test:integration` | 0 passed, 0 failed, 69 skipped (platform DB not configured) |
| `git diff --check` | PASS |
| Scope check | PASS — 3 files within lease |

### Axe failure detail

```
Element: <time datetime="..." class="text-xs text-slate-400">15 Juli 2025</time>
Foreground: #90a1b9, Background: #ffffff, Ratio: 2.63:1 (required: 4.5:1)
Location: PostSidebarLatest date labels in Berita detail sidebar
Source: src/components/public/post/post-sidebar-latest.tsx
```

The violation is in the product's sidebar component where `text-slate-400` is
used for date labels. This is a real WCAG 2.1 AA (1.4.3) defect.

## Findings

**Product defects (1)**:
- WCAG color-contrast: `text-slate-400` on white in sidebar `<time>` elements
  (contrast ratio 2.63:1, required 4.5:1).

**QA fixture**:
- Parallel-safe with `randomUUID()` marker, `serial` describe, slug-scoped
  assertions. Cleanup via tracked ID arrays only. No global LIKE or wildcard
  deletes.

## Confirmation

- No product source, test, schema, contract, dependency, or config files modified
- No merge to integration/* or main performed
- Only `allowed_paths` files changed (spec, review, handoff)
