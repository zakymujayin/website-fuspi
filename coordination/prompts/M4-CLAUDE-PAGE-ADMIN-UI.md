# Prompt — M4 Claude Page admin UI

Work autonomously on `M4-CLAUDE-PAGE-ADMIN-UI` from the assigned
integration SHA. Read `AGENTS.md`, the complete task manifest, and only its
listed feature documents/context. Work solely in the Claude worktree and task
branch. Preserve unknown user changes and stop if the worktree is dirty.

Implement the complete visible Page admin list/create/edit experience exactly
within the manifest. The frozen backend interface is
`src/contracts/page-admin.ts`; use `/api/admin/pages` and
`/api/admin/pages/[pageId]`. GPT is implementing those endpoints concurrently,
so do not wait for or edit the backend. Do not introduce production mocks.

Run every acceptance command that is executable in the current environment.
Record exact results and any environment-only limitation without weakening
focused UI evidence. Create the required handoff, commit all allowed work, push
the Claude branch, and stop. Do not merge, change task/lease state, or open a
new review task. This is the production implementation, not a demo or prototype.
