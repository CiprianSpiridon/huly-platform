# WebFetch And MCP Guidance

Use this reference when adding documentation domains or MCP suggestions.

## Documentation Domains

Add only domains that match detected frameworks or tools.

Examples:

- Django -> `docs.djangoproject.com`
- Flask -> `flask.palletsprojects.com`
- FastAPI -> `fastapi.tiangolo.com`
- React -> `react.dev`
- Next.js -> `nextjs.org`
- Expo / React Native -> `docs.expo.dev`, `reactnative.dev`
- Vite -> `vite.dev`
- Tailwind CSS -> `tailwindcss.com`
- Express -> `expressjs.com`
- Rails -> `guides.rubyonrails.org`, `api.rubyonrails.org`
- Laravel -> `laravel.com`
- Go -> `pkg.go.dev`
- Rust -> `docs.rs`, `doc.rust-lang.org`
- Docker -> `docs.docker.com`
- Terraform -> `registry.terraform.io`
- AWS CDK -> `docs.aws.amazon.com`

General-purpose domains that are usually safe:

- `docs.github.com`
- `cli.github.com`

## MCP Suggestions

Suggest MCP servers only for detected integrations.

Common examples:

- Sentry MCP when Sentry is clearly present
- Linear MCP when Linear usage is clearly present

## MCP Guardrails

- Do not suggest GitHub MCP; prefer `gh` CLI commands.
- Do not add MCP servers for services the repo does not use.
- Do not write `.mcp.json` unless there is a concrete detected integration or explicit user request.
