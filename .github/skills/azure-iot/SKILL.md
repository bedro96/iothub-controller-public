# Skill: Azure IoT Hub Integration

## Overview

The app integrates with **Azure IoT Hub** in two directions:

1. **Provisioning / management** — creating devices, fetching connection strings, sending C2D messages — via the **`azure-iothub`** package and **`@azure/identity`**.
2. **Telemetry consumption (D2C)** — reading device-to-cloud messages off the IoT Hub's built-in Event Hubs endpoint via **`@azure/event-hubs`** and persisting them as `Telemetry` rows in MongoDB.

A **WebSocket simulator path** (`/ws/{uuid}`) also exists for local device testing — see [websockets skill](../websockets/SKILL.md). Device messages on either path are wrapped in the **`MessageEnvelope`** structure for consistency.

## Where it lives

| Path                                    | Purpose                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `lib/iothub-consumer.ts`                | `EventHubConsumerClient` — D2C telemetry consumer, persists to `Telemetry`  |
| `lib/connection-manager.ts`             | In-memory connection registry + health endpoint backing                     |
| `lib/message-envelope.ts`               | `MessageEnvelope` class + `MessageEnvelopeData` interface                   |
| `app/api/iot-hub/*` and `app/api/iothub/*` | Route handlers for hub management actions                                |
| `app/iot-hub/`, `app/iot-dashboard/`, `app/iot-settings/`, `app/simulator-control/` | UI pages                          |
| `scripts/start-iothub-consumer.ts`      | Standalone consumer entrypoint — `npm run consumer`                         |
| `scripts/test-device-connection.js`     | Manual probe for device connectivity                                        |
| `reference/`                            | Reference scripts / Python originals (`Iotdevice.txt`, `iot-batch.js`)      |

## Telemetry consumer flow

1. `server.ts` calls `startIoTHubConsumer()` after `app.prepare()`.
2. `lib/iothub-consumer.ts` creates an `EventHubConsumerClient` against the IoT Hub's built-in Event Hub endpoint, on consumer group `process.env.IOT_EVENTHUB_CONSUMER_GROUP || '$Default'`.
3. Each event body is parsed via `parseTelemetryBody()` — which tolerates both **capitalized** (`Type`, `Status`, `Humidity`) and **lowercase** field names so it works with multiple device firmware versions.
4. Successful parses are persisted as `Telemetry` documents (`prisma.telemetry.create({...})`).
5. All steps log via `logInfo` / `logWarn` / `logError`.

### Required environment variables (see `.env.example`)

| Variable                          | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `IOT_EVENTHUB_CONNECTION_STRING`  | Built-in Event Hub-compatible endpoint of the IoT Hub    |
| `IOT_EVENTHUB_CONSUMER_GROUP`     | Consumer group (defaults to `$Default`)                  |
| `IOTHUB_CONNECTION_STRING`        | Service-level IoT Hub connection string for management   |
| `DATABASE_URL`                    | MongoDB connection string (telemetry storage)            |

Always look up the canonical list in `.env.example` before adding new variables.

## MessageEnvelope

`lib/message-envelope.ts` defines the structured wire format used by both the WebSocket simulator and (logically) D2C messages:

```ts
interface MessageEnvelopeData {
  version?: number
  type: string         // e.g., "telemetry", "command", "ack"
  id?: string          // generated via randomUUID() if missing
  correlationId?: string
  ts?: string          // ISO timestamp
  action: string       // verb-like — "report", "set", "request"
  status?: string
  payload?: Record<string, any>
  meta?: Record<string, any>
}
```

When emitting a message from the server, **construct via `new MessageEnvelope({...})`** so you get auto-generated `id`/`ts` and a stable shape. When parsing inbound, treat the envelope fields as untrusted and validate before persisting.

## Conventions

### Always go through the consumer abstraction

Don't open ad-hoc `EventHubConsumerClient` instances elsewhere. If you need additional processing on the same partitions, extend `lib/iothub-consumer.ts` (e.g., add a second handler) so checkpointing and reconnect logic remain centralized.

### Tolerant parsing

Device firmware varies. New parsers should:

* Accept multiple casings of the same key (see the `str()` helper inside `parseTelemetryBody`).
* Default missing optional fields rather than throwing.
* Log a `logWarn` with the offending payload (not the full body if it may contain secrets) when a required field is missing — and return `null` instead of `throw` so the consumer keeps draining.

### Don't block the consumer loop

The consumer's `processEvents` runs sequentially per partition. Keep work fast: for heavy enrichment, write the raw event then enqueue async post-processing (e.g., a separate worker reading from `Telemetry`).

### Connection strings stay in env

Never log `IOT_EVENTHUB_CONNECTION_STRING` or `IOTHUB_CONNECTION_STRING`. If you need diagnostic logging, log the **hub name only** (parse it from the conn string).

## How-to: common tasks

### Run the consumer as a standalone process

```bash
npm run consumer        # tsx scripts/start-iothub-consumer.ts
```

This is useful for development when you don't want to run the full Next + WebSocket server.

### Add a new device-management endpoint

1. Use `azure-iothub` (`Registry.fromConnectionString(...)`) inside an `app/api/iot-hub/.../route.ts`.
2. Authenticate the request first (admin-only — `verifyToken` and check `role === 'admin'`).
3. Wrap calls in try/catch; surface 4xx for invalid input, 5xx for hub errors.
4. Mirror device records in MongoDB via `prisma.device.upsert(...)` so the UI sees them without a hub round-trip.

### Add a new telemetry field

1. Update the `Telemetry` model in `prisma/schema.prisma`, then `npm run db:push && npm run db:generate`.
2. Extend `parseTelemetryBody` in `lib/iothub-consumer.ts` to read the new field tolerantly.
3. Update consumer page(s) under `app/iot-dashboard/` to render it.

## Pitfalls

* **`$Default` consumer group is shared.** Multiple processes consuming the same partition with the same consumer group will receive non-deterministic events. Use a dedicated consumer group per service in production.
* **Checkpointing.** The current consumer reads from `latestEventPosition` / `earliestEventPosition` without persistent checkpoints — restarting may replay or skip messages. If you need exactly-once-ish semantics, add a checkpoint store (e.g., Blob).
* **MongoDB write rate.** A high-volume telemetry stream will hammer the DB. Consider batching `prisma.telemetry.createMany({...})` if you raise the throughput.
* **Don't import `lib/iothub-consumer.ts` from a client component.** It pulls Azure SDK code that won't run in the browser. The consumer is started exclusively from `server.ts` / the standalone script.
* **`@azure/identity` + Managed Identity.** When deploying to Azure, prefer `DefaultAzureCredential` over connection strings; the dependency is already present.

## References

* `lib/iothub-consumer.ts`
* `lib/message-envelope.ts`
* `lib/connection-manager.ts`
* `scripts/start-iothub-consumer.ts`
* `.env.example`
* Azure docs: <https://learn.microsoft.com/azure/iot-hub/> and <https://learn.microsoft.com/javascript/api/overview/azure/event-hubs-readme>
