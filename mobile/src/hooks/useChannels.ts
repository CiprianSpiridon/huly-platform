/**
 * TanStack Query hook for chat channels and direct messages.
 *
 * useChannels: combined query for channels + DMs with section grouping.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { getChannels, getDirectMessages, type ChannelItem } from '@/repositories/chat'
import { getClient } from '@/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANNELS_STALE_TIME = 60_000   // 60 seconds
const CHANNELS_GC_TIME = 5 * 60_000 // 5 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelListData {
  channels: ChannelItem[]
  directMessages: ChannelItem[]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch all channels and DMs, combined into a single query.
 * Sorted by last activity (most recent first).
 */
export function useChannels(): UseQueryResult<ChannelListData, Error> {
  return useQuery<ChannelListData, Error>({
    queryKey: ['chat', 'channels'],
    queryFn: async () => {
      const [channels, directMessages] = await Promise.all([
        getChannels(),
        getDirectMessages(),
      ])

      // Sort both by last activity (most recent first)
      const sortByActivity = (a: ChannelItem, b: ChannelItem): number =>
        b.lastMessageTimestamp - a.lastMessageTimestamp || b.modifiedOn - a.modifiedOn

      return {
        channels: channels.sort(sortByActivity),
        directMessages: directMessages.sort(sortByActivity),
      }
    },
    staleTime: CHANNELS_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled: getClient() !== null,
  })
}
