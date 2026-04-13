/**
 * Pre-built test fixtures for common test scenarios.
 *
 * Unlike factories which generate unique data each call, fixtures are
 * stable data sets suitable for snapshot-style assertions.
 */

import type { ChannelItem, MessageItem, ReactionInfo } from '@/repositories/chat'
import type { NotificationItem, NotificationFilterType } from '@/repositories/notification'
import type { MockIssue, MockProject, MockAccount } from './factories'

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export const sampleReactions: ReactionInfo[] = [
  { emoji: '👍', count: 3, userIds: ['user-1', 'user-2', 'user-3'] },
  { emoji: '❤️', count: 1, userIds: ['user-2'] },
  { emoji: '🎉', count: 2, userIds: ['user-1', 'user-4'] },
]

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export const sampleIssue: MockIssue = {
  _id: 'issue-fixture-1',
  _class: 'tracker:class:Issue',
  space: 'project-fixture-1',
  title: 'Fix login page responsiveness',
  identifier: 'HULY-42',
  description: 'The login page breaks on narrow screens',
  status: 'status-in-progress',
  priority: 2,
  number: 42,
  assignee: 'user-fixture-1',
  component: null,
  milestone: null,
  estimation: 3600,
  remainingTime: 1800,
  reportedTime: 1800,
  kind: 'default',
  relations: [],
  childInfo: [],
  parents: [],
  dueDate: Date.now() + 7 * 86_400_000,
  rank: 'a',
  modifiedOn: 1700000000000,
  createdOn: 1699900000000,
  modifiedBy: 'user-fixture-1',
  createdBy: 'user-fixture-2',
  $lookup: {
    status: {
      _id: 'status-in-progress',
      name: 'In Progress',
      category: 'active',
    },
    assignee: {
      _id: 'user-fixture-1',
      name: 'Alice Smith',
    },
  },
}

export const sampleIssues: MockIssue[] = [
  sampleIssue,
  {
    ...sampleIssue,
    _id: 'issue-fixture-2',
    title: 'Add dark mode support',
    identifier: 'HULY-43',
    priority: 3,
    number: 43,
    assignee: null,
    status: 'status-todo',
  },
  {
    ...sampleIssue,
    _id: 'issue-fixture-3',
    title: 'Upgrade React Native to 0.84',
    identifier: 'HULY-44',
    priority: 1,
    number: 44,
    status: 'status-backlog',
  },
]

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const sampleProject: MockProject = {
  _id: 'project-fixture-1',
  _class: 'tracker:class:Project',
  name: 'Huly Mobile',
  description: 'Mobile app development',
  identifier: 'MOB',
  members: ['user-fixture-1', 'user-fixture-2'],
  modifiedOn: 1700000000000,
  createdOn: 1699000000000,
}

export const sampleProjects: MockProject[] = [
  sampleProject,
  {
    _id: 'project-fixture-2',
    _class: 'tracker:class:Project',
    name: 'Huly Web',
    description: 'Web app development',
    identifier: 'WEB',
    members: ['user-fixture-1'],
    modifiedOn: 1700000000000,
    createdOn: 1699000000000,
  },
]

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const sampleChannel: ChannelItem = {
  _id: 'channel-fixture-1',
  _class: 'chunter:class:Channel',
  name: 'general',
  description: 'General discussion',
  members: ['user-fixture-1', 'user-fixture-2', 'user-fixture-3'],
  lastMessage: 'Hey everyone!',
  lastMessageTimestamp: 1700000000000,
  space: 'channel-fixture-1',
  private: false,
  createdOn: 1699000000000,
  modifiedOn: 1700000000000,
}

export const sampleChannels: ChannelItem[] = [
  sampleChannel,
  {
    ...sampleChannel,
    _id: 'channel-fixture-2',
    name: 'dev',
    description: 'Developer chat',
    private: true,
    lastMessage: 'PR ready for review',
    lastMessageTimestamp: 1700000060000,
  },
]

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export const sampleMessage: MessageItem = {
  _id: 'msg-fixture-1',
  content: 'Hello, this is a test message',
  sender: 'user-fixture-1',
  senderName: 'Alice Smith',
  createdOn: 1700000000000,
  modifiedOn: 1700000000000,
  space: 'channel-fixture-1',
  reactions: sampleReactions,
  replyCount: 2,
  threadLastReply: 1700000060000,
  attachments: [],
}

export const sampleMessages: MessageItem[] = [
  sampleMessage,
  {
    _id: 'msg-fixture-2',
    content: 'This is a reply',
    sender: 'user-fixture-2',
    senderName: 'Bob Jones',
    createdOn: 1700000060000,
    modifiedOn: 1700000060000,
    space: 'channel-fixture-1',
    reactions: [],
    replyCount: 0,
    threadLastReply: 0,
    attachments: [],
  },
  {
    _id: 'msg-fixture-3',
    content: 'Message with attachment',
    sender: 'user-fixture-1',
    senderName: 'Alice Smith',
    createdOn: 1700000120000,
    modifiedOn: 1700000120000,
    space: 'channel-fixture-1',
    reactions: [],
    replyCount: 0,
    threadLastReply: 0,
    attachments: [
      {
        blobId: 'blob-1',
        name: 'screenshot.png',
        size: 128000,
        contentType: 'image/png',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const sampleNotification: NotificationItem = {
  _id: 'notif-fixture-1',
  _class: 'notification:class:ActivityInboxNotification',
  isViewed: false,
  archived: false,
  title: 'Issue updated',
  body: 'HULY-42 was moved to In Progress',
  objectId: 'issue-fixture-1',
  objectClass: 'tracker:class:Issue',
  createdOn: 1700000000000,
  modifiedOn: 1700000000000,
  modifiedBy: 'user-fixture-2',
  notificationType: 'updates' as NotificationFilterType,
}

export const sampleNotifications: NotificationItem[] = [
  sampleNotification,
  {
    ...sampleNotification,
    _id: 'notif-fixture-2',
    _class: 'notification:class:MentionInboxNotification',
    title: 'You were mentioned',
    body: '@Alice mentioned you in general',
    notificationType: 'mentions' as NotificationFilterType,
    isViewed: true,
  },
  {
    ...sampleNotification,
    _id: 'notif-fixture-3',
    _class: 'notification:class:ReactionInboxNotification',
    title: 'New reaction',
    body: 'Bob reacted with 👍',
    notificationType: 'reactions' as NotificationFilterType,
  },
]

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const sampleAccount: MockAccount = {
  _id: 'account-fixture-1',
  email: 'alice@huly.io',
  firstName: 'Alice',
  lastName: 'Smith',
  token: 'jwt-fixture-token',
  workspaces: ['workspace-fixture-1'],
}
