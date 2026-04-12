# Stack Detection

Use this reference when identifying the real project stack before generating any settings.

## Repository Signals

Check the repository root and nearby config files for:

- languages
- package managers
- frameworks
- build tools
- monorepo indicators
- service integrations

## Language And Package Manager Indicators

| Category | Files to check |
| --- | --- |
| Python | `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `poetry.lock`, `uv.lock` |
| Node.js | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb` |
| Go | `go.mod`, `go.sum` |
| Rust | `Cargo.toml`, `Cargo.lock` |
| Ruby | `Gemfile`, `Gemfile.lock` |
| Java/Kotlin | `pom.xml`, `build.gradle`, `build.gradle.kts` |
| PHP | `composer.json`, `composer.lock` |
| Swift/iOS | `Package.swift`, `*.xcodeproj`, `*.xcworkspace`, `Podfile` |
| .NET | `*.csproj`, `*.sln`, `nuget.config` |

## Framework Indicators

| Framework | Detection |
| --- | --- |
| Next.js | `next` dependency, `next.config.*` |
| React + Vite | `vite` and `react` dependencies, `vite.config.*` |
| Expo / React Native | `expo` dependency, `app.json`, `eas.json` |
| Express | `express` dependency |
| Laravel | `laravel/framework` dependency, `artisan` |
| Magento | `magento/framework` dependency, `bin/magento` |
| Django | `django` dependency |
| FastAPI | `fastapi` dependency |
| Tailwind CSS | `tailwindcss` dependency, `tailwind.config.*` |

## Service And Tool Indicators

| Service/tool | Detection |
| --- | --- |
| Sentry | `sentry-sdk`, `@sentry/*`, `.sentryclirc`, `sentry.properties` |
| Linear | `.linear/` or Linear-specific config |
| Datadog | `dd-trace`, `datadog.yaml` |
| AWS | `aws-cdk`, `samconfig.toml`, `serverless.yml` |
| Vercel | `vercel.json`, `@vercel/*` |
| Supabase | `supabase/`, `@supabase/*` |
| Firebase | `firebase.json`, `firebase-admin`, `@firebase/*` |
| Docker | `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml` |
| Terraform | `*.tf` files |
| Monorepo | `lerna.json`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml` |

## Package Manager Selection

Prefer lock files over assumptions.

| Lock file | Primary manager |
| --- | --- |
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` | bun |
| `package-lock.json` | npm |
| `poetry.lock` | poetry |
| `uv.lock` | uv |
| `Pipfile.lock` | pipenv |

If multiple lock files exist, include each manager only when the repo genuinely uses multiple managers.

## Detection Guardrails

- Do not assume npm for every JS project.
- Do not infer frameworks from folder names alone.
- Do not suggest integrations that are not supported by real files or dependencies.
- If the repo is empty or too partial, stop and ask the user for the intended stack instead of guessing.
