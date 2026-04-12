# lokei Command Reference

## Core Commands

### Run a dev server with HTTPS

```bash
lokei run                    # Auto-detects framework from package.json
lokei run next dev           # Explicit command
lokei run --name myapp       # Override project name -> myapp.test
lokei run --port 3000        # Use specific port instead of auto-assigned
lokei run --expose           # Also create a public tunnel
```

The project name is inferred from (in order): `--name` flag, `package.json` name, git remote, or directory name.

### Share localhost publicly

```bash
lokei share --port 3000                       # Random URL at lokei.dev
lokei share --port 3000 --subdomain myapp     # Request specific subdomain
lokei share --port 3000 --password secret123  # Password-protected
lokei share --port 3000 --ttl 3600            # Expires in 1 hour
```

### Docker Compose integration

```bash
lokei docker up              # HTTPS domains for all Compose services
lokei docker down            # Tear down
```

Each Compose service gets `<service>.test` with HTTPS.

### Multi-service orchestration

```bash
lokei up                     # Start services from .test.yaml
lokei down                   # Stop all services
```

Example `.test.yaml`:

```yaml
services:
  web:
    cmd: next dev
    name: myapp
  api:
    cmd: node server.js
    name: api
    port: 3001
```

### Route and tunnel management

```bash
lokei routes ls              # List active .test routes
lokei tunnel list            # List active tunnels
lokei tunnel close <id>      # Close a tunnel
lokei inspect                # Open traffic inspector at inspect.test
```

### Authentication (stable tunnel URLs)

```bash
lokei login                  # Device-code auth -> opens browser
```

After login, tunnels get stable URLs at `<username>.lokei.dev`.

### OS service mode

```bash
lokei service install        # Install as launchd/systemd service
lokei service start / stop / status / logs
```

### Diagnostics

```bash
lokei doctor                 # Check CA, DNS, ports, trust store
lokei logs                   # View traffic logs
lokei logs --follow          # Stream logs in real-time
```

### Cleanup

```bash
lokei uninstall              # Remove everything: certs, DNS, ports, trust
```

## Framework Detection

lokei detects 30+ frameworks and injects the correct port and host flags:

| Framework | Detection | Flags injected |
|-----------|-----------|----------------|
| Next.js | `next dev` | `--port PORT` |
| Vite | `vite`, `vite dev` | `--port PORT --host 127.0.0.1` |
| Astro | `astro dev` | `--port PORT --host 127.0.0.1` |
| Rails | `rails server` | `-p PORT -b 127.0.0.1` |
| Django | `python manage.py runserver` | `127.0.0.1:PORT` |
| Laravel | `php artisan serve` | `--port=PORT --host=127.0.0.1` |
| Flask | `flask run` | `--port PORT --host 127.0.0.1` |
| Angular | `ng serve` | `--port PORT` |
| Nuxt | `nuxt dev` | `--port PORT` |
| Hugo | `hugo server` | `--port PORT` |
| npm/yarn/pnpm/bun | Script runner | `PORT` env var |

For unlisted frameworks, lokei sets `PORT` environment variable.

## Architecture

- **State directory**: `~/.lokei/`
- **Port range**: 4000-5999 (sticky across restarts)
- **TLD**: `.test` (RFC 2606 reserved)
- **DNS**: Local resolver on 127.0.0.1:15353, wired via `/etc/resolver/test` on macOS
- **Port forwarding**: 80->15080, 443->15443 via pfctl (macOS), iptables (Linux)
- **TLS**: Per-host exact-match certs via SNI
- **IPC**: JSON over Unix socket (macOS/Linux), Named Pipe (Windows)
- **Tunnel relay**: WebSocket + MessagePack at `relay.lokei.dev`

## Git Worktree Support

- Main branch: `myapp.test`
- Feature branch in worktree: `fix-ui.myapp.test`

Prefix is added automatically when multiple worktrees exist.

## Scenario Quick Reference

| Scenario | Command |
|----------|---------|
| Start working on a project | `lokei run` |
| Start with explicit command | `lokei run next dev` |
| Share with a teammate | `lokei share --port 3000` or `lokei run --expose` |
| Docker project | `lokei docker up` |
| Multiple services | `lokei up` (requires `.test.yaml`) |
| Debug network issues | `lokei inspect` |
| Check what's running | `lokei routes ls` |
| Something broken | `lokei doctor` |
| Run on boot | `lokei service install` |
| Remove everything | `lokei uninstall` |
