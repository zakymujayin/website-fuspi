# Handoff — M3-CLAUDE-MEDIA-UPLOAD

- **Branch:** `ai/claude/m3-media-upload`  •  **Base:** integration `d8a1136`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Summary

Single-image upload on the Media Library, completing the loop upload → picker → cover. Posts
multipart to the existing `POST /api/admin/media/upload` (CMS_IMAGE policy). Presentation only — no
server/contract/API change.

## Files

- `src/components/admin/media/media-upload.tsx` — client upload panel (webp file, alt, decorative
  toggle) plus pure, exported helpers: `validateImageUpload`, `buildImageUploadFormData`,
  `uploadFailureKey`.
- `src/app/[locale]/admin/media/page.tsx` — renders the panel above the grid.
- `messages/{id,en,ar}.json` — `AdminMediaUpload`.
- `tests/m3/ui/admin-media-upload.test.tsx` — 14 tests.

## Verification

| Command | Result |
| --- | --- |
| `tsc --noEmit` / `eslint` | exit 0 |
| `npm test` | **713 passed** (699 + 14) |
| `npm run build` | Compiled successfully |

### Runtime (real browser + PostgreSQL, single page — per manifest)

A valid 64×48 webp (generated via the project's `sharp`) uploaded through the panel:

```text
POST /api/admin/media/upload → 200 {"ok":true,"policy":"CMS_IMAGE","items":[{"index":0,"mediaId":"cms2op4aj…"}]}
success message shown; router.refresh() fired
DB row: image/webp PUBLIC alt="Gambar uji unggah" 64x48
```

Server decoded the image (sharp), stored PUBLIC, recorded dimensions. Client validation
(webp-only, ≤5 MB, alt required unless decorative) covered by unit tests; the server remains the
authority (magic bytes, `UPLOAD_FAILED`/`VALIDATION_FAILED`).

## Note for the eventual browser E2E (DeepSeek)

`getByLabel("Teks alternatif")` is **ambiguous** — the decorative checkbox label
"Gambar dekoratif (tanpa teks alternatif)" contains that substring. Use
`getByLabel("Teks alternatif", { exact: true })`. This is a test-locator concern only; the DOM
association (label[for] → input[id]) is correct.

## Out of scope / follow-ups

- Batch (multi-image) and PDF upload; drag-and-drop; edit-alt-after-upload; client webp conversion.
- A browser E2E for the upload flow (with a real webp fixture) is a natural DeepSeek follow-up.

## Requested contract/dependency change

None.
