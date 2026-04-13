# Mobile WebSocket Real-Time (Phase 7)

## Context

Add WebSocket real-time to the Huly mobile app. Currently uses REST polling (10-30s staleTime). This phase adds a sidecar WebSocket connection to the transactor that receives broadcast Tx updates and invalidates TanStack Query caches for instant UI updates.

## Architecture: Sidecar WebSocket

REST remains primary for queries and mutations. WebSocket is used exclusively for receiving server-pushed Tx broadcasts → TanStack Query invalidation. JSON-only mode (no binary/compression) to avoid msgpackr dependencies.

## Tasks: 12 (TASK-WSR-001 through TASK-WSR-012)

See mobile-websocket.json for full task DAG.

Key tasks:
- RN WebSocket Factory (ClientSocketFactory implementation)
- Lightweight Transactor Connection (hello, ping/pong, broadcast Tx handling)
- WebSocket Zustand Store (status lifecycle)
- Tx-to-QueryKey Invalidation Engine
- Per-domain invalidation rules (chat, notification, tracker)
- Reduced polling intervals when WS connected
- Connection status indicator UI
- AppState/network lifecycle management

Critical path: WSR-011 → WSR-001 → WSR-002 → WSR-004 → WSR-005/006/007 → WSR-008 → WSR-012
