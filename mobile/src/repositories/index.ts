/**
 * Repositories barrel.
 */

export { BaseRepository, RepositoryError, wrapRepositoryError } from './base'
export { getProjects, getIssues, getIssue, searchIssues } from './tracker'
export type { PaginatedResult, IssueFilters, IssueSort, IssueSearchResult } from './tracker'
export { getComments, createComment } from './activity'
export type { CommentItem } from './activity'
export {
  getChannels,
  getDirectMessages,
  getMessages,
  sendMessage,
  getThread,
  sendThreadReply,
  addReaction,
  removeReaction,
} from './chat'
export type {
  ChannelItem,
  MessageItem,
  ReactionInfo,
  CursorPaginatedResult,
} from './chat'
export { getProfile, getWorkspaceInfo, getWorkspaces, switchWorkspace } from './settings'
export type { UserProfile, WorkspaceDetails } from './settings'
export {
  getNotifications,
  getNotificationContexts,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  archiveAll,
  getUnreadCount,
} from './notification'
export type {
  NotificationFilterType,
  NotificationFilters as NotificationRepoFilters,
  NotificationPagination,
  NotificationItem,
  PaginatedNotifications,
} from './notification'
export { getMembers, getMember } from './members'
export type { MemberItem } from './members'
export { registerPushToken, deregisterPushToken } from './push'
export {
  uploadFile,
  downloadFile,
  downloadAndShare,
  getLocalFileSize,
  getAuthenticatedFileUrl,
  getAuthenticatedThumbnailUrl,
  getAuthenticatedFileSource,
  getAuthenticatedThumbnailSource,
} from './attachment'
export type { UploadResult, AttachmentMeta, AuthenticatedImageSource } from './attachment'
