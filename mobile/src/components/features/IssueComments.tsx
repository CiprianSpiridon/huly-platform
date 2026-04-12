/**
 * Issue comments section.
 *
 * Placeholder component for displaying and adding comments on an issue.
 * Full implementation will come in the activity/chunter integration phase.
 */

import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface IssueCommentsProps {
  issueId: string
  commentCount?: number
  testID?: string
}

function IssueComments({ issueId: _issueId, commentCount = 0, testID }: IssueCommentsProps): React.ReactNode {
  return (
    <View className="px-4 py-3" testID={testID}>
      <Text className="font-sans-semibold text-sm text-content-secondary mb-3">
        Comments
      </Text>
      {commentCount > 0 ? (
        <View className="bg-surface-secondary rounded-md p-3">
          <Text className="font-sans text-sm text-content">
            {commentCount} comment{commentCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <View className="items-center py-6">
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#77818B" />
          <Text className="font-sans text-sm text-dark mt-2">
            No comments yet
          </Text>
        </View>
      )}
    </View>
  )
}

export { IssueComments }
export type { IssueCommentsProps }
