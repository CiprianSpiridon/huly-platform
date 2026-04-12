# Storage and Media

## What

The Huly mobile app handles file attachments, avatars, and images through the Huly datalake service. Files are uploaded and downloaded via REST endpoints with Bearer token authentication. The mobile app uses `expo-file-system` for local file operations and `expo-image` for image rendering with caching and placeholders. The server-side storage client (`@hcengineering/api-client/storage`) uses Node.js `stream` and cannot be imported directly -- all file operations must go through REST endpoints.

### Storage architecture

| Concern | Tool | Notes |
|---|---|---|
| File upload | `expo-file-system` `uploadAsync()` | Multipart form upload to datalake |
| File download | `expo-file-system` `downloadAsync()` | Download to local cache |
| Image display | `expo-image` | Caching, blurhash, content-fit |
| Avatar display | `expo-image` with initials fallback | Graceful degradation |
| Image picking | `expo-image-picker` | Camera and photo library |
| Local file cache | `expo-file-system` `cacheDirectory` | Auto-cleaned by OS |
| Persistent storage | `expo-file-system` `documentDirectory` | Survives cache clearing |

### Datalake URL patterns

| Operation | URL template | Method |
|---|---|---|
| Get file | `{FILES_URL}` with `:blobId` replaced | GET |
| Upload file | `{UPLOAD_URL}` | POST (multipart) |
| Get file metadata | `{FILES_URL}` with `:blobId` replaced + `?metadata=true` | GET |

The `FILES_URL` and `UPLOAD_URL` come from `ServerConfig` (loaded via `loadServerConfig()`).

## How

### Building file URLs

```typescript
// src/lib/files.ts
import type { ServerConfig } from '@hcengineering/api-client';
import type { Ref, Blob } from '@hcengineering/core';

export function getFileUrl(config: ServerConfig, blobId: string): string {
  return config.FILES_URL
    .replace(':filename', blobId)
    .replace(':blobId', blobId);
}

export function getAvatarUrl(
  config: ServerConfig,
  avatarBlobId: string | null | undefined,
  size: number = 64
): string | null {
  if (!avatarBlobId) return null;
  const baseUrl = getFileUrl(config, avatarBlobId);
  return `${baseUrl}?width=${size}&height=${size}&format=webp`;
}

export function getAttachmentUrl(
  config: ServerConfig,
  blobId: string
): string {
  return getFileUrl(config, blobId);
}
```

### Downloading files

```typescript
// src/repositories/files.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getFileUrl } from '@/lib/files';
import { getConfig } from '@/client/account';
import { useAuthStore } from '@/store/auth';

export async function downloadFile(
  blobId: string,
  filename: string
): Promise<string> {
  const config = await getConfig();
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = getFileUrl(config, blobId);
  const localPath = `${FileSystem.cacheDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(url, localPath, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new Error(`Download failed with status ${result.status}`);
  }

  return result.uri;
}

export async function downloadAndShare(
  blobId: string,
  filename: string
): Promise<void> {
  const localPath = await downloadFile(blobId, filename);
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(localPath);
  }
}
```

### Uploading files

```typescript
// src/repositories/uploads.ts
import * as FileSystem from 'expo-file-system';

import { getConfig } from '@/client/account';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

interface UploadResult {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

export async function uploadFile(
  localUri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const config = await getConfig();
  const token = useAuthStore.getState().token;
  const workspace = useWorkspaceStore.getState().selectedWorkspace;

  if (!token || !workspace) {
    throw new Error('Not authenticated or no workspace selected');
  }

  const result = await FileSystem.uploadAsync(
    config.UPLOAD_URL,
    localUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      parameters: {
        workspace,
        name: filename,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (result.status !== 200) {
    throw new Error(`Upload failed with status ${result.status}`);
  }

  return JSON.parse(result.body) as UploadResult;
}
```

### Image picking

```typescript
// src/hooks/use-image-picker.ts
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { uploadFile } from '@/repositories/uploads';

interface PickedImage {
  uri: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
}

export function useImagePicker() {
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = useCallback(async (): Promise<PickedImage | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photos in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      filename: asset.fileName ?? `image_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }, []);

  const pickAndUpload = useCallback(async (): Promise<string | null> => {
    const image = await pickImage();
    if (!image) return null;

    setIsUploading(true);
    try {
      const result = await uploadFile(image.uri, image.filename, image.mimeType);
      return result.id;
    } finally {
      setIsUploading(false);
    }
  }, [pickImage]);

  return { pickImage, pickAndUpload, isUploading };
}
```

### Avatar component with expo-image

```tsx
// src/components/ui/avatar.tsx
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
] as const;

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

function Avatar({ uri, name, size = 32 }: AvatarProps): React.ReactNode {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        recyclingKey={uri}
        transition={200}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }

  const backgroundColor = getColorForName(name);
  const fontSize = size * 0.4;

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor }}
      className="items-center justify-center"
      accessibilityLabel={`${name}'s avatar`}
    >
      <Text
        style={{ fontSize, lineHeight: fontSize * 1.2 }}
        className="font-sans-semibold text-white"
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export { Avatar };
export type { AvatarProps };
```

### Attachment thumbnail component

```tsx
// src/components/features/attachment-thumbnail.tsx
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { formatFileSize } from '@/lib/format';

interface AttachmentThumbnailProps {
  blobId: string;
  filename: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  onPress: () => void;
}

function AttachmentThumbnail({
  filename, mimeType, size, thumbnailUrl, onPress,
}: AttachmentThumbnailProps): React.ReactNode {
  const isImage = mimeType.startsWith('image/');

  return (
    <Pressable
      className="bg-surface-secondary rounded-md overflow-hidden active:opacity-80"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Attachment: ${filename}, ${formatFileSize(size)}`}
    >
      {isImage && thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          className="w-full aspect-video"
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={300}
        />
      ) : (
        <View className="w-full aspect-video items-center justify-center bg-surface-tertiary">
          <Ionicons name="document-outline" size={32} color="#77818B" />
        </View>
      )}
      <View className="p-2">
        <Text className="text-xs font-sans-medium text-content-primary" numberOfLines={1}>
          {filename}
        </Text>
        <Text className="text-xs font-sans text-content-tertiary">
          {formatFileSize(size)}
        </Text>
      </View>
    </Pressable>
  );
}

export { AttachmentThumbnail };
```

## When

### When to use expo-image vs React Native Image

| Situation | Use |
|---|---|
| Any image display | `expo-image` always |
| Need caching | `expo-image` (built-in disk + memory cache) |
| Need blurhash placeholder | `expo-image` `placeholder` prop |
| Need transition animation | `expo-image` `transition` prop |
| Recycling in lists | `expo-image` `recyclingKey` prop |

Never use React Native's built-in `Image` component. `expo-image` is the standard.

### When to use cacheDirectory vs documentDirectory

| Content | Directory | Why |
|---|---|---|
| Downloaded file previews | `cacheDirectory` | OS can clean when storage is low |
| User-initiated downloads (saved files) | `documentDirectory` | Persists until user deletes |
| Image cache | Handled by `expo-image` | Do not manage manually |

### When to request permissions

| Action | Permission | Check first |
|---|---|---|
| Pick from photo library | `MediaLibrary` | `requestMediaLibraryPermissionsAsync()` |
| Take photo | `Camera` | `requestCameraPermissionsAsync()` |
| Save to photo library | `MediaLibrary` (write) | `requestPermissionsAsync()` |

Always check permission status first, then request, then handle denial with a link to device settings.

## Never

- **Never import `@hcengineering/api-client/storage` directly.** It uses Node.js `stream`.

```typescript
// WRONG
import { StorageClient } from '@hcengineering/api-client/storage';

// RIGHT
import * as FileSystem from 'expo-file-system';
```

- **Never use React Native's `Image` component.**

```tsx
// WRONG
import { Image } from 'react-native';
<Image source={{ uri: url }} style={{ width: 100, height: 100 }} />

// RIGHT
import { Image } from 'expo-image';
<Image source={{ uri: url }} style={{ width: 100, height: 100 }} contentFit="cover" />
```

- **Never load full-resolution images for thumbnails.** Use URL parameters for server-side resizing.
- **Never forget the Authorization header on file requests.** Datalake requires Bearer token auth.
- **Never cache files in `documentDirectory` unless the user explicitly saved them.** Use `cacheDirectory` for temporary previews.
- **Never block the JS thread with large file operations.** `expo-file-system` operations are async -- always await them.
