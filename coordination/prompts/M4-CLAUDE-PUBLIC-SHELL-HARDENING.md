# Prompt for Claude — M4 public shell hardening

Copy the block below into Claude Code.

```text
You are the Claude Experience writer for FUSPI M4. Work autonomously, but obey
AGENTS.md and the committed task manifest exactly.

Start safely:
1. Work only in /home/zhev/myproject/fuspi-claude.
2. Run `git status --short --branch`. If the worktree is dirty or contains
   unknown files, stop and report them; do not clean, reset, stash, or overwrite.
3. Run `git fetch origin --prune`.
4. Create/switch to your task branch from the M4 integration head:
   `git switch -c ai/claude/m4-public-shell-hardening origin/integration/m4-features`
   If that local branch already exists, verify its ancestry and use it only when
   it is clean and based on the same remote head; never force-reset it.
5. Verify:
   - `git rev-parse origin/integration/m4-features`
   - `git merge-base --is-ancestor a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0 HEAD`
   - the active lease for `M4-CLAUDE-PUBLIC-SHELL-HARDENING` exists in
     `coordination/ownership.yml`.

Read completely before editing:
- AGENTS.md
- docs/README.md
- docs/24-implementation-plan-multi-model.md (M4 and merge rules)
- coordination/tasks/M4-CLAUDE-PUBLIC-SHELL-HARDENING.md
- only the feature/Next.js references listed in that manifest

Implement only `M4-CLAUDE-PUBLIC-SHELL-HARDENING`. Stay inside allowed_paths.
Treat readonly_paths as context and forbidden_paths as untouchable. In
particular, do not change `src/components/public/nav-items.ts`, any shared
contract/config, global CSS, shadcn primitive, dependency, backend, schema,
route registry, task status, lease, or integration ref. Do not invent or
hard-code SILA or any other URL. Preserve FUSPI identity and the exact official
program order from `src/config/institution.ts`.

Use Server Components by default and the smallest Client Component boundary
needed for browser interactions. Implement all acceptance criteria, including
ID/EN/AR, Arabic RTL, keyboard/focus behavior, reduced motion, scroll state,
landmarks, axe, and the required viewports. Use logical direction utilities
only.

Run every acceptance_commands entry in the manifest exactly. A skipped,
interrupted, blocked, or failing command is not PASS. Fix only in-scope defects.
If a required fix needs an unleased/shared path, stop that portion and record a
precise GPT contract request.

Create
`coordination/handoffs/M4-CLAUDE-PUBLIC-SHELL-HARDENING-claude.md` using the
handoff template. Include task ID, branch, base SHA, implementation head SHA,
files changed, API/schema/migration impact, exact command results and test
counts, untested areas, risks, and contract requests.

Review `git diff --check`, scope, and `git status`; commit all task and handoff
files to your branch with a clear message. Do not merge, push to integration or
main, edit governance state, start another task, or mark yourself accepted.
Finish by reporting only the branch, commit SHA, commands/results, and risks.
```
