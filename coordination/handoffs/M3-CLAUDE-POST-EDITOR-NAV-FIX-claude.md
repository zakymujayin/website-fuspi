# Handoff — M3-CLAUDE-POST-EDITOR-NAV-FIX

- **Branch:** `ai/claude/m3-post-editor-nav-fix`  •  **Base:** integration head after the RSC fix
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Defect (found while re-running the editor QA)

After a successful save, the editor did **not** navigate to the post list. The API POST succeeded
(row written, `{"ok":true}`), but the browser stayed on `/id/admin/posts/new`.

Cause: `PostEditorForm` used `useRouter` from **`next/navigation`** and pushed `listHref =
"/admin/posts"`. The app sets `localePrefix: "always"`, so an unprefixed path does not resolve —
`router.push("/admin/posts")` did nothing useful. This is a second product defect in the editor,
distinct from the RSC crash.

## Fix

Switched the form to `useRouter` from **`@/i18n/navigation`** (the next-intl locale-aware router,
already used by `auth-language-switcher`). It prefixes the active locale automatically, so
`router.push("/admin/posts")` now navigates to `/id/admin/posts`. One import line; no other change.

## Verified in a real browser (PostgreSQL-backed)

```text
fill Indonesian fields → click "Simpan draf"
url after save: http://localhost:3004/id/admin/posts        (was: .../id/admin/posts/new)
```

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 669 passed |
| `npm run build` | PASS |

## Note

The two auth forms (`login-form`, `password-change-form`) use `next/navigation` + explicit
`/${locale}/…` paths — a different but valid pattern. This form now uses the i18n router instead, so
`listHref` stays semantic (`/admin/posts`) with no caller-side locale prefixing required.
