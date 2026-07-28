# Independent Review — M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION — DeepSeek

- Review branch: `ai/deepseek/m3-media-focus-order-review`
- Coordination base: `origin/coordination/m3-deepseek-correction-reviews` (`f9acfc16642e523de4bbc81372c2f221b9eba56a`)
- Candidate: `origin/ai/gpt/m3-media-focus-order-correction` (`8b8b35d5ed3206fe01fa2c198376554746044010`)
- Verdict: **APPROVED**

## Findings by severity

### None (High/Critical)
No High or Critical findings.

### None (Medium)
No Medium findings.

### Low

1. **The focus indicator check on `outlineStyle` compares strings loosely** (`e2e/m3/admin-media-library-browse.spec.ts:655`)
   - `style.outlineStyle !== "none"` — some browsers report the default focus outline as `"auto"` (WebKit/Safari). Since the configured projects are `chromium` and `mobile` (Chromium-based Pixel 7), this is not a practical failure. If WebKit is added later, this assertion may need adjustment.

2. **The `boxShadow.includes("0 0 0 0")` heuristic rejects null-box-shadow** (`e2e/m3/admin-media-library-browse.spec.ts:656`)
   - A zero-radius box-shadow (`0 0 0 0`) correctly signals no visible focus ring. The check `!style.boxShadow.includes("0 0 0 0")` is reasonable but theoretically fragile if a focus ring uses a zero-offset non-zero-spread shadow. No such scenario exists in the current design system.

### Info

3. **The skip link locator pattern is intentionally permissive** (`e2e/m3/admin-media-library-browse.spec.ts:663`)
   - `#skip-link, [href='#main']` matches either an element with ID `skip-link` or any element linking to `#main`. Both patterns match the actual skip link. This is not a defect — it prevents test brittleness if the ID or href approach changes.

## Adversarial review results

### 1. Diff scope
- **Verified.** Only 2 files changed: `e2e/m3/admin-media-library-browse.spec.ts` and the GPT handoff. No product source, configuration, contract, schema, or dependency was modified. The candidate diff aligns with the GPT task lease (`allowed_paths` in `M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION`).

### 2. Explicit focus order sequence
- **Verified.** The test asserts focus in DOM order for each control:
  1. Skip link (`#skip-link, [href='#main']`)
  2. "Gambar" button (image policy toggle)
  3. "PDF" button (PDF policy toggle)
  4. "Berkas gambar" input (image file input)
  5. "Unggah" button (upload trigger)
  6. First media filter link (`nav[aria-label='Saring media berdasarkan jenis'] a`)
- Each step uses exactly one `page.keyboard.press("Tab")` followed by `expectVisibleFocusIndicator(locator)`.

### 3. Focus indicator proof uses computed visible styling
- **Verified.** The `expectVisibleFocusIndicator` helper:
  - Calls `await expect(locator).toBeFocused()` for explicit focus assertion.
  - Evaluates `getComputedStyle(element)` to check `outlineStyle !== "none" && outlineWidth > 0`.
  - Falls back to `boxShadow !== "none" && !boxShadow.includes("0 0 0 0")`.
  - These are computed properties, not CSS class names or hardcoded values.

### 4. No arbitrary Tab loop
- **Verified.** The sequence is linear. Only 5 Tab presses are used between skip link and first filter. No additional loop or repeat. After the last assertion, the test clears cookies and ends.

### 5. No count-only assertion
- **Verified.** Each of the 6 controls has its own individual `expectVisibleFocusIndicator()` call. No `expect(count)` or `.toBeGreaterThan()` assertion on focus positions.

### 6. No programmatic focus
- **Verified.** Focus is moved exclusively via `page.keyboard.press("Tab")`. There is no `element.focus()`, `page.focus()`, or `focus()` call in the diff.

### 7. Skip link not optional
- **Verified.** The old code had `if (await skipLink.isVisible().catch(() => false))` which made the skip link assertion optional. The new code unconditionally calls `expectVisibleFocusIndicator(skipLink)`. The test fails if the skip link is absent or not focused on first Tab.

### 8. Assertion not based on CSS class name
- **Verified.** `expectVisibleFocusIndicator` uses `getComputedStyle(element)` and checks numeric outline width and box shadow, not class name presence.

### 9. Locale, RTL, axe, filter, and viewport coverage preserved
- **Verified.** The full 84-test suite includes:
  - Locale coverage: ID (test 20/62), EN (test 21/63), AR with RTL (test 22/64, 23/65, 24/66)
  - Axe WCAG A/AA: tests 25-29, 67-71 (ID, AR, EDITOR, main+h1, keyboard focus)
  - Filter (ALL/IMAGE/PDF): tests 8-10, 50-52
  - Viewport (360/390/768/1024/1440): tests 30-39, 72-81 (ID + AR)
  - No change to any non-focus test was made.

## Acceptance command results

| Command | Result |
| --- | --- |
| `npm run lint` | PASS — 0 issues |
| `npx tsc --noEmit` | PASS — 0 errors |
| Playwright (chromium + mobile, 1 worker) | PASS — **84/84 tests** (42 chromium + 42 mobile) in 2.7 min |
| `git diff --check` | PASS — clean |

### Test categories (84 total)
- Session and redirect: 4 tests × 2 projects = 8
- ADMIN vs EDITOR ownership scoping: 3 × 2 = 6
- ALL/IMAGE/PDF filter: 3 × 2 = 6
- Pagination: 3 × 2 = 6
- Hostile query parameters: 2 × 2 = 4
- Display fields: 4 × 2 = 8
- Locale ID/EN/AR/RTL: 5 × 2 = 10
- Axe WCAG A/AA: 4 × 2 = 8 (includes updated focus order test)
- Viewport responsiveness: 10 × 2 = 20
- No PII/token disclosure: 2 × 2 = 4
- Empty/unavailable state: 2 × 2 = 4

### Environment
- Database: `fuspi_m3_media_library_qa_audit` (PostgreSQL, localhost, `fuspi_m3_qa` user)
- Upload directory: `/tmp/fuspi-deepseek/media-focus-review`
- `UPLOAD_PUBLIC_URL=/uploads`
- Dev server port: 3004
- `PLAYWRIGHT_BASE_URL=http://localhost:3004`

## Untested areas and residual risk

- The focus order test uses Indonesian accessible names (`"Gambar"`, `"PDF"`, `"Berkas gambar"`, `"Unggah"`) because it opens `/id/admin/media`. If the UI's Indonesian copy changes these labels, the test will fail on selector mismatch — deliberate and correct behavior.
- No WebKit/Safari engine coverage in the configured projects. The `outlineStyle` heuristic works for Chromium but may differ in Safari (`"auto"` vs `"solid"`).
- The test does not verify Tab focus beyond the first filter link. The remaining Tab order through filter tabs, media items, and pagination controls is covered implicitly by axe WCAG assertions which fail on keyboard traps.

## Non-committing merge status
- Candidate was merged with `git merge --no-commit --no-ff 8b8b35d5ed3206fe01fa2c198376554746044010` for evidence collection.
- After evidence collection, working tree was reset: `git checkout -- . && git reset HEAD -- . && git clean -fd`.
- No candidate source or test files are committed or present in the working tree.

## Confirmation
- Only review document (`coordination/reviews/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-deepseek.md`) and handoff document (`coordination/handoffs/M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-deepseek.md`) are committed.
- No merge to `integration/*` or `main` was performed.
- No candidate source was pushed from the DeepSeek review branch.
