# @hcengineering/account-client

REST client for Huly's account service. Handles login, OTP, workspace selection, profile management, and invites.

## RN Safety: Yes

Uses native `fetch()` only. No Node.js, browser-only, or Svelte dependencies.

## Key Exports

| Export | Purpose |
|--------|---------|
| `getClient(url, token?)` | Factory — returns `AccountClient` |
| `AccountClient` | Full account API (89 methods) |
| `LoginInfo` | Login response: account, token, tfaRequired |
| `WorkspaceLoginInfo` | Workspace response: endpoint, token, workspace, role |
| `OtpInfo` | OTP flow response |
| `WorkspaceInfoWithStatus` | Workspace listing |

## Auth Flow (for mobile)

```typescript
const client = getClient('https://accounts.huly.io')

// 1. Login
const login = await client.login(email, password)
// → { account, token, tfaRequired? }

// 2. If 2FA required
const verified = await client.verify2fa(code)

// 3. Select workspace
const ws = await client.selectWorkspace('my-workspace')
// → { endpoint, token, workspace, role }

// 4. Use ws.token for all subsequent API calls
```

## Dependencies

- `@hcengineering/core` — types only
- `@hcengineering/platform` — PlatformError

## Key Files

| File | Purpose |
|------|---------|
| `src/client.ts` | AccountClientImpl (all 89 methods) |
| `src/types.ts` | LoginInfo, WorkspaceLoginInfo, etc. |
| `src/utils.ts` | Network error detection, timezone |

## Notes

- All requests are POST to single endpoint with `{ method, params }` JSON body
- Token passed as `Authorization: Bearer <token>` header
- Browser detection: `typeof window !== 'undefined'` → adds `credentials: 'include'`
- Retry with exponential backoff on network errors (default 5s timeout)
