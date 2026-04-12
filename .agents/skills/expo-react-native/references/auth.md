# Authentication

## What

The Huly mobile app authenticates through `@hcengineering/account-client`. The flow is: (1) load server config, (2) initiate OTP login, (3) validate OTP code, (4) receive `LoginInfo` with token, (5) select a workspace to get `WorkspaceLoginInfo` with workspace-scoped token and endpoint, (6) connect `PlatformClient`. Tokens are stored in `expo-secure-store` and restored on app launch. The auth guard in `(app)/_layout.tsx` redirects unauthenticated users to login.

### Auth flow steps

| Step | API call | Input | Output | Storage |
|---|---|---|---|---|
| 1. Load config | `loadServerConfig(url)` | Server URL | `ServerConfig` | Memory |
| 2. Login OTP | `accountClient.loginOtp(email)` | Email | `OtpInfo` | None |
| 3. Validate OTP | `accountClient.validateOtp(email, code)` | Email + OTP code | `LoginInfo` (token, account) | `expo-secure-store`: token, account |
| 4. List workspaces | `accountClient.getUserWorkspaces()` | (uses token) | `WorkspaceInfoWithStatus[]` | None |
| 5. Select workspace | `accountClient.selectWorkspace(url)` | Workspace URL | `WorkspaceLoginInfo` | `expo-secure-store`: workspace token, endpoint |
| 6. Connect | `connect(url, { token, workspace })` | URL + token + workspace | `PlatformClient` | Memory (singleton) |

### Secure storage keys

| Key | Value | Written at |
|---|---|---|
| `auth_token` | Account-scoped JWT | Step 3 (validate OTP) |
| `account_id` | `AccountUuid` | Step 3 |
| `workspace_url` | Workspace URL slug | Step 5 (select workspace) |
| `workspace_id` | `WorkspaceUuid` | Step 5 |
| `workspace_token` | Workspace-scoped JWT | Step 5 |
| `workspace_endpoint` | Transactor endpoint URL | Step 5 |

## How

### Login screen

```tsx
// app/(auth)/login.tsx
import { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/use-auth';

export default function LoginScreen(): React.ReactNode {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const { requestOtp, validateOtp, isLoading, error } = useLogin();

  const handleRequestOtp = useCallback(async () => {
    try {
      await requestOtp(email);
      setStep('otp');
    } catch (err) {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  }, [email, requestOtp]);

  const handleValidateOtp = useCallback(async () => {
    try {
      await validateOtp(email, otp);
      router.replace('/(auth)/workspace-select');
    } catch (err) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
  }, [email, otp, validateOtp]);

  return (
    <SafeAreaView className="flex-1 bg-surface-primary justify-center px-6">
      <View className="items-center mb-8">
        <Image
          source={require('@/assets/images/logo.png')}
          className="w-16 h-16 mb-4"
          contentFit="contain"
          accessibilityLabel="Huly logo"
        />
        <Text className="text-2xl font-sans-bold text-content-primary">
          Sign in to Huly
        </Text>
      </View>

      {step === 'email' ? (
        <View className="gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
          />
          <Button
            title="Continue"
            onPress={handleRequestOtp}
            loading={isLoading}
            disabled={!email.includes('@')}
          />
        </View>
      ) : (
        <View className="gap-4">
          <Text className="text-sm text-content-secondary text-center font-sans">
            Enter the verification code sent to {email}
          </Text>
          <Input
            label="Verification code"
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            accessibilityLabel="Verification code"
          />
          <Button
            title="Sign in"
            onPress={handleValidateOtp}
            loading={isLoading}
            disabled={otp.length < 6}
          />
          <Button
            title="Back"
            variant="ghost"
            onPress={() => setStep('email')}
          />
        </View>
      )}

      {error && (
        <Text className="text-status-error text-sm text-center mt-4 font-sans">
          {error}
        </Text>
      )}
    </SafeAreaView>
  );
}
```

### Workspace selection screen

```tsx
// app/(auth)/workspace-select.tsx
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { useWorkspaces, useSelectWorkspace } from '@/hooks/use-workspace';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import type { WorkspaceInfoWithStatus } from '@hcengineering/core';

export default function WorkspaceSelectScreen(): React.ReactNode {
  const { data: workspaces, isLoading, error, refetch } = useWorkspaces();
  const { selectWorkspace, isSelecting } = useSelectWorkspace();

  async function handleSelect(workspace: WorkspaceInfoWithStatus): Promise<void> {
    try {
      await selectWorkspace(workspace.url);
      router.replace('/(app)/(tabs)/inbox');
    } catch (err) {
      // Error shown via mutation state
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary justify-center">
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary">
        <ErrorState message="Failed to load workspaces" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-2xl font-sans-bold text-content-primary">
          Choose workspace
        </Text>
      </View>
      <FlashList
        data={workspaces}
        keyExtractor={(item) => item.uuid}
        estimatedItemSize={72}
        renderItem={({ item }) => (
          <Pressable
            className="mx-4 mb-2 bg-surface-secondary rounded-lg p-4 active:opacity-80"
            onPress={() => handleSelect(item)}
            disabled={isSelecting}
            accessibilityRole="button"
            accessibilityLabel={`Select workspace ${item.name}`}
          >
            <Text className="text-lg font-sans-semibold text-content-primary">
              {item.name}
            </Text>
            <Text className="text-sm font-sans text-content-secondary mt-1">
              {item.url}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
```

### Auth hook implementation

```typescript
// src/hooks/use-auth.ts
import { useState, useCallback } from 'react';

import { getOrCreateAccountClient, clearAccountClient } from '@/client/account';
import { connectClient, disconnectClient } from '@/client/api';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import type { LoginInfo, OtpInfo } from '@hcengineering/account-client';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const requestOtp = useCallback(async (email: string): Promise<OtpInfo> => {
    setIsLoading(true);
    setError(null);
    try {
      const client = await getOrCreateAccountClient();
      return await client.loginOtp(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateOtp = useCallback(async (email: string, code: string): Promise<LoginInfo> => {
    setIsLoading(true);
    setError(null);
    try {
      const client = await getOrCreateAccountClient();
      const loginInfo = await client.validateOtp(email, code);
      await setAuth(loginInfo);
      return loginInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  return { requestOtp, validateOtp, isLoading, error };
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  return useCallback(async () => {
    await disconnectClient();
    clearAccountClient();
    await clearWorkspace();
    await clearAuth();
  }, [clearAuth, clearWorkspace]);
}
```

### Session restore on app launch

```tsx
// app/_layout.tsx (relevant section)
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import { connectClient } from '@/client/api';

export default function RootLayout(): React.ReactNode {
  const [isRestoring, setIsRestoring] = useState(true);
  const restoreAuth = useAuthStore((s) => s.restoreAuth);
  const restoreWorkspace = useWorkspaceStore((s) => s.restoreWorkspace);

  useEffect(() => {
    async function restore(): Promise<void> {
      try {
        await restoreAuth();
        await restoreWorkspace();
        // Attempt to reconnect PlatformClient
        const token = useAuthStore.getState().token;
        const workspace = useWorkspaceStore.getState().workspaceUrl;
        if (token && workspace) {
          await connectClient();
        }
      } catch {
        // Token expired or invalid -- user will be redirected to login
      } finally {
        setIsRestoring(false);
      }
    }
    restore();
  }, [restoreAuth, restoreWorkspace]);

  if (isRestoring) {
    return null; // Splash screen still visible
  }

  // ... rest of layout
}
```

### Auth guard pattern

```tsx
// app/(app)/_layout.tsx
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

export default function AppLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace !== null);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasWorkspace) {
    return <Redirect href="/(auth)/workspace-select" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="modal/issue-create"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
```

### Workspace switching

```typescript
// src/hooks/use-workspace.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { getOrCreateAccountClient } from '@/client/account';
import { disconnectClient, connectClient } from '@/client/api';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';

export function useWorkspaces() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const client = await getOrCreateAccountClient(token ?? undefined);
      return await client.getUserWorkspaces();
    },
    enabled: token !== null,
    staleTime: 5 * 60_000,
  });
}

export function useSelectWorkspace() {
  const [isSelecting, setIsSelecting] = useState(false);
  const token = useAuthStore((s) => s.token);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const queryClient = useQueryClient();

  const selectWorkspace = useCallback(async (workspaceUrl: string): Promise<void> => {
    setIsSelecting(true);
    try {
      // Disconnect existing client
      await disconnectClient();

      // Select workspace via account client
      const client = await getOrCreateAccountClient(token ?? undefined);
      const wsInfo = await client.selectWorkspace(workspaceUrl);

      // Store workspace info
      await setWorkspace(wsInfo);

      // Connect PlatformClient with new workspace
      await connectClient();

      // Clear all cached queries from previous workspace
      queryClient.clear();
    } finally {
      setIsSelecting(false);
    }
  }, [token, setWorkspace, queryClient]);

  return { selectWorkspace, isSelecting };
}
```

## When

### When to re-authenticate

| Trigger | Action |
|---|---|
| App launch (cold start) | Restore from secure store, validate token |
| Token expired (401 response) | Clear auth, redirect to login |
| User taps "Sign out" | Clear all stores, disconnect client, redirect to login |
| Workspace switch | Disconnect, select new workspace, reconnect |
| Background to foreground (after long delay) | Validate token, reconnect if needed |

### When to use expo-secure-store vs in-memory

| Data | Storage |
|---|---|
| Auth tokens | `expo-secure-store` (encrypted, persists across launches) |
| Account IDs | `expo-secure-store` |
| Workspace endpoint URLs | `expo-secure-store` |
| Server config | Memory only (re-fetched each launch) |
| PlatformClient instance | Memory only (singleton) |

### When to redirect vs prompt

| Situation | Behavior |
|---|---|
| No token stored | Redirect to login silently |
| Token exists but expired | Redirect to login with "Session expired" message |
| Token exists, workspace missing | Redirect to workspace selection |
| Token + workspace valid | Proceed to app |

## Never

- **Never store tokens in AsyncStorage.**

```typescript
// WRONG -- unencrypted storage
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', loginInfo.token);

// RIGHT -- encrypted keychain/keystore
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', loginInfo.token);
```

- **Never put auth logic in individual screens.** The auth guard is in `(app)/_layout.tsx`. Screens inside `(app)` can assume authentication.

- **Never hardcode server URLs.**

```typescript
// WRONG
const client = await connect('https://app.huly.io', { ... });

// RIGHT
const url = getServerUrl(); // reads EXPO_PUBLIC_HULY_URL
const client = await connect(url, { ... });
```

- **Never skip clearing the query cache on workspace switch.** Stale data from workspace A must not appear in workspace B.

- **Never validate tokens client-side.** Call `getLoginInfoByToken()` on the server to validate. JWT expiry checks alone are insufficient.

- **Never expose the token in logs or error messages.**

```typescript
// WRONG
console.log(`Connecting with token: ${token}`);

// RIGHT
console.log('Connecting to workspace...');
```

- **Never use biometric auth without fallback.** If Face ID / fingerprint fails, allow passcode entry. Use `expo-local-authentication` with `fallbackLabel`.
