# Independent Review — M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION — DeepSeek (R2)

- Review branch: `ai/deepseek/m3-media-focus-order-review-r2`
- Coordination base: `f9acfc16642e523de4bbc81372c2f221b9eba56a`
- Candidate: `8b8b35d5ed3206fe01fa2c198376554746044010`
- Verdict: **APPROVED**

## Findings by severity

### None (High/Critical)
No High or Critical findings.

### None (Medium)
No Medium findings.

### Low

1. **Focus indicator `outlineStyle` comparison may differ in WebKit** (`e2e/m3/admin-media-library-browse.spec.ts:655`)
   - `style.outlineStyle !== "none"` — WebKit/Safari reports the default focus ring as `"auto"`. The configured Playwright projects are `chromium` and `mobile` (Chromium-based Pixel 7), so this is not a practical failure. A future WebKit project would need adjustment.

2. **`boxShadow.includes("0 0 0 0")` is a heuristic** (`e2e/m3/admin-media-library-browse.spec.ts:656`)
   - Rejects a zero-width zero-offset box-shadow as "no visible indicator". Theoretically fragile if a focus ring uses zero-offset with non-zero spread. No such scenario in the current design system.

### Info

3. **Skip link locator pattern is intentionally permissive** (`e2e/m3/admin-media-library-browse.spec.ts:663`)
   - `#skip-link, [href='#main']` — matches either element. Both patterns match the actual skip link. Prevents test brittleness.

## Adversarial review results

### 1. Diff scope
- **Verified.** 2 files changed: `e2e/m3/admin-media-library-browse.spec.ts` (focus order test) and the GPT handoff. No product source, configuration, contract, schema, or dependency changed.

### 2. Explicit focus order
- **Verified.** The test asserts 6 controls in DOM order:
  1. Skip link (`#skip-link, [href='#main']`)
  2. "Gambar" button
  3. "PDF" button
  4. "Berkas gambar" input
  5. "Unggah" button
  6. First media filter (`nav[aria-label='Saring media berdasarkan jenis'] a`)
- Each step uses one `page.keyboard.press("Tab")` + `expectVisibleFocusIndicator(locator)`.

### 3. Computed visible styling proof
- **Verified.** `expectVisibleFocusIndicator` uses `getComputedStyle(element)`:
  - `outlineStyle !== "none" && parseFloat(outlineWidth) > 0`
  - Falls back to `boxShadow !== "none" && !boxShadow.includes("0 0 0 0")`
  - No CSS class name check.

### 4. No arbitrary Tab loop
- Linear sequence. 5 Tab presses between skip link and first filter. No loop.

### 5. No count-only assertion
- Each control individually asserted. No `expect(count)`.

### 6. No programmatic focus
- Only `page.keyboard.press("Tab")`. No `element.focus()` calls.

### 7. Skip link not optional
- Removed the `if (await skipLink.isVisible())` conditional. Unconditional assertion.

### 8. Locale/RTL/axe/filter/viewport coverage preserved
- Full 84-test suite: locale 5 classes (ID/EN/AR/RTL/chevron), axe WCAG 4 classes, filter 3 classes, viewport 10 breakpoints (360/390/768/1024/1440 x ID+AR), plus session, ownership, pagination, hostile params, display fields, no-PII, empty state.

## Acceptance command results

| Command | Exit | Detail |
| --- | --- | --- |
| `npm run lint` | 0 | 0 issues |
| `npx tsc --noEmit` | 0 | 0 errors |
| Playwright (chromium + mobile, 1 worker) | 0 | **84/84 passed** in 2.1 min |
| `git diff --check` | 0 | clean |

### Isolated environment
- Database: `fuspi_test_r2_media_085928` (PostgreSQL, created 2026-07-29 085928 UTC+7, migrated from zero with 2 migrations, dropped after evidence)
- Upload root: `/tmp/fuspi-r2-media/upload`
- `UPLOAD_PUBLIC_URL=/uploads`
- Dev server: `localhost:3004`

## Untested areas and residual risk
- Only Chromium + mobile (Pixel 7) projects tested. No WebKit/Safari.
- Focus indicator heuristic works for Chromium-derivatives; Safari reports `outlineStyle: "auto"`.

## Structural proofs

| Check | Command | Result |
| --- | --- | --- |
| Single parent | `git log -1 --format=%P HEAD` | `f9acfc16642e523de4bbc81372c2f221b9eba56a` (exactly 1 SHA) |
| Only doc files | `git diff --name-only f9acfc16..HEAD` | 2 files, both in allowed_paths |
| Candidate NOT ancestor | `git merge-base --is-ancestor 8b8b35d5..HEAD` | Exit 1 (non-zero = PASSING) |

## Non-committing merge status
- Candidate merged with `git merge --no-commit --no-ff 8b8b35d5ed3206fe01fa2c198376554746044010`.
- `git merge --abort` executed after evidence collection.
- `git status --porcelain` confirms clean working tree.
- No `git checkout -- .`, `git reset`, or `git clean -fd` used.

## Confirmation
- Only review and handoff documents committed.
- Review branch has exactly one parent.
- Candidate is not an ancestor of the review branch.
- No merge to `integration/*` or `main`.
