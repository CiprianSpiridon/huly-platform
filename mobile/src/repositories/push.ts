/**
 * Push token registration repository.
 *
 * Creates PushSubscription docs in the Huly platform to register
 * the device's Expo Push Token with the backend.
 *
 * The PushSubscription doc uses sentinel keys {p256dh: 'expo', auth: 'expo'}
 * so the server can detect Expo tokens and route them through the Expo
 * Push Service (APNs/FCM) instead of Web Push (VAPID).
 *
 * All class refs are plain strings to avoid value imports from plugin
 * packages that depend on svelte.
 *
 * TODO(TASK-006): Server-side Expo push endpoint not yet implemented.
 * The mobile side registers tokens correctly, but push delivery requires
 * adding an Expo Push Service integration to services/notification/pod-notification/.
 * See .ulpi/plans/mobile-push.json TASK-006 for the specification.
 */

import {
  TxFactory,
  generateId,
  type Class,
  type Doc,
  type Ref,
  type Space,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { RepositoryError, wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOMAIN = 'push'

/**
 * Class ref for PushSubscription -- plain string to avoid svelte imports.
 */
const PUSH_SUBSCRIPTION_CLASS = 'notification:class:PushSubscription' as Ref<Class<Doc>>

/**
 * The notification module space.
 */
const NOTIFICATION_SPACE = 'notification:space:Notifications' as Ref<Space>

/**
 * Sentinel values to mark this as an Expo push subscription.
 * The server checks for these to route through Expo Push Service
 * instead of Web Push (VAPID).
 */
const EXPO_SENTINEL = {
  p256dh: 'expo',
  auth: 'expo',
} as const

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register an Expo Push Token with the Huly backend.
 *
 * Creates a PushSubscription doc with the token as the endpoint.
 * Uses sentinel keys so the server can distinguish Expo tokens from
 * Web Push subscriptions.
 *
 * Checks for an existing subscription with the same endpoint to
 * prevent duplicates.
 */
export async function registerPushToken(expoPushToken: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'registerPushToken')
  }

  try {
    // Check for existing subscription with same endpoint to prevent duplicates
    const existing = await client.findOne(
      PUSH_SUBSCRIPTION_CLASS,
      { endpoint: expoPushToken } as Record<string, unknown>
    )

    if (existing != null) {
      // Already registered -- no action needed
      return
    }

    // Create the PushSubscription doc
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const docId = generateId()

    const tx = factory.createTxCreateDoc(
      PUSH_SUBSCRIPTION_CLASS,
      NOTIFICATION_SPACE,
      {
        endpoint: expoPushToken,
        keys: EXPO_SENTINEL,
      } as Record<string, unknown>,
      docId
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'registerPushToken', error)
  }
}

/**
 * Deregister an Expo Push Token from the Huly backend.
 *
 * Finds and removes the PushSubscription doc for this endpoint.
 */
export async function deregisterPushToken(expoPushToken: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    // Not connected -- nothing to deregister
    return
  }

  try {
    const existing = await client.findOne(
      PUSH_SUBSCRIPTION_CLASS,
      { endpoint: expoPushToken } as Record<string, unknown>
    )

    if (existing == null) {
      // Nothing to remove
      return
    }

    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxRemoveDoc(
      existing._class as Ref<Class<Doc>>,
      existing.space,
      existing._id
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deregisterPushToken', error)
  }
}
