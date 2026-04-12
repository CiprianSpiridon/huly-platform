/**
 * Huly REST API client singleton.
 *
 * Wraps `RestClient` from `@hcengineering/api-client` to provide typed
 * CRUD operations against the Huly platform. Uses the REST transport
 * exclusively -- no WebSocket, no client-resources (those are blocked
 * by the Metro resolver).
 *
 * The barrel import from `@hcengineering/api-client` pulls in transitive
 * deps like text, client-resources, ws, etc. Those resolve to empty modules
 * via the Metro blocklist in `metro.config.js`. Only the REST path is
 * actually used at runtime.
 */

import {
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Space,
  type TxResult,
  type WithLookup,
} from '@hcengineering/core'
import type { Data, DocumentUpdate } from '@hcengineering/core'
import { createRestClient } from '@hcengineering/api-client'
import type { RestClient } from '@hcengineering/api-client'

/**
 * High-level wrapper around the Huly REST client.
 *
 * Mobile code should use this class instead of accessing RestClient directly.
 * It loads the model on connect and provides typed convenience methods.
 */
export class HulyClient {
  private hierarchy: Hierarchy | null = null
  private model: ModelDb | null = null

  private constructor (private readonly rest: RestClient) {}

  /**
   * Factory: create a REST client, load the model, and return a ready-to-use
   * HulyClient instance.
   */
  static async connect (
    endpoint: string,
    workspaceId: string,
    token: string
  ): Promise<HulyClient> {
    const rest = createRestClient(endpoint, workspaceId, token)
    const client = new HulyClient(rest)

    // Pre-load model so hierarchy/model are available synchronously later
    const { hierarchy, model } = await rest.getModel()
    client.hierarchy = hierarchy
    client.model = model

    return client
  }

  // ---- Queries ----

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.rest.findAll(_class, query, options)
  }

  async findOne<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.rest.findOne(_class, query, options)
  }

  // ---- Mutations (via tx endpoint) ----

  async tx (tx: Parameters<RestClient['tx']>[0]): Promise<TxResult> {
    return await this.rest.tx(tx)
  }

  // ---- Search ----

  async searchFulltext (
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    return await this.rest.searchFulltext(query, options)
  }

  // ---- Account ----

  async getAccount (): Promise<Account> {
    return await this.rest.getAccount()
  }

  // ---- Model / Hierarchy ----

  getHierarchy (): Hierarchy {
    if (this.hierarchy === null) {
      throw new Error('HulyClient not connected. Model not loaded.')
    }
    return this.hierarchy
  }

  getModel (): ModelDb {
    if (this.model === null) {
      throw new Error('HulyClient not connected. Model not loaded.')
    }
    return this.model
  }

  // ---- Lifecycle ----

  close (): void {
    this.hierarchy = null
    this.model = null
  }
}
