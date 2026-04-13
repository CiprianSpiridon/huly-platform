/**
 * Type declarations for expo-file-system.
 *
 * The package is listed in package.json but may not be hoisted to the
 * local node_modules in Rush. At runtime it is resolved via Metro's
 * configured nodeModulesPaths (common/temp/node_modules).
 */

declare module 'expo-file-system' {
  export const cacheDirectory: string | null
  export const documentDirectory: string | null

  export enum FileSystemUploadType {
    BINARY_CONTENT = 0,
    MULTIPART = 1,
  }

  interface FileInfo {
    exists: boolean
    uri: string
    size?: number
    isDirectory: boolean
    modificationTime?: number
    md5?: string
  }

  interface DownloadResult {
    uri: string
    status: number
    headers: Record<string, string>
    mimeType: string | null
    md5?: string
  }

  interface UploadResult {
    status: number
    headers: Record<string, string>
    body: string
  }

  interface DownloadOptions {
    headers?: Record<string, string>
    md5?: boolean
    cache?: boolean
    sessionType?: number
  }

  interface UploadOptions {
    httpMethod?: string
    uploadType?: FileSystemUploadType
    fieldName?: string
    mimeType?: string
    parameters?: Record<string, string>
    headers?: Record<string, string>
    sessionType?: number
  }

  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<FileInfo>

  export function downloadAsync(
    uri: string,
    fileUri: string,
    options?: DownloadOptions
  ): Promise<DownloadResult>

  export function uploadAsync(
    url: string,
    fileUri: string,
    options?: UploadOptions
  ): Promise<UploadResult>

  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: string; length?: number; position?: number }
  ): Promise<string>

  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: string }
  ): Promise<void>

  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean }
  ): Promise<void>

  export function moveAsync(options: {
    from: string
    to: string
  }): Promise<void>

  export function copyAsync(options: {
    from: string
    to: string
  }): Promise<void>

  export function makeDirectoryAsync(
    fileUri: string,
    options?: { intermediates?: boolean }
  ): Promise<void>
}
