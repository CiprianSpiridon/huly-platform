/**
 * Global search hook.
 *
 * Uses searchFulltext to search across issues, channels, messages, and contacts.
 * Returns grouped results by category.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Class, Doc, Ref } from '@hcengineering/core'

import { getClient } from '@/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLOBAL_SEARCH_STALE_TIME = 10_000  // 10 seconds

/**
 * Class refs as plain strings to avoid value imports that pull in svelte.
 */
const SEARCH_CLASSES = {
  Issue: 'tracker:class:Issue' as Ref<Class<Doc>>,
  Channel: 'chunter:class:Channel' as Ref<Class<Doc>>,
  DirectMessage: 'chunter:class:DirectMessage' as Ref<Class<Doc>>,
  ChatMessage: 'chunter:class:ChatMessage' as Ref<Class<Doc>>,
  Person: 'contact:class:Person' as Ref<Class<Doc>>,
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlobalSearchCategory = 'issues' | 'channels' | 'messages' | 'contacts'

export interface GlobalSearchItem {
  id: string
  title: string
  subtitle?: string
  category: GlobalSearchCategory
  classRef: string
}

export interface GlobalSearchResults {
  issues: GlobalSearchItem[]
  channels: GlobalSearchItem[]
  messages: GlobalSearchItem[]
  contacts: GlobalSearchItem[]
  total: number
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGlobalSearch(
  query: string,
  limit: number = 30
): UseQueryResult<GlobalSearchResults, Error> {
  return useQuery<GlobalSearchResults, Error>({
    queryKey: ['global-search', query, limit],
    queryFn: async (): Promise<GlobalSearchResults> => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }

      const result = await client.searchFulltext(
        { query },
        { limit }
      )

      const issues: GlobalSearchItem[] = []
      const channels: GlobalSearchItem[] = []
      const messages: GlobalSearchItem[] = []
      const contacts: GlobalSearchItem[] = []

      for (const doc of result.docs) {
        const classRef = String(doc.doc?._class ?? '')
        const item: GlobalSearchItem = {
          id: doc.id,
          title: doc.title ?? doc.shortTitle ?? 'Untitled',
          subtitle: doc.shortTitle ?? doc.description,
          category: 'issues',
          classRef,
        }

        if (classRef.includes('tracker')) {
          item.category = 'issues'
          item.subtitle = doc.shortTitle ?? undefined
          issues.push(item)
        } else if (classRef.includes('Channel') || classRef.includes('DirectMessage')) {
          item.category = 'channels'
          channels.push(item)
        } else if (classRef.includes('ChatMessage') || classRef.includes('Message')) {
          item.category = 'messages'
          item.subtitle = doc.description ?? undefined
          messages.push(item)
        } else if (classRef.includes('contact') || classRef.includes('Person') || classRef.includes('Employee')) {
          item.category = 'contacts'
          contacts.push(item)
        } else {
          // Default bucket: issues (most common)
          issues.push(item)
        }
      }

      return {
        issues,
        channels,
        messages,
        contacts,
        total: issues.length + channels.length + messages.length + contacts.length,
      }
    },
    staleTime: GLOBAL_SEARCH_STALE_TIME,
    enabled: query.length >= 2 && getClient() !== null,
  })
}
