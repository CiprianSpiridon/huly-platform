# Worktree Conventions

Use this reference when creating, selecting, or cleaning up worktrees.

## Lifecycle

Follow this general sequence:

1. discover current worktrees
2. create or select the right worktree
3. set up the workspace if needed
4. do the isolated merge or repair work
5. validate
6. clean up

## Branch And Path Conventions

Common ephemeral branch pattern:

- `worktree-<name>`

Common managed path pattern:

- `.claude/worktrees/<name>`

Common ad-hoc sibling path pattern:

- `../project--purpose`

Use the repo's existing convention if one already exists. Do not assume `.claude/worktrees/` is mandatory in every environment.

## Setup Conventions

Project-dependent setup may include:

- symlinked `node_modules`
- copied `.env` files
- package-manager install in the new worktree
- post-create bootstrap commands

Only run setup steps that match the actual project.

## Safety Rules

- always run `git worktree list` before creating a new worktree
- do not attempt to check out the same branch in two worktrees
- use `git worktree remove` for cleanup
- delete only ephemeral session branches automatically
- run `git worktree prune` after removals

## Useful Commands

- `git worktree list`
- `git worktree add <path> <branch>`
- `git worktree add -b <new-branch> <path> <start-point>`
- `git worktree remove <path>`
- `git worktree prune`
- `git rev-parse --show-toplevel`
- `git rev-parse --git-common-dir`

## Dirty Worktree Rule

If a worktree has uncommitted changes:

- do not force-remove it silently
- warn the user
- get explicit approval before force cleanup
