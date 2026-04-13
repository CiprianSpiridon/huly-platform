/**
 * Local markup types for rich text rendering.
 *
 * Mirrors the MarkupNode model from @hcengineering/text-core
 * (foundations/core/packages/text-core/src/markup/model.ts)
 * without importing it, since text-core pulls in ProseMirror
 * and TipTap which Metro cannot resolve in React Native.
 *
 * Keep these definitions in sync with the upstream model.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum MarkupNodeType {
  doc = 'doc',
  paragraph = 'paragraph',
  blockquote = 'blockquote',
  horizontal_rule = 'horizontalRule',
  heading = 'heading',
  code_block = 'codeBlock',
  text = 'text',
  image = 'image',
  file = 'file',
  reference = 'reference',
  emoji = 'emoji',
  hard_break = 'hardBreak',
  ordered_list = 'orderedList',
  bullet_list = 'bulletList',
  list_item = 'listItem',
  taskList = 'taskList',
  taskItem = 'taskItem',
  todoList = 'todoList',
  todoItem = 'todoItem',
  subLink = 'subLink',
  table = 'table',
  table_row = 'tableRow',
  table_cell = 'tableCell',
  table_header = 'tableHeader',
  mermaid = 'mermaid',
  comment = 'comment',
  markdown = 'markdown',
  embed = 'embed',
}

export enum MarkupMarkType {
  link = 'link',
  em = 'italic',
  bold = 'bold',
  code = 'code',
  strike = 'strike',
  underline = 'underline',
  textColor = 'textColor',
  textStyle = 'textStyle',
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MarkupMark {
  type: MarkupMarkType
  attrs?: Record<string, string | number | boolean | null | undefined>
}

export type AttrValue = string | number | boolean | null | undefined
export type Attrs = Record<string, AttrValue>

export interface MarkupNode {
  type: MarkupNodeType
  content?: MarkupNode[]
  marks?: MarkupMark[]
  attrs?: Attrs
  text?: string
}

export interface ReferenceMarkupNode extends MarkupNode {
  type: MarkupNodeType.reference
  attrs: { id: string; label: string; objectclass: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create an empty document node (matches text-core emptyMarkupNode).
 */
export function emptyMarkupNode(): MarkupNode {
  return {
    type: MarkupNodeType.doc,
    content: [{ type: MarkupNodeType.paragraph, content: [] }],
  }
}

/**
 * Parse a markup string into a MarkupNode tree.
 *
 * Huly stores rich text as JSON-serialised MarkupNode trees. Older or
 * plain-text content may not be valid JSON, so this function falls back
 * to wrapping raw strings in a doc > paragraph > text structure.
 */
export function parseMarkup(raw: unknown): MarkupNode {
  if (raw == null || raw === '') {
    return emptyMarkupNode()
  }

  if (typeof raw === 'object') {
    // Already a parsed object (e.g. from API response)
    const node = raw as MarkupNode
    if (typeof node.type === 'string') {
      return node
    }
    return emptyMarkupNode()
  }

  if (typeof raw !== 'string') {
    return emptyMarkupNode()
  }

  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return emptyMarkupNode()
  }

  // Attempt JSON parse
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed != null && 'type' in parsed) {
        return parsed as MarkupNode
      }
    } catch {
      // Fall through to plain-text wrapping
    }
  }

  // Plain text fallback: wrap in doc > paragraph > text
  return {
    type: MarkupNodeType.doc,
    content: [
      {
        type: MarkupNodeType.paragraph,
        content: [{ type: MarkupNodeType.text, text: trimmed }],
      },
    ],
  }
}

/**
 * Type guard for reference nodes (mentions).
 */
export function isReferenceNode(node: MarkupNode): node is ReferenceMarkupNode {
  return (
    node.type === MarkupNodeType.reference &&
    node.attrs != null &&
    typeof node.attrs['id'] === 'string' &&
    typeof node.attrs['label'] === 'string' &&
    typeof node.attrs['objectclass'] === 'string'
  )
}
