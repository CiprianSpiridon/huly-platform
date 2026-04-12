/**
 * Hooks barrel.
 */

export { useHulyQuery, useHulyFindOne, createHulyQueryKey } from './useHulyQuery'
export type { UseHulyQueryOptions, UseHulyFindOneOptions } from './useHulyQuery'

export { useHulyCreate, useHulyUpdate, useHulyRemove } from './useHulyMutation'
export type {
  HulyCreateParams,
  HulyUpdateParams,
  HulyRemoveParams,
} from './useHulyMutation'
