/**
 * Base repository.
 *
 * Provides typed delegation methods for all CRUD operations against
 * the Huly platform. Domain-specific repositories extend this class.
 */

import type {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  ModelDb,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  WithLookup,
} from '@hcengineering/core'

import type { HulyClient } from '@/client/api'

export class RepositoryError extends Error {
  constructor (
    message: string,
    public readonly domain: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(`[${domain}:${operation}] ${message}`)
    this.name = 'RepositoryError'
  }
}

export function wrapRepositoryError (
  domain: string,
  operation: string,
  error: unknown
): RepositoryError {
  if (error instanceof Error) {
    return new RepositoryError(error.message, domain, operation, error)
  }
  return new RepositoryError('Unknown error', domain, operation, error)
}

/**
 * Base repository receiving a HulyClient instance.
 *
 * Subclasses add domain-specific query builders and default options.
 */
export class BaseRepository {
  constructor (protected readonly client: HulyClient) {}

  // ---- Queries ----

  protected async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  protected async findOne<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.client.findOne(_class, query, options)
  }

  // ---- Search ----

  protected async searchFulltext (
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    return await this.client.searchFulltext(query, options)
  }

  // ---- Model / Hierarchy ----

  protected getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  protected getModel (): ModelDb {
    return this.client.getModel()
  }
}
