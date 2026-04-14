/**
 * TanStack Query hooks for chat channels and direct messages.
 *
 * useChannels: combined query for channels + DMs with section grouping.
 * useChannelDetail: single channel query.
 * useChannelMembers: channel member list query.
 * usePinnedMessages: pinned messages query.
 * useCreateChannel: mutation for creating channels.
 * useCreateDM: mutation for creating DMs.
 * useSearchMessages: query for searching messages in a channel.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'

import {
  getChannels,
  getDirectMessages,
  getChannelDetail,
  getChannelMembers,
  getPinnedMessages,
  createChannel,
  createDirectMessage,
  createGroupDM,
  searchMessages,
  updateChannel,
  leaveChannel,
  archiveChannel,
  addChannelMember,
  removeChannelMember,
  type ChannelItem,
  type ChannelMember,
  type MessageItem,
  type CreateChannelParams,
} from '@/repositories/chat'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANNELS_STALE_TIME = 60_000           // 60 seconds (polling fallback)
const CHANNELS_STALE_TIME_WS = 5 * 60_000   // 5 minutes (WS connected)
const CHANNELS_GC_TIME = 5 * 60_000          // 5 minutes
const CHANNEL_DETAIL_STALE_TIME = 30_000     // 30 seconds
const MEMBERS_STALE_TIME = 60_000            // 1 minute
const PINNED_STALE_TIME = 60_000             // 1 minute
const SEARCH_STALE_TIME = 10_000             // 10 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelListData {
  channels: ChannelItem[]
  directMessages: ChannelItem[]
}

// ---------------------------------------------------------------------------
// useChannels
// ---------------------------------------------------------------------------

/**
 * Fetch all channels and DMs, combined into a single query.
 * Sorted by last activity (most recent first).
 */
export function useChannels(): UseQueryResult<ChannelListData, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

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
    staleTime: wsConnected ? CHANNELS_STALE_TIME_WS : CHANNELS_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled: getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useChannelDetail
// ---------------------------------------------------------------------------

/**
 * Fetch a single channel or DM by ID.
 */
export function useChannelDetail(
  channelId: string | undefined
): UseQueryResult<ChannelItem | undefined, Error> {
  return useQuery<ChannelItem | undefined, Error>({
    queryKey: ['chat', 'channelDetail', channelId] as const,
    queryFn: () => getChannelDetail(channelId!),
    staleTime: CHANNEL_DETAIL_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled: channelId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useChannelMembers
// ---------------------------------------------------------------------------

/**
 * Fetch the member list for a channel.
 */
export function useChannelMembers(
  channelId: string | undefined
): UseQueryResult<ChannelMember[], Error> {
  return useQuery<ChannelMember[], Error>({
    queryKey: ['chat', 'channelMembers', channelId] as const,
    queryFn: () => getChannelMembers(channelId!),
    staleTime: MEMBERS_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled: channelId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// usePinnedMessages
// ---------------------------------------------------------------------------

/**
 * Fetch pinned messages for a channel.
 */
export function usePinnedMessages(
  channelId: string | undefined
): UseQueryResult<MessageItem[], Error> {
  return useQuery<MessageItem[], Error>({
    queryKey: ['chat', 'pinnedMessages', channelId] as const,
    queryFn: () => getPinnedMessages(channelId!),
    staleTime: PINNED_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled: channelId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useCreateChannel
// ---------------------------------------------------------------------------

/**
 * Mutation to create a new channel.
 */
export function useCreateChannel(): UseMutationResult<ChannelItem, Error, CreateChannelParams> {
  const queryClient = useQueryClient()

  return useMutation<ChannelItem, Error, CreateChannelParams>({
    mutationFn: (params) => createChannel(params),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateDM
// ---------------------------------------------------------------------------

interface CreateDMParams {
  memberIds: string[]
}

/**
 * Mutation to create a DM or group DM based on selection count.
 */
export function useCreateDM(): UseMutationResult<ChannelItem, Error, CreateDMParams> {
  const queryClient = useQueryClient()

  return useMutation<ChannelItem, Error, CreateDMParams>({
    mutationFn: (params) => {
      if (params.memberIds.length === 1) {
        return createDirectMessage(params.memberIds[0]!)
      }
      return createGroupDM(params.memberIds)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateChannel
// ---------------------------------------------------------------------------

interface UpdateChannelParams {
  channelId: string
  updates: { name?: string; description?: string }
}

/**
 * Mutation to update a channel's name/description.
 */
export function useUpdateChannel(): UseMutationResult<void, Error, UpdateChannelParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateChannelParams>({
    mutationFn: (params) => updateChannel(params.channelId, params.updates),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channelDetail', variables.channelId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useLeaveChannel
// ---------------------------------------------------------------------------

/**
 * Mutation to leave a channel.
 */
export function useLeaveChannel(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (channelId) => leaveChannel(channelId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useArchiveChannel
// ---------------------------------------------------------------------------

/**
 * Mutation to archive a channel.
 */
export function useArchiveChannel(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (channelId) => archiveChannel(channelId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useAddChannelMember
// ---------------------------------------------------------------------------

interface AddMemberParams {
  channelId: string
  memberId: string
}

export function useAddChannelMember(): UseMutationResult<void, Error, AddMemberParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, AddMemberParams>({
    mutationFn: (params) => addChannelMember(params.channelId, params.memberId),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channelMembers', variables.channelId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channelDetail', variables.channelId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useRemoveChannelMember
// ---------------------------------------------------------------------------

interface RemoveMemberParams {
  channelId: string
  memberId: string
}

export function useRemoveChannelMember(): UseMutationResult<void, Error, RemoveMemberParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, RemoveMemberParams>({
    mutationFn: (params) => removeChannelMember(params.channelId, params.memberId),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channelMembers', variables.channelId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channelDetail', variables.channelId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useSearchMessages
// ---------------------------------------------------------------------------

/**
 * Search messages within a channel by text content.
 */
export function useSearchMessages(
  channelId: string | undefined,
  query: string
): UseQueryResult<MessageItem[], Error> {
  return useQuery<MessageItem[], Error>({
    queryKey: ['chat', 'searchMessages', channelId, query] as const,
    queryFn: () => searchMessages(channelId!, query),
    staleTime: SEARCH_STALE_TIME,
    gcTime: CHANNELS_GC_TIME,
    enabled:
      channelId !== undefined &&
      query.trim().length >= 2 &&
      getClient() !== null,
  })
}
