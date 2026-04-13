# Mobile Rich Text (Phase 10)

## Context

Replace plain-text rendering with proper MarkupNode tree rendering. Local type declarations (text-core blocked by Metro). Recursive RN renderer for headings, bold, lists, code, links, mentions. Basic rich text editor for issue descriptions.

## Tasks: 6 (TASK-001 through TASK-006)

Key tasks:
- Local MarkupNode type declarations
- MarkupRenderer component (recursive RN tree walker)
- Replace plain text in IssueDetail, MessageBubble, IssueComments
- markupToPlainText utility
- Basic rich text editor with toolbar
- Mention rendering and navigation

Critical path: TASK-001 → TASK-002 → TASK-003
