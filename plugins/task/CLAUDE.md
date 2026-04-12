# @hcengineering/task

Base task framework. Defines task types, statuses, projects, and lifecycle. Extended by tracker, recruit, etc.

## RN Safety: Type-only

Depends on `@hcengineering/ui` → svelte. Use `import type` exclusively.

## Key Types

| Type | Purpose |
|------|---------|
| `Task` | Base task: kind, status, assignee, dueDate, number, rank |
| `TaskType` | Type descriptor with statuses and allowed transitions |
| `Project` | Base project type (TypedSpace) |
| `ProjectType` | Project type configuration |
| `DocWithRank` | Ranked document for ordering |
| `KanbanCard` | Kanban view card type |

## Dependencies

`core`, `platform`, `contact`, `notification`, `view`, `ui`, `rank`
