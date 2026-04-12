# Merge Playbook

Use this reference when performing merges, recovering from bad worktree state, or cleaning up stale worktrees.

## Standard Merge Flow

1. create or enter the target worktree
2. create a backup tag when appropriate
3. merge or rebase the requested branch
4. inspect conflicted files if any
5. resolve carefully
6. validate build/test/typecheck
7. push or integrate only after validation
8. clean up worktree and ephemeral branches

## Conflict Tiers

### Tier 1: Mechanical

- whitespace-only conflicts
- import ordering
- generated files
- lockfiles

Prefer regeneration over hand-merging generated artifacts and lockfiles.

### Tier 2: Semantic

- both sides changed real logic
- call sites or data flow changed
- shared file needs a merged intent

Read both sides fully and merge intent, not just text.

### Tier 3: Escalate Or Recreate

Use this when:

- the conflict reflects an architectural disagreement
- domain knowledge is missing
- the worktree state is easier to recreate than repair

Preferred recovery:

- `git merge --abort`
- remove the bad worktree if needed
- recreate it cleanly
- retry with a better strategy

## Lockfile Handling

When a lockfile conflicts:

- do not hand-edit it
- pick the intended side or regenerate it through the package manager
- re-add the regenerated file after install/update

## Stale Worktree Cleanup

If `git worktree list` references missing directories:

1. run `git worktree prune --dry-run`
2. inspect what will be removed
3. run `git worktree prune`
4. remove orphaned ephemeral branches only after verifying they are unused

## Final Verification

Before declaring success:

- `git status` is clean or intentionally dirty for known reasons
- no unresolved conflicts remain
- validation commands passed or the user explicitly accepted failures
- main working tree remains untouched if isolation was requested
- `git worktree list` shows the expected final state
