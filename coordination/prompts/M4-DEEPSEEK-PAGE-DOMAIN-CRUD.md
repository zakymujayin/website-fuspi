# Prompt for DeepSeek — M4 Page domain CRUD

Copy the block below into DeepSeek.

```text
You are the DeepSeek Delivery writer for FUSPI M4. Work autonomously, but obey
AGENTS.md and the committed task manifest exactly.

Start safely:
1. Work only in /home/zhev/myproject/fuspi-deepseek.
2. Run `git status --short --branch`. If the worktree is dirty or contains
   unknown files, stop and report them; do not clean, reset, stash, or overwrite.
3. Run `git fetch origin --prune`.
4. Create/switch to your task branch from the M4 integration head:
   `git switch -c ai/deepseek/m4-page-domain-crud origin/integration/m4-features`
   If that local branch already exists, verify its ancestry and use it only when
   it is clean and based on the same remote head; never force-reset it.
5. Verify:
   - `git rev-parse origin/integration/m4-features`
   - `git merge-base --is-ancestor a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0 HEAD`
   - the active lease for `M4-DEEPSEEK-PAGE-DOMAIN-CRUD` exists in
     `coordination/ownership.yml`.

Read completely before editing:
- AGENTS.md
- docs/README.md
- docs/24-implementation-plan-multi-model.md (M4 and merge rules)
- coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md
- only the feature references and frozen code contracts listed in that manifest

Implement only `M4-DEEPSEEK-PAGE-DOMAIN-CRUD`. Stay inside allowed_paths.
Treat readonly_paths as context and forbidden_paths as untouchable. This task is
the Page domain service/query/mutation layer and its tests only: no admin/public
route, UI, messages, shared contract, schema/migration, dependency, auth,
security primitive, root config, task status, lease, or integration ref change.

Follow the accepted M3 Post pattern without copying assumptions that do not fit
Page. Enforce ADMIN authorization server-side at every entry point, strict Zod
validation, one transaction for parent plus translations, ID mandatory with
optional EN/AR, XSS sanitization, public hero-media enforcement, hierarchy cycle
protection, optimistic locking, revision/activity evidence, bounded queries,
UTC storage, and non-technical failure results. Use synthetic neutral fixtures;
do not invent FUSPI people, statistics, claims, contacts, or content.

Run every acceptance_commands entry in the manifest exactly. Use an isolated
test database and refuse production/staging URLs. A skipped, interrupted,
blocked, or failing command is not PASS. Fix only in-scope defects. If the
frozen schema or shared primitive is insufficient, do not work around it:
record the exact GPT-owned contract request and stop that portion.

Create `coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md` using
the handoff template. Include task ID, branch, base SHA, implementation head
SHA, files changed, API/schema/migration impact, exact command results and test
counts, untested areas, risks, and contract requests.

Review `git diff --check`, scope, and `git status`; commit all task and handoff
files to your branch with a clear message. Do not merge, push to integration or
main, edit governance state, start another task, or mark yourself accepted.
Finish by reporting only the branch, commit SHA, commands/results, and risks.
```
