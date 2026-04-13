/**
 * Markup utility functions.
 *
 * Pure helpers for extracting plain text from MarkupNode trees.
 * No React, no side effects -- safe for use in lib/.
 */

import {
  MarkupNodeType,
  parseMarkup,
  type MarkupNode,
} from '@/types/markup'

// ---------------------------------------------------------------------------
// Plain text extraction
// ---------------------------------------------------------------------------

/**
 * Recursively extract plain text from a MarkupNode tree.
 *
 * Handles JSON strings, pre-parsed objects, and raw plain text.
 * Returns a single string with no markup.
 */
export function markupToPlainText(raw: unknown): string {
  const tree = parseMarkup(raw)
  return extractText(tree).trim()
}

function extractText(node: MarkupNode): string {
  // Text nodes carry the actual string content
  if (node.type === MarkupNodeType.text) {
    return node.text ?? ''
  }

  // Hard breaks become newlines
  if (node.type === MarkupNodeType.hard_break) {
    return '\n'
  }

  // Emoji nodes
  if (node.type === MarkupNodeType.emoji) {
    const emoji = node.attrs?.['emoji']
    return typeof emoji === 'string' ? emoji : ''
  }

  // Reference (mention) nodes
  if (node.type === MarkupNodeType.reference) {
    const label = node.attrs?.['label']
    return typeof label === 'string' && label.length > 0 ? `@${label}` : ''
  }

  // Horizontal rule
  if (node.type === MarkupNodeType.horizontal_rule) {
    return '\n---\n'
  }

  // Recurse into children
  if (node.content == null || node.content.length === 0) {
    return ''
  }

  const childTexts: string[] = []
  for (const child of node.content) {
    childTexts.push(extractText(child))
  }

  const joined = childTexts.join('')

  // Block-level nodes append a trailing newline for readability
  switch (node.type) {
    case MarkupNodeType.paragraph:
    case MarkupNodeType.heading:
    case MarkupNodeType.blockquote:
    case MarkupNodeType.code_block:
    case MarkupNodeType.list_item:
    case MarkupNodeType.taskItem:
    case MarkupNodeType.todoItem:
      return joined + '\n'
    default:
      return joined
  }
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Extract plain text from markup and truncate to a maximum length.
 *
 * Useful for channel row previews and notification summaries.
 * Replaces newlines with spaces for single-line display.
 */
export function truncateMarkupText(raw: unknown, maxLength: number = 60): string {
  const text = markupToPlainText(raw)
    .replace(/\n+/g, ' ')
    .trim()

  if (text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength).trimEnd() + '...'
}
