/**
 * Issue comments section.
 *
 * Fetches real activity messages for an issue, displays them in a list,
 * and provides a text input for composing new comments.
 */

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useComments, useCreateComment } from '@/hooks/useComments'
import { MarkupRenderer } from '@/components/features/MarkupRenderer'
import type { CommentItem } from '@/repositories/activity'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IssueCommentsProps {
  issueId: string
  projectId: string
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
  const date = new Date(ts)
  const now = Date.now()
  const diffMs = now - ts
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Extract a display name from a modifiedBy PersonId string.
 * PersonId may be something like "social:name:John Doe" -- we extract the
 * last segment. If it looks like an email or opaque ID, return a truncation.
 */
function formatAuthor(personId: string): string {
  if (!personId) return 'Unknown'
  // Try to extract name after last colon
  const parts = personId.split(':')
  const last = parts[parts.length - 1]
  if (last && last.length > 0) {
    // If it looks like an email, return the local part
    if (last.includes('@')) {
      return last.split('@')[0] ?? last
    }
    return last
  }
  return 'Unknown'
}

// ---------------------------------------------------------------------------
// Comment item
// ---------------------------------------------------------------------------

function CommentRow({ comment }: { comment: CommentItem }): React.ReactNode {
  const authorName = formatAuthor(comment.modifiedBy)
  const timestamp = formatTimestamp(comment.createdOn || comment.modifiedOn)

  return (
    <View className="bg-surface-secondary rounded-md p-3 mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="font-sans-medium text-xs text-content-secondary">
          {authorName}
        </Text>
        <Text className="font-sans text-xs text-content-tertiary">
          {timestamp}
        </Text>
      </View>
      <MarkupRenderer
        content={comment.message}
        accessibilityLabel={`Comment by ${authorName}`}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function IssueComments({ issueId, projectId, testID }: IssueCommentsProps): React.ReactNode {
  const { data: comments, isLoading, error } = useComments(issueId)
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
        Comments
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
            Failed to load comments
          </Text>
        </View>
      ) : comments != null && comments.length > 0 ? (
        /* Comments list */
        <View>
          {comments.map((comment) => (
            <CommentRow key={comment._id} comment={comment} />
          ))}
        </View>
      ) : (
        /* Empty state */
        <View className="items-center py-6">
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#77818B" />
          <Text className="font-sans text-sm text-content-tertiary mt-2">
            No comments yet
          </Text>
        </View>
      )}

      {/* Compose input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
      </KeyboardAvoidingView>
    </View>
  )
}

export { IssueComments }
export type { IssueCommentsProps }
