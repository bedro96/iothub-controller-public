# Skill: WebSockets (ws + Socket.IO)

## Overview

The app runs **two** WebSocket layers, both attached to the same Node `http` server in `server.ts`:

1. **Native `ws` server** for **device connections** at `/ws/{uuid}`. Devices (or the local simulator) connect here, exchanging structured `MessageEnvelope` payloads. New devices receive an auto-assigned UUID on first connect.
2. **Socket.IO server** for **browser-side real-time UI** (live device status, dashboard updates).

A central **`connectionManager`** (`lib/connection-manager.ts`) tracks live device sockets and exposes a health endpoint backing.

## Where it lives

| Path                          | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `server.ts`                   | Mounts both `WebSocketServer` (`ws`) and `SocketIOServer` on the HTTP server |
| `lib/connection-manager.ts`   | Singleton registry of live device sockets + status helpers               |
| `lib/message-envelope.ts`     | Wire-format shared by all device messages                                |
| `app/api/connectionmanager/*` | Health/inspection endpoints                                              |
| `app/simulator-control/`      | UI for driving the local device simulator                                |
| `scripts/test-device-connection.js` | Manual ws probe                                                    |

## How `server.ts` wires it up

```ts
const server = createServer(async (req, res) => { /* http handler */ })

// 1) Native ws for /ws/{uuid}
const wss = new WebSocketServer({ noServer: true })
server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url!, true)
  if (pathname?.startsWith('/ws/')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  } else {
    // Let socket.io handle its own upgrades
  }
})

// 2) Socket.IO for the browser
const io = new SocketIOServer(server, { /* options */ })

server.listen(port)
```

Key points:

* Both servers share **one HTTP listener** — there is no separate port.
* The `upgrade` handler **routes by path** to avoid clashing with Socket.IO's own handshake at `/socket.io/`.
* Background tasks (`startIoTHubConsumer`, rate-limit cleanup) start *after* the listener.

## Device protocol (MessageEnvelope)

All device messages must conform to `MessageEnvelopeData` (`lib/message-envelope.ts`):

```ts
{
  version?: number
  type: string             // "telemetry" | "command" | "ack" | ...
  id?: string              // auto-generated if missing
  correlationId?: string   // tie response to request
  ts?: string              // ISO timestamp
  action: string           // verb — "report", "set", "request", ...
  status?: string          // "ok" | "error" | ...
  payload?: Record<string, any>
  meta?: Record<string, any>
}
```

**Always** construct outgoing envelopes via `new MessageEnvelope({...})` so `id` and `ts` are populated. **Always** validate inbound envelopes before acting on them — the field types are advisory until verified.

## Conventions

### Native `ws` (device side)

* Path is **`/ws/{uuid}`**. If `{uuid}` is empty or `new`, the server assigns one via `randomUUID()` and sends it back in an envelope so the device can persist it.
* Authenticate the upgrade where possible (token in query string verified via `verifyToken` from `lib/auth.ts`). Reject unauthenticated upgrades by closing the socket with code `1008`.
* Register every connected socket with `connectionManager.add(uuid, ws)`; remove on `close`/`error`.
* Wrap message handlers in try/catch and call `logError(...)` — an uncaught throw kills the listener.

### Socket.IO (browser side)

* Use **rooms** (e.g., one per device id) so broadcasts are scoped, not global.
* Emit small, JSON-serializable payloads — don't ship Prisma model objects directly.
* Authenticate the handshake (`io.use(...)`) with the same JWT cookie used for HTTP.
* Don't import `socket.io` into client components. Use `socket.io-client` on the browser side (currently not a dependency — add it deliberately if you build a browser realtime feature).

### Connection manager

`lib/connection-manager.ts` is the **single source of truth** for which devices are connected. Don't keep parallel `Map<string, WebSocket>` structures elsewhere.

* `connectionManager.add(deviceId, socket)` on connect.
* `connectionManager.remove(deviceId)` on close/error.
* Use it from API handlers to check `online` status or to push C2D commands without going through IoT Hub.

### Heartbeats

For long-lived device sockets, implement ping/pong (`ws.ping()`) every ~30s. Drop the socket if no pong is received within a window. The current implementation should already handle this — extend it consistently rather than rolling your own per-handler.

## How-to: common tasks

### Send a command to a connected device

```ts
import { connectionManager } from '@/lib/connection-manager'
import { MessageEnvelope } from '@/lib/message-envelope'

const socket = connectionManager.get(deviceId)
if (!socket) return NextResponse.json({ error: 'device offline' }, { status: 409 })

const envelope = new MessageEnvelope({
  type: 'command',
  action: 'set',
  payload: { temperature: 21 },
})
socket.send(JSON.stringify(envelope))
```

### Add a new device message type

1. Define the type/action constants in (or near) `lib/message-envelope.ts`.
2. Handle it in the `wss.on('connection', ...)` flow in `server.ts`.
3. Persist anything user-visible (`prisma.telemetry.create`, `prisma.deviceCommand.update`, etc.).
4. Emit a Socket.IO event so any open browser dashboard updates immediately.

### Test locally

```bash
npm run dev                          # starts the full server (Next + ws + socket.io)
node scripts/test-device-connection.js   # opens a sample ws connection
```

The simulator UI at `/simulator-control` is the easiest way to drive flows end-to-end.

## Pitfalls

* **Don't run `next dev` in isolation** for ws-related work. Plain `next dev` doesn't load `server.ts`, so neither WebSocket layer exists. Use `npm run dev`.
* **The `upgrade` event is a one-shot router.** Once you `socket.destroy()` or `handleUpgrade()`, you can't try again. Make sure your routing logic in `server.ts` covers all expected paths.
* **`ws` events run on the Node event loop** — heavy synchronous work in a `message` handler will starve other connections. Offload CPU-bound work.
* **Memory leaks from the connection manager.** Always remove on both `close` *and* `error`. Forgetting either lets dead sockets accumulate.
* **Don't `JSON.stringify` a circular object** (Prisma sometimes returns relations with cycles). Map to a plain DTO first.
* **`MessageEnvelope` payloads are `any`-typed.** Treat them as untrusted input — validate fields and types before acting.
* **CSRF doesn't cover WebSocket upgrades.** Authenticate the handshake explicitly with the session cookie or a query token.

## References

* `server.ts` — wiring of both layers
* `lib/connection-manager.ts`
* `lib/message-envelope.ts`
* `app/api/connectionmanager/*`
* `scripts/test-device-connection.js`
* `docs/WEBSOCKET_TESTING.md`
* `ws` docs: <https://github.com/websockets/ws>
* Socket.IO docs: <https://socket.io/docs/v4/>
