---
id: M3-DEEPSEEK-POST-MUTATIONS-E2E
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 94ebc6b
allowed_paths:
  - "e2e/m3/admin-post-editor.spec.ts"
  - "coordination/handoffs/M3-DEEPSEEK-POST-MUTATIONS-E2E-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "playwright.config.ts"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-publication-actions.tsx"
  - "src/components/admin/posts/post-delete-action.tsx"
  - "src/components/admin/posts/post-cover-picker.tsx"
  - "src/components/admin/posts/post-rich-text-field.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-shell.tsx"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-PUBLICATION-ACTIONS
  - M3-CLAUDE-POST-DELETE
  - M3-CLAUDE-POST-COVER-PICKER
  - M3-CLAUDE-POST-RICH-TEXT
  - M3-CLAUDE-POST-AUTOSAVE
acceptance_commands:
  - npx tsc --noEmit
  - npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --workers=1
risk: high
token_class: M
status: ready
---

# M3 DeepSeek Post mutation E2E hardening

Close the M3 exit criterion "executable mutation browser evidence" for the mutation surfaces added
after the basic editor: **publication actions** (publish-now, schedule, return-to-draft, archive),
**delete** (confirm dialog + audit log), the **cover picker** (choose/clear), the **rich-text
editor** (toolbar → sanitized round-trip), and **30-second autosave** (shared-version proof). The
basic editor's 8 create/validate/conflict/ownership/RTL/disclosure cases already exist in this file
and stay untouched.

## Why EDITOR-A, not a new ADMIN

The RBAC matrix grants EDITOR `POST` `PUBLISH`, `SCHEDULE`, `DELETE` on **own** posts
(`src/lib/auth/permission-matrix.ts`). The existing `editorA` fixture therefore has publish and
delete capability on the posts it owns, so every new case reuses the current fixture, advisory lock,
and cleanup — no new shared user is created or deleted.

## Scope (added to `e2e/m3/admin-post-editor.spec.ts`)

1. **Publish now**: seed a DRAFT owned by A, open edit, click "Terbitkan sekarang", assert the DB row
   becomes `PUBLISHED` with `publishedAt <= now()` and `version` bumped; no technical code leaks.
2. **Schedule**: from a DRAFT, set a future `datetime-local`, click "Jadwalkan", assert `PUBLISHED`
   with `publishedAt > now()` (SCHEDULED display state); a past/empty time is rejected client-side
   with no request.
3. **Return to draft + archive**: from PUBLISHED, "Arsipkan" → `ARCHIVED`; from ARCHIVED,
   "Kembalikan ke draf" → `DRAFT`.
4. **Delete**: open the AlertDialog, confirm "Ya, hapus", assert the row is gone, an `ActivityLog`
   delete entry exists, and navigation returns to the list.
5. **Cover picker**: open the picker, choose the fixture image, save, assert `coverMediaId` set;
   re-open, clear, save, assert `coverMediaId` null.
6. **Rich-text round-trip**: type text, apply the "Tebal" (bold) toolbar action, save, assert the
   stored `content` contains `<strong>` after server sanitization (proves toolbar + sanitize path).
7. **Autosave shared version**: on an edit page, wait for one autosave (status → saved, version
   1→2), then perform a manual save and assert it succeeds with **no `VERSION_CONFLICT`** and the row
   is at version 3 — the load-bearing proof that the shell shares one version across autosave and
   manual save. Uses fake timers via `page.clock` or a shortened wait, not a real 30s sleep where
   possible.

## Verification

CI is authoritative (`workers: 1`, fresh container). Locally, run the single spec at `--workers=1`
only when the machine has memory headroom; the full `e2e/m3` directory is not runnable under memory
pressure (see `coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md`).

## Stand-in note

Authored by the Claude stand-in for DeepSeek during the 2026-07-23…07-29 usage-limit window
(ADR-0002). No independent review yet; DeepSeek and Codex must re-verify on return before this counts
toward the M3 exit gate.
