/**
 * Recursive rich-text renderer for Huly MarkupNode trees.
 *
 * Renders headings, bold, italic, strikethrough, underline, code,
 * blockquotes, code blocks, lists (bullet, ordered, task/todo),
 * horizontal rules, images, links, hard breaks, mentions, and emoji.
 *
 * All styling uses NativeWind className. Every interactive element
 * has an accessibilityLabel.
 */

import { memo } from 'react'
import { View, Text, Pressable, Linking } from 'react-native'
import { router, type Href } from 'expo-router'

import {
  MarkupNodeType,
  MarkupMarkType,
  parseMarkup,
  isReferenceNode,
  type MarkupNode,
  type MarkupMark,
} from '@/types/markup'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarkupRendererProps {
  /** Raw content: JSON string, plain text, or pre-parsed MarkupNode. */
  content: unknown
  /** Optional className applied to the outermost wrapper View. */
  className?: string
  /** Accessibility label prefix for the rendered content. */
  accessibilityLabel?: string
}

// ---------------------------------------------------------------------------
// Mark style resolution
// ---------------------------------------------------------------------------

interface ResolvedStyle {
  className: string
  linkHref: string | undefined
}

function resolveMarks(marks: MarkupMark[] | undefined): ResolvedStyle {
  let className = ''
  let linkHref: string | undefined

  if (marks == null || marks.length === 0) {
    return { className: '', linkHref: undefined }
  }

  for (const mark of marks) {
    switch (mark.type) {
      case MarkupMarkType.bold:
        className += ' font-sans-bold'
        break
      case MarkupMarkType.em:
        className += ' italic'
        break
      case MarkupMarkType.code:
        className += ' font-mono bg-surface-tertiary rounded px-1'
        break
      case MarkupMarkType.strike:
        className += ' line-through'
        break
      case MarkupMarkType.underline:
        className += ' underline'
        break
      case MarkupMarkType.link:
        className += ' text-accent-primary underline'
        linkHref = mark.attrs?.['href'] as string | undefined
        break
      default:
        break
    }
  }

  return { className: className.trim(), linkHref }
}

// ---------------------------------------------------------------------------
// Heading level to text size mapping
// ---------------------------------------------------------------------------

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-xl font-sans-bold text-content-primary',
  2: 'text-lg font-sans-bold text-content-primary',
  3: 'text-base font-sans-semibold text-content-primary',
  4: 'text-sm font-sans-semibold text-content-primary',
  5: 'text-sm font-sans-medium text-content-primary',
  6: 'text-xs font-sans-medium text-content-secondary',
}

// ---------------------------------------------------------------------------
// URL validation for external links
// ---------------------------------------------------------------------------

const ALLOWED_URL_SCHEMES = new Set(['https:', 'http:', 'mailto:'])

/**
 * Returns true if the URL uses an allowed scheme (https, http, mailto).
 * Blocks dangerous schemes like javascript:, tel:, file:, intent:, market:.
 *
 * Hermes does not ship a WHATWG-compliant `URL` constructor by default.
 * When it throws (either because the URL is malformed or because `URL` is
 * unavailable), we fall back to a conservative scheme-prefix check so
 * absolute links still work and the call site cannot crash.
 */
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_URL_SCHEMES.has(parsed.protocol)
  } catch {
    // Fall back to a prefix-based check when `new URL()` is unavailable or
    // the input is not parseable. Any string whose scheme is not in the
    // allow-list (including relative paths and dangerous schemes like
    // javascript: or file:) is rejected.
    const lower = url.trim().toLowerCase()
    return (
      lower.startsWith('https://') ||
      lower.startsWith('http://') ||
      lower.startsWith('mailto:')
    )
  }
}

// ---------------------------------------------------------------------------
// Node renderers
// ---------------------------------------------------------------------------

function RenderTextNode({ node }: { node: MarkupNode }): React.ReactNode {
  const { className, linkHref } = resolveMarks(node.marks)
  const baseClass = `font-sans text-sm text-content-primary ${className}`.trim()

  if (linkHref != null) {
    return (
      <Text
        className={baseClass}
        onPress={() => {
          if (isAllowedUrl(linkHref)) {
            void Linking.openURL(linkHref)
          }
        }}
        accessibilityRole="link"
        accessibilityLabel={`Link: ${node.text ?? linkHref}`}
      >
        {node.text ?? ''}
      </Text>
    )
  }

  return <Text className={baseClass}>{node.text ?? ''}</Text>
}

function RenderReferenceNode({ node }: { node: MarkupNode }): React.ReactNode {
  if (!isReferenceNode(node)) {
    return null
  }

  const { id, label, objectclass } = node.attrs
  const displayLabel = label.length > 0 ? label : id

  const handlePress = (): void => {
    // Navigate to the referenced object based on its class.
    // Cast to Href to satisfy expo-router typed routes (matches codebase convention).
    if (objectclass.includes('tracker') || objectclass.includes('Issue')) {
      router.push(`/(app)/tracker/issue/${id}` as Href)
    } else if (objectclass.includes('contact') || objectclass.includes('Person') || objectclass.includes('Member')) {
      // Person mentions -- no dedicated screen yet, no-op
    } else if (objectclass.includes('chunter') || objectclass.includes('Channel')) {
      router.push(`/(app)/chat/channel/${id}` as Href)
    }
  }

  return (
    <Text
      className="font-sans-medium text-sm text-accent-primary"
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={`Mention: ${displayLabel}`}
    >
      @{displayLabel}
    </Text>
  )
}

function RenderChildren({ nodes }: { nodes: MarkupNode[] | undefined }): React.ReactNode {
  if (nodes == null || nodes.length === 0) {
    return null
  }

  return (
    <>
      {nodes.map((child, index) => (
        <RenderNode key={`${child.type}-${index}`} node={child} />
      ))}
    </>
  )
}

function RenderNode({ node }: { node: MarkupNode }): React.ReactNode {
  switch (node.type) {
    case MarkupNodeType.doc:
      return <RenderChildren nodes={node.content} />

    case MarkupNodeType.paragraph:
      return (
        <Text className="font-sans text-sm text-content-primary mb-1.5 leading-5">
          <RenderChildren nodes={node.content} />
        </Text>
      )

    case MarkupNodeType.text:
      return <RenderTextNode node={node} />

    case MarkupNodeType.heading: {
      const level = typeof node.attrs?.['level'] === 'number' ? node.attrs['level'] : 1
      const headingClass = HEADING_CLASSES[level] ?? HEADING_CLASSES[3]
      return (
        <Text className={`${headingClass} mb-2 mt-3`} accessibilityRole="header">
          <RenderChildren nodes={node.content} />
        </Text>
      )
    }

    case MarkupNodeType.blockquote:
      return (
        <View className="border-l-2 border-accent-primary pl-3 my-1.5">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.code_block:
      return (
        <View className="bg-surface-tertiary rounded-md p-3 my-1.5">
          <Text className="font-mono text-xs text-content-primary leading-4">
            <RenderChildren nodes={node.content} />
          </Text>
        </View>
      )

    case MarkupNodeType.bullet_list:
      return (
        <View className="pl-4 my-1" accessibilityRole="list">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.ordered_list:
      return (
        <View className="pl-4 my-1" accessibilityRole="list">
          {node.content?.map((child, index) => (
            <RenderOrderedListItem key={`ol-${index}`} node={child} index={index} />
          ))}
        </View>
      )

    case MarkupNodeType.list_item:
      return (
        <View className="flex-row mb-0.5">
          <Text className="font-sans text-sm text-content-tertiary mr-2" accessibilityElementsHidden>
            {'\u2022'}
          </Text>
          <View className="flex-1">
            <RenderChildren nodes={node.content} />
          </View>
        </View>
      )

    case MarkupNodeType.taskList:
    case MarkupNodeType.todoList:
      return (
        <View className="pl-2 my-1" accessibilityRole="list">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.taskItem:
    case MarkupNodeType.todoItem: {
      const checked = node.attrs?.['checked'] === true
      return (
        <View className="flex-row items-start mb-0.5">
          <Text
            className={`font-sans text-sm mr-2 ${checked ? 'text-status-success' : 'text-content-tertiary'}`}
            accessibilityLabel={checked ? 'Completed' : 'Not completed'}
          >
            {checked ? '\u2611' : '\u2610'}
          </Text>
          <View className="flex-1">
            <RenderChildren nodes={node.content} />
          </View>
        </View>
      )
    }

    case MarkupNodeType.horizontal_rule:
      return <View className="h-px bg-border-primary my-3" />

    case MarkupNodeType.hard_break:
      return <Text>{'\n'}</Text>

    case MarkupNodeType.image: {
      const src = node.attrs?.['src'] as string | undefined
      const alt = (node.attrs?.['alt'] as string | undefined) ?? 'Image'
      if (src == null) return null
      return (
        <Pressable
          className="my-1.5"
          onPress={() => {
            if (isAllowedUrl(src)) {
              void Linking.openURL(src)
            }
          }}
          accessibilityRole="image"
          accessibilityLabel={alt}
        >
          <Text className="font-sans text-sm text-accent-primary underline">[{alt}]</Text>
        </Pressable>
      )
    }

    case MarkupNodeType.emoji: {
      const emoji = (node.attrs?.['emoji'] as string | undefined) ?? ''
      return (
        <Text accessibilityLabel={`Emoji: ${emoji}`}>{emoji}</Text>
      )
    }

    case MarkupNodeType.reference:
      return <RenderReferenceNode node={node} />

    case MarkupNodeType.table:
      return (
        <View className="my-2 border border-border-primary rounded-md overflow-hidden">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.table_row:
      return (
        <View className="flex-row border-b border-border-primary">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.table_cell:
      return (
        <View className="flex-1 p-2 border-r border-border-primary">
          <RenderChildren nodes={node.content} />
        </View>
      )

    case MarkupNodeType.table_header:
      return (
        <View className="flex-1 p-2 bg-surface-tertiary border-r border-border-primary">
          <Text className="font-sans-semibold text-xs text-content-primary">
            <RenderChildren nodes={node.content} />
          </Text>
        </View>
      )

    case MarkupNodeType.mermaid:
      return (
        <View className="bg-surface-tertiary rounded-md p-3 my-1.5">
          <Text className="font-sans text-xs text-content-tertiary italic">
            [Mermaid diagram -- not supported on mobile]
          </Text>
        </View>
      )

    default:
      // Render children for unknown types as a safe fallback
      if (node.content != null && node.content.length > 0) {
        return <RenderChildren nodes={node.content} />
      }
      return null
  }
}

function RenderOrderedListItem({
  node,
  index,
}: {
  node: MarkupNode
  index: number
}): React.ReactNode {
  return (
    <View className="flex-row mb-0.5">
      <Text className="font-sans text-sm text-content-tertiary mr-2 min-w-[16px]" accessibilityElementsHidden>
        {index + 1}.
      </Text>
      <View className="flex-1">
        <RenderChildren nodes={node.content} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

function MarkupRendererInner({
  content,
  className,
  accessibilityLabel,
}: MarkupRendererProps): React.ReactNode {
  const tree = parseMarkup(content)

  // Empty document check
  const isEmpty =
    tree.content == null ||
    tree.content.length === 0 ||
    (tree.content.length === 1 &&
      tree.content[0]?.type === MarkupNodeType.paragraph &&
      (tree.content[0].content == null || tree.content[0].content.length === 0))

  if (isEmpty) {
    return null
  }

  return (
    <View className={className} accessibilityLabel={accessibilityLabel}>
      <RenderNode node={tree} />
    </View>
  )
}

const MarkupRenderer = memo(MarkupRendererInner)

export { MarkupRenderer }
export type { MarkupRendererProps }
