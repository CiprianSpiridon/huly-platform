/**
 * Minimal type declarations for expo-notifications.
 *
 * These declarations allow TypeScript compilation before the package
 * is installed via `rush install`. Once installed, the real types from
 * the package will take precedence.
 *
 * Remove this file after running `rush install` with expo-notifications
 * in the dependency tree.
 */

declare module 'expo-notifications' {
  export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

  export interface NotificationPermissionsStatus {
    status: PermissionStatus
    granted: boolean
    canAskAgain: boolean
  }

  export interface ExpoPushToken {
    data: string
    type: 'expo'
  }

  export interface NotificationContent {
    title: string | null
    body: string | null
    data: Record<string, unknown>
    sound: string | null
    badge: number | null
  }

  export interface NotificationRequest {
    identifier: string
    content: NotificationContent
  }

  export interface Notification {
    date: number
    request: NotificationRequest
  }

  export interface NotificationResponse {
    notification: Notification
    actionIdentifier: string
  }

  export interface Subscription {
    remove: () => void
  }

  export interface NotificationHandler {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert: boolean
      shouldPlaySound: boolean
      shouldSetBadge: boolean
      shouldShowBanner?: boolean
      shouldShowList?: boolean
    }>
  }

  export enum AndroidImportance {
    UNKNOWN = 0,
    UNSPECIFIED = 1,
    NONE = 2,
    MIN = 3,
    LOW = 4,
    DEFAULT = 5,
    HIGH = 6,
    MAX = 7,
  }

  export interface NotificationChannel {
    id: string
    name: string
    description?: string
    importance: AndroidImportance
    vibrationPattern?: number[]
    lightColor?: string
    sound?: string | null
  }

  export function setNotificationHandler(handler: NotificationHandler): void

  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>

  export function getExpoPushTokenAsync(options: {
    projectId: string
  }): Promise<ExpoPushToken>

  export function setNotificationChannelAsync(
    channelId: string,
    channel: Omit<NotificationChannel, 'id'>
  ): Promise<NotificationChannel | null>

  export function setBadgeCountAsync(count: number): Promise<boolean>
  export function getBadgeCountAsync(): Promise<number>

  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): Subscription

  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): Subscription

  export function removeNotificationSubscription(subscription: Subscription): void

  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>
}
