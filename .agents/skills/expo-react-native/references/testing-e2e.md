# E2E Testing

## What

The Huly mobile app uses Maestro for end-to-end testing. Maestro drives the app through real user interactions on simulators and devices, validating critical flows from login to workspace selection to feature usage. Maestro flows are YAML files that describe taps, swipes, text input, and assertions without requiring any test code inside the app.

### E2E testing stack

| Tool | Role |
|---|---|
| Maestro | E2E test runner, YAML flow definitions |
| Maestro Cloud (optional) | CI execution on real devices |
| iOS Simulator | Local iOS testing |
| Android Emulator | Local Android testing |

### Critical flows to test

| Flow | Priority | Screens covered |
|---|---|---|
| Login + workspace select | P0 | Login, OTP, workspace select, inbox |
| Browse issues | P0 | Issue list, issue detail, back navigation |
| Create issue | P0 | Issue create modal, form submission, list refresh |
| Send message | P1 | Channel list, channel messages, message input |
| View notifications | P1 | Inbox list, notification detail |
| Settings and logout | P1 | Settings menu, profile, logout |
| Deep link handling | P2 | External URL to issue detail |
| Pull-to-refresh | P2 | Any list screen |

## How

### Maestro setup

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version

# Run a flow against iOS simulator
maestro test e2e/flows/login.yaml

# Run all flows
maestro test e2e/flows/

# Run with recording (useful for debugging)
maestro record e2e/flows/login.yaml
```

### Flow directory structure

```
mobile/
  e2e/
    flows/
      login.yaml              # Login flow
      workspace-select.yaml   # Workspace selection
      issue-list.yaml         # Browse issues
      issue-create.yaml       # Create an issue
      chat-send.yaml          # Send a chat message
      inbox.yaml              # View notifications
      settings-logout.yaml    # Settings and logout
      deep-link.yaml          # Deep link handling
    config/
      env.yaml                # Environment-specific variables
    scripts/
      setup.sh                # Pre-test setup (clear data, etc.)
```

### Login flow

```yaml
# e2e/flows/login.yaml
appId: com.huly.mobile
name: Login flow
tags:
  - p0
  - auth
---
# Ensure we start from login screen
- assertVisible: "Sign in to Huly"

# Enter email
- tapOn:
    id: "email-input"
- inputText: ${EMAIL}

# Tap continue
- tapOn: "Continue"

# Wait for OTP screen
- assertVisible: "Enter the verification code"

# Enter OTP code (test environment uses fixed code)
- tapOn:
    id: "otp-input"
- inputText: ${OTP_CODE}

# Tap sign in
- tapOn: "Sign in"

# Should navigate to workspace selection
- assertVisible: "Choose workspace"
```

### Workspace selection flow

```yaml
# e2e/flows/workspace-select.yaml
appId: com.huly.mobile
name: Workspace selection
tags:
  - p0
  - auth
---
# Prerequisite: user is logged in and on workspace screen
- assertVisible: "Choose workspace"

# Tap on test workspace
- tapOn: ${WORKSPACE_NAME}

# Should navigate to inbox (default tab)
- assertVisible:
    id: "inbox-tab"
    enabled: true

# Verify tab bar is visible
- assertVisible: "Inbox"
- assertVisible: "Tracker"
- assertVisible: "Chat"
- assertVisible: "Settings"
```

### Issue list and detail flow

```yaml
# e2e/flows/issue-list.yaml
appId: com.huly.mobile
name: Browse issues
tags:
  - p0
  - tracker
---
# Navigate to tracker tab
- tapOn: "Tracker"

# Wait for issues to load
- assertVisible:
    text: "Issues"
    timeout: 5000

# Verify at least one issue is visible
- assertVisible:
    text: "HULY-.*"
    regex: true

# Tap first issue
- tapOn:
    index: 0
    id: "issue-card"

# Verify issue detail loaded
- assertVisible:
    text: "HULY-.*"
    regex: true
    timeout: 3000

# Go back
- back

# Verify we are back on issue list
- assertVisible: "Issues"
```

### Issue creation flow

```yaml
# e2e/flows/issue-create.yaml
appId: com.huly.mobile
name: Create an issue
tags:
  - p0
  - tracker
---
# Navigate to tracker tab
- tapOn: "Tracker"

# Tap create button (FAB or menu)
- tapOn:
    id: "create-issue-button"

# Fill in issue title
- tapOn:
    id: "issue-title-input"
- inputText: "Test issue from Maestro"

# Fill in description
- tapOn:
    id: "issue-description-input"
- inputText: "This is an automated test issue created by Maestro E2E flow."

# Select priority (if picker is available)
- tapOn:
    id: "priority-selector"
- tapOn: "Medium"

# Submit
- tapOn: "Create"

# Verify success -- should navigate back to list or show the new issue
- assertVisible:
    text: "Test issue from Maestro"
    timeout: 5000
```

### Chat messaging flow

```yaml
# e2e/flows/chat-send.yaml
appId: com.huly.mobile
name: Send a chat message
tags:
  - p1
  - chat
---
# Navigate to chat tab
- tapOn: "Chat"

# Wait for channels to load
- assertVisible:
    text: ".*"
    timeout: 5000

# Tap first channel
- tapOn:
    index: 0
    id: "channel-item"

# Type a message
- tapOn:
    id: "message-input"
- inputText: "Hello from Maestro test"

# Send
- tapOn:
    id: "send-button"

# Verify message appears
- assertVisible: "Hello from Maestro test"
```

### Pull-to-refresh flow

```yaml
# e2e/flows/pull-to-refresh.yaml
appId: com.huly.mobile
name: Pull to refresh
tags:
  - p2
  - common
---
# Navigate to inbox
- tapOn: "Inbox"

# Pull to refresh
- swipe:
    direction: DOWN
    duration: 500
    from:
      column: 50%
      row: 30%
    to:
      column: 50%
      row: 70%

# Wait for refresh to complete
- extendedWaitUntil:
    visible: ".*"
    timeout: 5000
```

### Environment configuration

```yaml
# e2e/config/env.yaml
# Test environment variables
EMAIL: "test@huly.io"
OTP_CODE: "123456"
WORKSPACE_NAME: "Test Workspace"
HULY_URL: "https://staging.huly.io"
```

### Running flows with environment

```bash
# Run single flow with env file
maestro test -e e2e/config/env.yaml e2e/flows/login.yaml

# Run all P0 flows
maestro test -e e2e/config/env.yaml --tags p0 e2e/flows/

# Run on specific device
maestro test --device "iPhone 15" e2e/flows/login.yaml
```

### CI integration with GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    paths:
      - 'mobile/**'

jobs:
  e2e-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd mobile && npm install

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Build development client
        run: |
          cd mobile
          npx expo run:ios --configuration Release

      - name: Run E2E tests
        run: |
          cd mobile
          maestro test -e e2e/config/env.yaml --tags p0 e2e/flows/

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-results
          path: mobile/e2e/results/

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: |
            cd mobile
            npm install
            npx expo run:android --variant release
            curl -Ls "https://get.maestro.mobile.dev" | bash
            maestro test -e e2e/config/env.yaml --tags p0 e2e/flows/
```

### Test IDs for Maestro

Add `testID` props to interactive elements for reliable Maestro targeting:

```tsx
// Components that Maestro needs to find
<TextInput
  testID="email-input"
  accessibilityLabel="Email address"
  // ...
/>

<Pressable
  testID="issue-card"
  accessibilityRole="button"
  accessibilityLabel={`Issue ${issue.identifier}`}
  // ...
/>

<Pressable
  testID="create-issue-button"
  accessibilityRole="button"
  accessibilityLabel="Create issue"
  // ...
/>
```

Maestro can target by `testID` (via `id:` in YAML), by text content, by accessibility label, or by index.

## When

### When to write E2E tests

| Situation | Write E2E |
|---|---|
| New critical user flow (login, CRUD) | Yes, P0 |
| New screen in existing flow | Yes, extend existing flow |
| Bug fix in navigation | Yes, regression test |
| UI-only change (colors, spacing) | No, visual regression is better |
| Pure logic change (formatters) | No, unit test is better |

### When to use testID vs text matching

| Targeting strategy | Use when |
|---|---|
| `testID` / `id:` | Element text changes, multiple similar elements, form inputs |
| Text content | Unique visible text, button labels, screen titles |
| Accessibility label | Icon-only buttons, images |
| Index | List items when text is dynamic |
| Regex | Pattern-matched text (e.g., issue identifiers) |

### When to run E2E in CI

| Event | Flows to run |
|---|---|
| PR to develop | P0 flows only (fast feedback) |
| Merge to develop | P0 + P1 flows |
| Release build | All flows (P0 + P1 + P2) |
| Nightly | All flows on both platforms |

## Never

- **Never put test credentials in committed env files.** Use CI secrets.

```yaml
# WRONG -- committed with real credentials
EMAIL: "real-user@company.com"
OTP_CODE: "real-code"

# RIGHT -- use CI environment variables or dedicated test accounts
EMAIL: ${TEST_EMAIL}
OTP_CODE: ${TEST_OTP}
```

- **Never write E2E tests for unit-testable logic.** E2E tests are slow and flaky. Reserve them for integration flows.

- **Never rely on timing.** Use `assertVisible` with timeout, not `sleep`.

```yaml
# WRONG
- sleep: 3
- tapOn: "Save"

# RIGHT
- assertVisible:
    text: "Save"
    timeout: 5000
- tapOn: "Save"
```

- **Never hardcode device-specific coordinates.** Use element targeting (testID, text, accessibility label).

```yaml
# WRONG
- tapOn:
    point: "200, 450"

# RIGHT
- tapOn:
    id: "save-button"
```

- **Never skip cleanup between flows.** If a flow creates data, ensure subsequent flows do not depend on that data existing.

- **Never run E2E tests against production.** Always use a staging environment with test accounts.

- **Never test third-party behavior.** Do not write E2E tests for Expo camera, push notification delivery, or native share sheets. Test up to the boundary of your code.
