# Handoff — M3-CLAUDE-MEDIA-BATCH-PDF-UPLOAD

- **Branch:** `ai/claude/m3-media-batch-pdf-upload`  •  **Base:** integration `50034ba`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Summary

Extends the single-image upload to the full contract: 1–20 images (CMS_IMAGE) with per-file
alt/decorative, or exactly one PDF (PUBLIC_PDF, no accessibility metadata). Same route, presentation
only. The single-image case is preserved as the 1-file case.

## Files

- `src/components/admin/media/media-upload.tsx` — policy toggle (Images / PDF); multi-file image
  input with one alt+decorative row per file and a remove control; single PDF input. Pure exported
  helpers: `validateImageBatch`, `validatePdf`, `buildImageBatchFormData`, `buildPdfFormData`,
  `uploadFailureKey`.
- `messages/{id,en,ar}.json` — reworked `AdminMediaUpload` (policy, images/pdf, per-file, count).
- `tests/m3/ui/admin-media-upload.test.tsx` — 18 tests.

## Verification

| Command | Result |
| --- | --- |
| `tsc` / `eslint` | exit 0 |
| `npm test` | **717 passed** |
| `npm run build` | Compiled successfully |

### Runtime (real browser + PostgreSQL)

- Two `sharp`-generated webp images with per-file alts → `{ok:true, policy:CMS_IMAGE, items:[2]}`;
  DB rows `image/webp alt="Gambar A"`, `image/webp alt="Gambar B"`. Two alt rows rendered.
- One minimal PDF (`%PDF-1.4`) → `{ok:true, policy:PUBLIC_PDF, items:[1]}`; DB row
  `application/pdf alt=""`.

Server stays the authority (magic bytes, per-file size, count). Client validation (type/size/count,
per-file alt, PDF no-alt) covered by unit tests.

## Note for the eventual E2E (DeepSeek)

Per-file alt inputs are labelled "Teks alternatif"; the decorative label contains that substring, so
use `getByLabel("Teks alternatif", { exact: true })` and `.nth(i)` per row.

## Out of scope / follow-ups

Drag-and-drop, edit-alt-after-upload, mixed image+PDF submit (contract forbids), webp conversion.

## Requested contract/dependency change

None.
