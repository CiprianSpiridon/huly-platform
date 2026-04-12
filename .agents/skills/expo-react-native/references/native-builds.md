# Native Builds and Deployment

## What

The Huly mobile app uses EAS Build for native compilation, EAS Update for OTA JavaScript updates, and EAS Submit for App Store / Play Store delivery. Three build profiles (development, preview, production) serve different stages of the development lifecycle. The `@expo/fingerprint` system determines when a full native rebuild is needed versus when an OTA update suffices.

### Build profiles

| Profile | Purpose | Distribution | Dev client | Code signing |
|---|---|---|---|---|
| `development` | Local testing with dev tools | Internal | Yes | Debug (ad hoc) |
| `preview` | QA and stakeholder testing | Internal (TestFlight / internal track) | No | Ad hoc / internal |
| `production` | App Store / Play Store release | Store | No | Release (production) |

### Update channels

| Channel | Build profile | Auto-update | Rollback |
|---|---|---|---|
| `development` | development | Immediate | Manual |
| `preview` | preview | On launch | Automatic on error |
| `production` | production | On launch | Automatic on error |

### When to rebuild vs OTA update

| Change | Rebuild needed | OTA update works |
|---|---|---|
| JavaScript/TypeScript code | No | Yes |
| NativeWind / Tailwind styles | No | Yes |
| Assets (images, fonts) | No | Yes |
| app.json config change | Usually yes | No |
| New native module added | Yes | No |
| Expo SDK upgrade | Yes | No |
| Config plugin added/changed | Yes | No |
| iOS permission added | Yes | No |
| Android permission added | Yes | No |

## How

### Complete eas.json

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Debug"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "EXPO_PUBLIC_HULY_URL": "https://staging.huly.io"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_HULY_URL": "https://staging.huly.io"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_HULY_URL": "https://app.huly.io"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "team@huly.io",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Build commands

```bash
# Development build (dev client with React DevTools)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (for QA testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

### OTA updates with EAS Update

```bash
# Push JS update to preview channel
eas update --channel preview --message "Fix issue card layout"

# Push JS update to production channel
eas update --channel production --message "Fix crash in chat screen"

# Check update status
eas update:list --channel production

# Roll back to previous update
eas update:rollback --channel production
```

### Fingerprint-based rebuild detection

Use `@expo/fingerprint` to determine if a native rebuild is needed:

```bash
# Generate fingerprint for current state
npx @expo/fingerprint

# Compare with previous build fingerprint
npx @expo/fingerprint --diff <previous-hash>
```

In CI, store the fingerprint hash after each build and compare before deciding between rebuild and OTA update:

```bash
#!/bin/bash
# ci/build-or-update.sh

CURRENT_HASH=$(npx @expo/fingerprint)
PREVIOUS_HASH=$(cat .last-build-fingerprint 2>/dev/null || echo "")

if [ "$CURRENT_HASH" = "$PREVIOUS_HASH" ]; then
  echo "No native changes detected. Publishing OTA update..."
  eas update --channel production --message "$COMMIT_MESSAGE"
else
  echo "Native changes detected. Building..."
  eas build --profile production --platform all --non-interactive
  echo "$CURRENT_HASH" > .last-build-fingerprint
fi
```

### Version management

```typescript
// app.config.ts (dynamic config for version management)
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Huly',
  slug: 'huly-mobile',
  version: '1.0.0',              // Semantic version shown to users
  ios: {
    buildNumber: '1',            // Incremented per build (autoIncrement in eas.json)
    bundleIdentifier: 'com.huly.mobile',
  },
  android: {
    versionCode: 1,              // Incremented per build (autoIncrement in eas.json)
    package: 'com.huly.mobile',
  },
  // ... rest of config
};

export default config;
```

With `"autoIncrement": true` in the production eas.json profile, EAS automatically increments `buildNumber` (iOS) and `versionCode` (Android) on each build.

### Pre-build validation checklist

Run before every EAS build:

```bash
# 1. Expo doctor -- catches SDK mismatches and config issues
npx expo-doctor

# 2. TypeScript -- catches type errors
npx tsc --noEmit

# 3. Lint
npx eslint . --ext .ts,.tsx

# 4. Tests
npx jest --passWithNoTests

# 5. Fingerprint check (optional -- see if rebuild is actually needed)
npx @expo/fingerprint
```

### Config plugins

Config plugins modify native project files (Info.plist, AndroidManifest.xml, etc.) without ejecting from managed workflow:

```json
// app.json plugins array
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-font",
  ["expo-camera", {
    "cameraPermission": "Huly needs camera access to attach photos to issues"
  }],
  ["expo-notifications", {
    "icon": "./assets/notification-icon.png",
    "color": "#205DC2",
    "sounds": ["./assets/sounds/notification.wav"]
  }],
  ["expo-build-properties", {
    "ios": {
      "deploymentTarget": "15.1"
    },
    "android": {
      "minSdkVersion": 24,
      "compileSdkVersion": 34,
      "targetSdkVersion": 34
    }
  }]
]
```

### App signing

- **iOS**: Managed by EAS. Credentials stored securely in EAS servers. Use `eas credentials` to manage.
- **Android**: Upload key managed by EAS or Google Play App Signing. Never commit keystores to git.

```bash
# View current credentials
eas credentials --platform ios
eas credentials --platform android

# Set up new credentials (interactive)
eas credentials:configure --platform ios
```

## When

### When to use each build profile

| Scenario | Profile |
|---|---|
| Daily development on simulator/device | `development` |
| Internal QA testing | `preview` |
| TestFlight / Internal Testing Track | `preview` or `production` |
| App Store / Play Store submission | `production` |
| Hotfix for production users | `production` (OTA via `eas update`) |

### When to use OTA vs full build

| Change type | Method |
|---|---|
| Bug fix in TypeScript | OTA update |
| New screen (JS only) | OTA update |
| Updated Tailwind styles | OTA update |
| New permission required | Full build |
| New native module | Full build |
| SDK version upgrade | Full build |
| app.json scheme change | Full build |

### When to roll back

- OTA update caused a crash increase (monitor with Sentry / crash reporting)
- Critical bug in latest update affecting users
- Performance regression detected after update

```bash
# Roll back production to previous update
eas update:rollback --channel production
```

## Never

- **Never use development profile settings for production builds.** Development builds include debugging tools, dev menus, and are not optimized.

- **Never commit signing credentials to git.**

```bash
# WRONG -- keystore in repo
git add android/app/release.keystore

# RIGHT -- managed by EAS credentials
eas credentials --platform android
```

- **Never skip `expo-doctor` before a release build.** It catches SDK mismatches, incompatible native modules, and config issues that cause build failures.

- **Never push OTA updates that require native changes.** The update will crash on launch because the native binary does not have the required native module.

- **Never use `--non-interactive` in local builds.** It is for CI only. Locally, interactive mode helps catch configuration issues.

- **Never hardcode `EXPO_PUBLIC_HULY_URL` in source.** Use environment variables in eas.json per profile so staging and production builds point to different servers.

- **Never forget `autoIncrement` for production builds.** App Store and Play Store reject submissions with duplicate version numbers.

- **Never publish an OTA update without testing on the same runtime version.** Test the update on a device running the same native build the OTA targets.
