/**
 * Issue comments section with activity timeline.
 *
 * Shows user comments (with edit/delete via long-press) and system
 * activity messages (status changes, field updates) interspersed
 * in chronological order.
 */

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import {
  useActivityTimeline,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '@/hooks/useComments'
import { MarkupRenderer } from '@/components/features/MarkupRenderer'
import type { ActivityItem } from '@/repositories/activity'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IssueCommentsProps {
  issueId: string
  projectId: string
  /** The current user's PersonId for matching own comments. */
  currentUserId?: string
  testID?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a timestamp into a human-readable relative or absolute string.
 */
function formatTimestamp(ts: number): string {
  if (ts === 0) return ''
  const now = Date.now()
  const diffMs = now - ts
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(ts).toLocaleDateString()
}

/**
 * Extract a display name from a modifiedBy PersonId string.
 */
function formatAuthor(personId: string): string {
  if (!personId) return 'Unknown'
  const parts = personId.split(':')
  const last = parts[parts.length - 1]
  if (last && last.length > 0) {
    if (last.includes('@')) {
      return last.split('@')[0] ?? last
    }
    return last
  }
  return 'Unknown'
}

// ---------------------------------------------------------------------------
// Comment row with edit/delete
// ---------------------------------------------------------------------------

interface CommentRowProps {
  item: ActivityItem
  isOwnComment: boolean
  issueId: string
  projectId: string
}

function CommentRow({ item, isOwnComment, issueId, projectId }: CommentRowProps): React.ReactNode {
  const authorName = formatAuthor(item.modifiedBy)
  const timestamp = formatTimestamp(item.createdOn || item.modifiedOn)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.message)
  const updateComment = useUpdateComment()
  const deleteCommentMutation = useDeleteComment()

  const handleLongPress = useCallback(() => {
    if (!isOwnComment) return
    Alert.alert(
      'Comment Actions',
      undefined,
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditText(item.message)
            setIsEditing(true)
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Comment',
              'Are you sure you want to delete this comment?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteCommentMutation.mutate(
                      { commentId: item._id, issueId, projectId },
                      {
                        onError: (err) => {
                          Alert.alert('Delete failed', err.message)
                        },
                      }
                    )
                  },
                },
              ]
            )
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }, [isOwnComment, item, issueId, projectId, deleteCommentMutation])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim()
    if (trimmed.length === 0 || trimmed === item.message) {
      setIsEditing(false)
      return
    }
    updateComment.mutate(
      { commentId: item._id, issueId, projectId, message: trimmed },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err) => Alert.alert('Update failed', err.message),
      }
    )
  }, [editText, item, issueId, projectId, updateComment])

  if (isEditing) {
    return (
      <View className="bg-surface-secondary rounded-md p-3 mb-2 border border-accent-primary">
        <TextInput
          className="font-sans text-sm text-content-primary mb-2"
          value={editText}
          onChangeText={setEditText}
          multiline
          autoFocus
          accessibilityLabel="Edit comment"
        />
        <View className="flex-row justify-end gap-2">
          <Pressable
            className="px-3 py-1.5 min-h-[32px] items-center justify-center"
            onPress={() => setIsEditing(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
          >
            <Text className="font-sans-medium text-xs text-content-tertiary">Cancel</Text>
          </Pressable>
          <Pressable
            className="bg-accent-primary rounded-md px-3 py-1.5 min-h-[32px] items-center justify-center"
            onPress={handleSaveEdit}
            disabled={updateComment.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save comment"
          >
            {updateComment.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="font-sans-medium text-xs text-on-accent">Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <Pressable
      className="bg-surface-secondary rounded-md p-3 mb-2"
      onLongPress={handleLongPress}
      delayLongPress={400}
      accessibilityRole="text"
      accessibilityLabel={`Comment by ${authorName}: ${item.message}`}
      accessibilityHint={isOwnComment ? 'Long press for edit and delete options' : undefined}
    >
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-1">
          <Text className="font-sans-medium text-xs text-content-secondary">
            {authorName}
          </Text>
          {item.isEdited ? (
            <Text className="font-sans text-xs text-content-tertiary">(edited)</Text>
          ) : null}
        </View>
        <Text className="font-sans text-xs text-content-tertiary">
          {timestamp}
        </Text>
      </View>
      <MarkupRenderer
        content={item.message}
        accessibilityLabel={`Comment by ${authorName}`}
      />
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// System activity row
// ---------------------------------------------------------------------------

function SystemActivityRow({ item }: { item: ActivityItem }): React.ReactNode {
  const authorName = formatAuthor(item.modifiedBy)
  const timestamp = formatTimestamp(item.createdOn || item.modifiedOn)

  return (
    <View className="flex-row items-center gap-2 py-1.5 mb-1 px-1">
      <Ionicons name="git-commit-outline" size={14} color="#77818B" />
      <Text className="font-sans text-xs text-content-tertiary flex-1" numberOfLines={2}>
        <Text className="font-sans-medium">{authorName}</Text>
        {' '}{item.message}
      </Text>
      <Text className="font-sans text-xs text-content-tertiary">
        {timestamp}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function IssueComments({ issueId, projectId, currentUserId, testID }: IssueCommentsProps): React.ReactNode {
  const { data: timeline, isLoading, error } = useActivityTimeline(issueId)
  const createComment = useCreateComment()
  const [newComment, setNewComment] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = newComment.trim()
    if (trimmed.length === 0) return

    createComment.mutate(
      { issueId, projectId, message: trimmed },
      {
        onSuccess: () => {
          setNewComment('')
        },
        onError: (err) => {
          Alert.alert('Failed to send comment', err.message)
        },
      }
    )
  }, [newComment, issueId, projectId, createComment])

  return (
    <View className="px-4 py-3" testID={testID}>
      <Text
        className="font-sans-semibold text-sm text-content-secondary mb-3"
        accessibilityRole="header"
      >
        Activity
      </Text>

      {/* Loading state */}
      {isLoading ? (
        <View className="items-center py-6">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      ) : error != null ? (
        /* Error state */
        <View className="items-center py-6">
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
          <Text className="font-sans text-sm text-status-error mt-2">
            Failed to load activity
          </Text>
        </View>
      ) : timeline != null && timeline.length > 0 ? (
        /* Activity timeline */
        <View>
          {timeline.map((item) => {
            if (item.type === 'system') {
              return <SystemActivityRow key={item._id} item={item} />
            }
            const isOwn = currentUserId != null && item.modifiedBy.includes(currentUserId)
            return (
              <CommentRow
                key={item._id}
                item={item}
                isOwnComment={isOwn}
                issueId={issueId}
                projectId={projectId}
              />
            )
          })}
        </View>
      ) : (
        /* Empty state */
        <View className="items-center py-6">
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#77818B" />
          <Text className="font-sans text-sm text-content-tertiary mt-2">
            No activity yet
          </Text>
        </View>
      )}

      {/* Compose input */}
      <View className="flex-row items-end gap-2 mt-3">
        <TextInput
          className="flex-1 bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2.5 border border-border-primary min-h-[44px]"
          placeholder="Add a comment..."
          placeholderTextColor="#77818B"
          value={newComment}
          onChangeText={setNewComment}
          multiline
          accessibilityLabel="Comment input"
          accessibilityHint="Type your comment and press Send"
          editable={!createComment.isPending}
        />
        <Pressable
          className="bg-accent-primary rounded-md p-2.5 min-h-[44px] min-w-[44px] items-center justify-center"
          onPress={handleSend}
          disabled={newComment.trim().length === 0 || createComment.isPending}
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          accessibilityState={{ disabled: newComment.trim().length === 0 || createComment.isPending }}
        >
          {createComment.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  )
}

export { IssueComments }
export type { IssueCommentsProps }
