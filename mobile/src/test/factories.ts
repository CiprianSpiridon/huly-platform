/**
 * Test data factories.
 *
 * Builder functions that produce typed mock data for unit tests.
 * Each factory accepts optional overrides and auto-increments IDs.
 */

import type { ChannelItem, MessageItem, ReactionInfo } from '@/repositories/chat'
import type { NotificationItem, NotificationFilterType } from '@/repositories/notification'

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

let issueCounter = 0
let projectCounter = 0
let channelCounter = 0
let messageCounter = 0
let notificationCounter = 0
let accountCounter = 0

export function resetCounters(): void {
  issueCounter = 0
  projectCounter = 0
  channelCounter = 0
  messageCounter = 0
  notificationCounter = 0
  accountCounter = 0
}

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

export interface MockIssue {
  _id: string
  _class: string
  space: string
  title: string
  identifier: string
  description: string
  status: string
  priority: number
  number: number
  assignee: string | null
  component: string | null
  milestone: string | null
  estimation: number
  remainingTime: number
  reportedTime: number
  kind: string
  relations: unknown[]
  childInfo: unknown[]
  parents: unknown[]
  dueDate: number | null
  rank: string
  modifiedOn: number
  createdOn: number
  modifiedBy: string
  createdBy: string
  $lookup?: Record<string, unknown>
}

export function buildIssue(overrides: Partial<MockIssue> = {}): MockIssue {
  issueCounter++
  return {
    _id: `issue-${issueCounter}`,
    _class: 'tracker:class:Issue',
    space: 'project-1',
    title: `Mock issue ${issueCounter}`,
    identifier: `HULY-${issueCounter}`,
    description: '',
    status: 'status-1',
    priority: 1,
    number: issueCounter,
    assignee: null,
    component: null,
    milestone: null,
    estimation: 0,
    remainingTime: 0,
    reportedTime: 0,
    kind: 'default',
    relations: [],
    childInfo: [],
    parents: [],
    dueDate: null,
    rank: '',
    modifiedOn: Date.now(),
    createdOn: Date.now(),
    modifiedBy: 'user-1',
    createdBy: 'user-1',
    ...overrides,
  }
}

export function buildIssueList(count: number, overrides?: Partial<MockIssue>): MockIssue[] {
  return Array.from({ length: count }, () => buildIssue(overrides))
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface MockProject {
  _id: string
  _class: string
  name: string
  description: string
  identifier: string
  members: string[]
  modifiedOn: number
  createdOn: number
}

export function buildProject(overrides: Partial<MockProject> = {}): MockProject {
  projectCounter++
  return {
    _id: `project-${projectCounter}`,
    _class: 'tracker:class:Project',
    name: `Project ${projectCounter}`,
    description: `Description for project ${projectCounter}`,
    identifier: `PRJ${projectCounter}`,
    members: ['user-1'],
    modifiedOn: Date.now(),
    createdOn: Date.now(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

export function buildChannel(overrides: Partial<ChannelItem> = {}): ChannelItem {
  channelCounter++
  return {
    _id: `channel-${channelCounter}`,
    _class: 'chunter:class:Channel',
    name: `Channel ${channelCounter}`,
    description: `Test channel ${channelCounter}`,
    members: ['user-1', 'user-2'],
    lastMessage: 'Hello world',
    lastMessageTimestamp: Date.now() - 60_000,
    space: `channel-${channelCounter}`,
    private: false,
    createdOn: Date.now() - 86_400_000,
    modifiedOn: Date.now() - 60_000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export function buildMessage(overrides: Partial<MessageItem> = {}): MessageItem {
  messageCounter++
  return {
    _id: `msg-${messageCounter}`,
    content: `Test message ${messageCounter}`,
    sender: 'user-1',
    senderName: 'Test User',
    createdOn: Date.now() - messageCounter * 1000,
    modifiedOn: Date.now() - messageCounter * 1000,
    space: 'channel-1',
    reactions: [],
    replyCount: 0,
    threadLastReply: 0,
    pinned: false,
    attachments: [],
    ...overrides,
  }
}

export function buildMessageWithReactions(
  reactions: ReactionInfo[],
  overrides?: Partial<MessageItem>
): MessageItem {
  return buildMessage({ reactions, ...overrides })
}

export function buildMessageList(count: number, overrides?: Partial<MessageItem>): MessageItem[] {
  return Array.from({ length: count }, () => buildMessage(overrides))
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export function buildNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  notificationCounter++
  return {
    _id: `notif-${notificationCounter}`,
    _class: 'notification:class:ActivityInboxNotification',
    isViewed: false,
    archived: false,
    title: `Notification ${notificationCounter}`,
    body: `Body of notification ${notificationCounter}`,
    objectId: `issue-${notificationCounter}`,
    objectClass: 'tracker:class:Issue',
    createdOn: Date.now() - notificationCounter * 60_000,
    modifiedOn: Date.now() - notificationCounter * 60_000,
    modifiedBy: 'user-2',
    notificationType: 'updates' as NotificationFilterType,
    ...overrides,
  }
}

export function buildNotificationList(
  count: number,
  overrides?: Partial<NotificationItem>
): NotificationItem[] {
  return Array.from({ length: count }, () => buildNotification(overrides))
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export interface MockAccount {
  _id: string
  email: string
  firstName: string
  lastName: string
  token: string
  workspaces: string[]
}

export function buildAccount(overrides: Partial<MockAccount> = {}): MockAccount {
  accountCounter++
  return {
    _id: `account-${accountCounter}`,
    email: `user${accountCounter}@huly.io`,
    firstName: `User`,
    lastName: `${accountCounter}`,
    token: `jwt-token-${accountCounter}`,
    workspaces: ['workspace-1'],
    ...overrides,
  }
}
