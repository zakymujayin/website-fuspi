# Handoff — M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT

- Task ID: `M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT`
- Branch: `ai/gpt/m3-media-upload-response-contract`
- Frozen assignment SHA: `0fa354c`
- Implementation SHA: `2647529`
- Final branch head: documentation commit containing this handoff; exact SHA reported after push

## Summary

Closed the frozen Media transport gap between multipart metadata that accepts up to 20 images and
the previous single-`mediaId` mutation response. The new strict batch response represents either
one fully committed ordered batch or one generic request-level failure.

## Files changed

- `src/contracts/media-admin.ts`
- `tests/m3/contracts/media-admin-transport-contract.test.ts`
- `coordination/handoffs/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT-gpt.md`

## Contract impact

- Added `AdminMediaUploadResponseSchema` and `AdminMediaUploadResponse`.
- Success contains only `ok`, the confirmed `CMS_IMAGE`/`PUBLIC_PDF` policy, and ordered
  `{index, mediaId}` items.
- CMS image batches contain 1–20 items; PDF batches contain exactly one item.
- Indexes must be contiguous from zero and ordered; Media IDs must be unique.
- Failure reuses the existing generic Media transport failure codes and cannot expose partial
  success, filename, storage metadata/state, checksum, uploader identity, technical cause, stack,
  or operational alert.
- Success now explicitly means the later runtime committed the entire request. Runtime must
  prevalidate all files and compensate earlier commits if a later persistence operation fails.

No API route, runtime, UI, Prisma schema/migration, dependency, environment, generated client, or
existing metadata/delete response was changed.

## Verification

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/contracts/media-admin-transport-contract.test.ts` | PASS — 15 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 523 passed; 71 database-gated skipped |
| `npm run prisma:validate` | PASS |
| `npm run build` | PASS — 23 routes/pages |
| `git diff --check` | PASS |

## Executable evidence

- Accepted 20 ordered unique image items and exactly one PDF item.
- Rejected empty/21-item images, multi-item PDFs, indexes that start after zero, gaps,
  out-of-order indexes, duplicate Media IDs, unknown keys, partial-success fields, paths,
  checksums, and storage keys.
- Preserved all prior Media admin contract tests.

## Residual risks and follow-up

- Runtime must implement all-or-nothing batch semantics across filesystem and PostgreSQL using
  explicit compensation because the two systems cannot share one atomic transaction.
- Uncertain compensation must use the existing fixed non-PII persistence-invariant disposition.
- Multipart body limits, file parsing, upload validation, list/update/delete, reference checks,
  CSRF, session revalidation, filesystem removal, and operational alert emission remain in the
  next GPT runtime task.

## Confirmation

- Only the three manifest-allowed files changed.
- No FUDA identity, domain, seed, metadata, or public copy was introduced.
- No merge or next runtime task was started on this branch.
