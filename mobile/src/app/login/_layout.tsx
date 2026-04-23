/**
 * Literal `/login/*` stack layout.
 *
 * Routes here capture universal links of the form
 * `https://huly.app/login/auth?token=...` and `/login/recovery?id=...`.
 * They live outside the `(auth)` route group because expo-router strips
 * route-group parens from URLs — placing them under `(auth)` would resolve
 * to `/auth` and `/recovery`, not `/login/auth` and `/login/recovery`.
 */
import { Stack } from 'expo-router'

export default function LoginLayout(): React.ReactNode {
  return <Stack screenOptions={{ headerShown: false }} />
}
