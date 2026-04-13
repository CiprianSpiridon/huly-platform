/**
 * File URL builders for the Huly datalake.
 *
 * The datalake uses two URL templates from ServerConfig:
 * - FILES_URL: for downloading files (contains :blobId and :filename placeholders)
 * - UPLOAD_URL: for uploading files (POST with multipart form data)
 *
 * All datalake requests require Authorization: Bearer {token}.
 */

import type { ServerConfig } from '@/client/config'

/**
 * Build a download URL for a blob.
 */
export function getFileUrl(config: ServerConfig, blobId: string, workspaceId?: string): string {
  let url = config.FILES_URL
    .replace(':filename', blobId)
    .replace(':blobId', blobId)

  // FILES_URL may contain a :workspace placeholder (e.g., /files/:workspace/:blobId)
  if (workspaceId != null) {
    url = url.replace(':workspace', workspaceId)
  }

  return url
}

/**
 * Build a thumbnail URL for an image blob (server-side resize via query params).
 */
export function getThumbnailUrl(
  config: ServerConfig,
  blobId: string,
  workspaceId?: string,
  width: number = 200,
  height: number = 200
): string {
  const base = getFileUrl(config, blobId, workspaceId)
  return `${base}?width=${width}&height=${height}&format=webp`
}
