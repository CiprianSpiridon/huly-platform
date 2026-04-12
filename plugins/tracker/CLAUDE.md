# @hcengineering/tracker

Issue tracking and project management types. Issues, projects, milestones, components, time reporting.

## RN Safety: Type-only

Depends on `@hcengineering/ui` which depends on `svelte`. Use `import type` exclusively.

```typescript
// SAFE
import type { Issue, IssuePriority, Project, IssueStatus } from '@hcengineering/tracker'

// BREAKS — pulls in svelte via @hcengineering/ui
import { IssuePriority } from '@hcengineering/tracker'
```

## Key Types

| Type | Purpose |
|------|---------|
| `Issue` | Core issue — title, description, status, priority, assignee, estimation |
| `IssueStatus` | Status reference (extends core Status) |
| `IssuePriority` | Enum: NoPriority, Urgent, High, Medium, Low |
| `Project` | Workspace project with identifier, sequence, defaults |
| `Component` | Project component with label, lead |
| `Milestone` | Milestone with status, target date |
| `TimeSpendReport` | Time entry: employee, date, hours |
| `IssueTemplate` | Reusable issue template |
| `IssueParentInfo` | Lightweight parent reference |
| `RelatedIssueTarget` | Issue relation/blocker |

## Dependencies

`core`, `platform`, `contact`, `task`, `view`, `ui`, `attachment`, `time`, `tags`, `preference`, `lexorank`
