# Multi-Model Coordination

No agent may start without one task manifest in `coordination/tasks/` and a non-overlapping path lease.

Workflow:

1. Coordinator creates task manifest from `tasks/TEMPLATE.md` and records `base_sha`.
2. Coordinator checks active leases in `ownership.yml` and assigns one writer, reviewer, and tester.
3. Writer creates a task branch in the model-specific worktree and changes only allowed paths.
4. Writer commits code and a handoff based on `handoffs/TEMPLATE.md`.
5. Reviewer comments; writer fixes. Coordinator updates task status and controls merge queue.

Important decisions that change a shared contract go into `adr/` before dependent implementation begins.
