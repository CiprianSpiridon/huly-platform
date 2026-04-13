/**
 * Attachment viewer.
 *
 * Routes to the appropriate viewer based on MIME type:
 * - Images: ImageViewer with pinch-to-zoom
 * - PDFs: WebView (future, for now opens share sheet)
 * - Other: Opens native share sheet for the user's OS to handle
 */

import { useCallback, useState } from 'react'
import { Modal } from 'react-native'

import { downloadAndShare } from '@/repositories/attachment'
import { ImageViewer } from './ImageViewer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttachmentViewerProps {
  /** Currently viewed attachment. null = closed. */
  attachment: {
    blobId: string
    filename: string
    mimeType: string
  } | null
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps): React.ReactNode {
  if (attachment == null) {
    return null
  }

  const isImage = attachment.mimeType.startsWith('image/')

  if (isImage) {
    return (
      <Modal
        visible
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <ImageViewer
          blobId={attachment.blobId}
          filename={attachment.filename}
          onClose={onClose}
        />
      </Modal>
    )
  }

  // Non-image files: download and share immediately, then close
  return (
    <NonImageHandler
      blobId={attachment.blobId}
      filename={attachment.filename}
      onClose={onClose}
    />
  )
}

// ---------------------------------------------------------------------------
// Non-image handler (triggers share sheet then closes)
// ---------------------------------------------------------------------------

interface NonImageHandlerProps {
  blobId: string
  filename: string
  onClose: () => void
}

function NonImageHandler({ blobId, filename, onClose }: NonImageHandlerProps): React.ReactNode {
  const [triggered, setTriggered] = useState(false)

  const triggerShare = useCallback(async () => {
    if (triggered) return
    setTriggered(true)
    try {
      await downloadAndShare(blobId, filename)
    } finally {
      onClose()
    }
  }, [blobId, filename, onClose, triggered])

  // Trigger on first render
  if (!triggered) {
    void triggerShare()
  }

  return null
}

export { AttachmentViewer }
export type { AttachmentViewerProps }
