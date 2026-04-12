# Command Catalog

Use this reference when building the recommended command allowlist.

## Baseline Commands

Safe baseline commands useful in most repos:

- `Bash(ls:*)`
- `Bash(pwd:*)`
- `Bash(find:*)`
- `Bash(file:*)`
- `Bash(stat:*)`
- `Bash(wc:*)`
- `Bash(head:*)`
- `Bash(tail:*)`
- `Bash(cat:*)`
- `Bash(tree:*)`
- `Bash(git status:*)`
- `Bash(git log:*)`
- `Bash(git diff:*)`
- `Bash(git show:*)`
- `Bash(git branch:*)`
- `Bash(git remote:*)`
- `Bash(git tag:*)`
- `Bash(git stash list:*)`
- `Bash(git rev-parse:*)`
- `Bash(gh pr view:*)`
- `Bash(gh pr list:*)`
- `Bash(gh pr checks:*)`
- `Bash(gh pr diff:*)`
- `Bash(gh issue view:*)`
- `Bash(gh issue list:*)`
- `Bash(gh run view:*)`
- `Bash(gh run list:*)`
- `Bash(gh run logs:*)`
- `Bash(gh repo view:*)`
- `Bash(gh api:*)`

## Stack-Specific Commands

Include only commands for detected tools.

Examples by ecosystem:

- Python:
  `python`, `python3`, `pytest`, `mypy`, `pyright`, `ruff`, plus the detected package manager (`poetry`, `uv`, `pipenv`, or `pip`)
- Python frameworks:
  `python manage.py`, `django-admin`, `uvicorn`, `fastapi`, `flask`, `celery`, `alembic`
- Node.js:
  `node`, the detected package manager (`pnpm`, `yarn`, `bun`, or `npm`), `tsc`, `eslint`, `prettier`, `vitest`, `jest`
- Node.js frameworks:
  `npx next`, `npx expo`, `eas`, `npx vite`, `npx tailwindcss`, `npx storybook`, `npx prisma`, `npx drizzle-kit`
- PHP:
  `php`, `composer`, `phpunit`, `phpstan`, plus framework CLIs like `php artisan`, `php bin/magento`, `php bin/console`
- Go:
  `go build`, `go run`, `go test`, `go vet`, `go fmt`, `go mod tidy`, `golangci-lint run`
- Rust:
  `cargo build`, `cargo run`, `cargo test`, `cargo check`, `cargo clippy`, `cargo fmt`, `cargo add`, `cargo remove`
- Ruby:
  `bundle install`, `bundle exec`, `rails`, `rspec`
- Java/Kotlin:
  `mvn`, `gradle`, `./gradlew`
- .NET:
  `dotnet build`, `dotnet run`, `dotnet test`, `dotnet ef`
- Build / infra:
  `docker`, `docker-compose`, `terraform`, `make`, `serverless`, `cdk`

## Project-Local Tooling

If detected:

- `browse`
- `codemap`

Allow only when the tool is actually present or already part of project workflow.

## Package Manager Exclusion Rules

- If the repo uses pnpm, do not include npm, yarn, or bun by default.
- If the repo uses yarn, do not include npm, pnpm, or bun by default.
- If the repo uses bun, do not include npm, pnpm, or yarn by default.
- If the repo uses npm, do not include pnpm, yarn, or bun by default.
- Apply the same principle across Python package managers.

## Safety Guardrails

- Include development commands Claude genuinely needs, not just read-only inspection commands.
- Exclude destructive system commands such as `rm -rf`, disk tools, or unrelated admin commands.
- Exclude absolute paths and user-specific binaries.
- Do not include custom project scripts unless the user explicitly wants them considered.
