/**
 * Type declarations for expo-sharing.
 *
 * The package is listed in package.json but may not be hoisted to the
 * local node_modules in Rush. At runtime it is resolved via Metro's
 * configured nodeModulesPaths (common/temp/node_modules).
 */

declare module 'expo-sharing' {
  export interface SharingOptions {
    mimeType?: string
    dialogTitle?: string
    UTI?: string
  }

  export function isAvailableAsync(): Promise<boolean>

  export function shareAsync(
    url: string,
    options?: SharingOptions
  ): Promise<void>
}
