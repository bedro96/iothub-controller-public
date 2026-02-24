# IoTHub Controller

A production-ready IoT Hub Management System built with Next.js 16, featuring JWT authentication, WebSocket support, device management, Azure IoT Hub integration, system monitoring, and comprehensive logging.

## 🚀 Features

### Authentication & Security
- ✅ JWT-based session management with HTTP-only cookies
- ✅ Secure password hashing with bcryptjs
- ✅ Password reset with time-limited tokens
- ✅ Rate limiting with configurable windows and allowlist
- ✅ CSRF protection with exception management
- ✅ Role-based access control (Admin/User)
- ✅ Session management with database storage

### Device Management
- ✅ Full CRUD operations for IoT devices
- ✅ Real-time device status updates via WebSocket
- ✅ Device metadata storage
- ✅ Last-seen timestamps and connection status tracking
- ✅ Device ID generation and UUID assignment
- ✅ Device command tracking (pending/sent/completed/failed)

### IoT Hub Integration
- ✅ Azure IoT Hub device connection string provisioning
- ✅ Device-to-Cloud (D2C) telemetry consumer via Azure Event Hubs
- ✅ Telemetry storage in MongoDB with per-device querying
- ✅ IoT dashboard and settings management pages
- ✅ Simulator control page for testing device workflows

### Monitoring & Logging
- ✅ System statistics dashboard
- ✅ Real-time log viewer (Application/Error/HTTP logs)
- ✅ Winston with daily rotating file logs
- ✅ Audit log database with searchable history
- ✅ Auto-refresh monitoring (30-second intervals)
- ✅ Connection manager health endpoint

### WebSocket Support
- ✅ Native WebSocket server for IoT device connections (`/ws/{uuid}`)
- ✅ MessageEnvelope protocol for structured device communication
- ✅ Automatic device ID assignment on first connection
- ✅ Device connection/disconnection status tracking

### UI/UX
- ✅ Dark mode toggle with next-themes
- ✅ Shadcn UI + Tailwind CSS components
- ✅ Responsive design
- ✅ Consistent navigation across pages

## 📋 Tech Stack

- **Framework:** Next.js 16.1.6 with App Router
- **Language:** TypeScript
- **Database:** MongoDB with Prisma ORM
- **Authentication:** JWT with jose library
- **WebSocket:** Native `ws` library (device connections via `/ws/{uuid}`)
- **IoT:** Azure Event Hubs (`@azure/event-hubs`) for D2C telemetry consumption
- **Logging:** Winston with daily-rotate-file
- **Styling:** Tailwind CSS v3 + Shadcn UI
- **Security:** bcryptjs, rate-limit, CSRF protection

## 🛠️ Prerequisites

- Node.js 18+ 
- MongoDB instance (local or Atlas)
- npm or yarn

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bedro96/iothub-controller.git
   cd iothub-controller
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and configure:
   ```env
   DATABASE_URL="mongodb://localhost:27017/iothub-controller"
   JWT_SECRET="your-secure-jwt-secret-key"
   INTERNAL_SERVICE_TOKEN="your-internal-service-token"
   NODE_ENV="development"
   NEXTAUTH_URL="http://localhost:3000"
   LOG_LEVEL="info"
   ```

4. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

5. **Initialize database**
   ```bash
   npm run db:init
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Environment Variables

### Required
- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing

### Optional
- `INTERNAL_SERVICE_TOKEN` - Token for bypassing rate limits
- `NODE_ENV` - Environment (development/production)
- `NEXTAUTH_URL` - Base URL of the application (e.g. `https://yourdomain.com`)
- `LOG_LEVEL` - Logging level (error/warn/info/http/debug)
- `PORT` - Server port (default: 3000)

### IoT Hub Configuration (for device connectivity)
- `IOT_CONNECTION_STRING` - Azure IoT Hub connection string (format: `HostName=your-iothub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=...`)
- `IOT_PRIMARY_KEY_DEVICE` - Device primary shared access key for Azure IoT Hub
- `IOT_SECONDARY_KEY_DEVICE` - Device secondary shared access key for Azure IoT Hub
- `INITIAL_RETRY_TIMEOUT` - Device retry timeout in seconds (default: 30)
- `MAX_RETRY` - Maximum retry attempts (default: 10)
- `MESSAGE_INTERVAL_SECONDS` - Message interval in seconds (default: 5)

### IoT Hub D2C Consumer
- `IOT_EVENTHUB_CONNECTION_STRING` - Azure Event Hub-compatible endpoint connection string for reading D2C messages
- `IOT_EVENTHUB_CONSUMER_GROUP` - Consumer group name (default: `$Default`)
- `IOT_CONSUMER_ENABLED` - Set to `true` to start the D2C consumer automatically with the server (default: disabled)

## 📖 API Documentation

### Authentication Endpoints

#### Sign Up
```
POST /api/auth/signup
Body: { username, email, password }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
Returns: Session cookie
```

#### Logout
```
POST /api/auth/logout
Requires: Valid session
```

#### Get Current Session
```
GET /api/auth/me
Requires: Valid session
Returns: { user: { userId, email, role } }
```

#### Password Reset Request
```
POST /api/auth/password-reset
Body: { email }
```

#### Password Reset Confirm
```
PATCH /api/auth/password-reset
Body: { token, newPassword }
```

### Device Endpoints

#### Get Devices
```
GET /api/devices
Requires: Authentication
Returns: Array of user's devices
```

#### Create Device
```
POST /api/devices
Body: { name, type, metadata? }
Requires: Authentication
```

#### Update Device
```
PATCH /api/devices
Body: { id, name?, type?, status?, metadata? }
Requires: Authentication
```

#### Delete Device
```
DELETE /api/devices?id={deviceId}
Requires: Authentication
```

#### Delete Specific Device ID Entry
```
DELETE /api/devices/delete/{device_id}
Requires: Authentication
```

### User Management (Admin Only)

#### Get All Users
```
GET /api/users
Requires: Admin role
```

#### Update User Role
```
PATCH /api/users
Body: { id, role }
Requires: Admin role
```

#### Delete User
```
DELETE /api/users?id={userId}
Requires: Admin role
```

### Monitoring (Admin Only)

#### Get Logs
```
GET /api/monitoring?type={application|error|http}&lines={number}
Requires: Admin role
```

#### Get Statistics
```
POST /api/monitoring
Requires: Admin role
Returns: { stats, recentAuditLogs }
```

### Environment Configuration (Admin Only)

#### Get All Environment Variables
```
GET /api/dotenv
Requires: Admin role
Returns: { variables: { KEY: "value", ... } }
```

#### Get Single Environment Variable
```
GET /api/dotenv?variable={VARIABLE_NAME}
Requires: Admin role
Returns: { variable, value }
```

#### Update Environment Variable
```
PUT /api/dotenv
Body: { variable, value }
Requires: Admin role
Updates the .env file with the new value (atomic write)
```

## 🤖 IoT Device WebSocket API

### Device Connection Endpoint

IoT devices connect using WebSocket to `/ws/{uuid}` without authentication.

**Connection URL**: `ws://localhost:3000/ws/{device-uuid}`

**No authentication required** - This endpoint is specifically for IoT device communication and bypasses all authentication, rate limiting, and CSRF protection.

### Message Protocol

Messages use the **MessageEnvelope** protocol for structured communication:

```json
{
  "version": 1,
  "type": "request|response|report|command|error",
  "id": "unique-message-id",
  "correlationId": "related-message-id",
  "ts": "2026-02-19T10:41:21.000Z",
  "action": "action-name",
  "status": "success|failure|pending|received",
  "payload": {},
  "meta": {}
}
```

### Device Connection Flow

#### 1. Device Connects
Device establishes WebSocket connection to `/ws/{uuid}` where `uuid` is a unique identifier for the device.

#### 2. Device Requests Configuration
```json
{
  "version": "1.0",
  "type": "request",
  "id": "{device-uuid}",
  "action": "",
  "status": "connected",
  "payload": {"DEVICE_UUID": "{device-uuid}"}
}
```

#### 3. Server Responds with Configuration
```json
{
  "version": 1,
  "type": "response",
  "id": "{new-uuid}",
  "correlationId": "{device-uuid}",
  "action": "device.config.update",
  "status": "success",
  "payload": {
    "device_id": "simdevice0001",
    "IOTHUB_DEVICE_CONNECTION_STRING": "HostName=...",
    "initialRetryTimeout": 30,
    "maxRetry": 10,
    "messageIntervalSeconds": 5
  }
}
```

#### 4. Device Sends Reports
```json
{
  "type": "report",
  "id": "{report-uuid}",
  "payload": {"temperature": 25.5, "humidity": 60.0}
}
```

Server acknowledges:
```json
{
  "version": 1,
  "type": "response",
  "action": "none",
  "status": "received",
  "correlationId": "{report-uuid}"
}
```

#### 5. Server Sends Commands
```json
{
  "version": 1,
  "type": "command",
  "action": "device.start|device.stop|device.restart",
  "status": "pending",
  "payload": {}
}
```

### Connection Manager API Endpoints

#### Health Check
```
GET /api/connectionmanager/health
Returns: { status, timestamp, services, connections }
```

#### Get Connected Clients
```
GET /api/connectionmanager/clients
Returns: { total, active, clients: [...] }
```

#### Send Command to Device
```
POST /api/connectionmanager/commands/{uuid}
Body: { action: "device.start", payload: {} }
Sends command to specific device
```

#### Broadcast Command
```
POST /api/connectionmanager/commands/broadcast
Body: { action: "device.stop", payload: {} }
Requires: Admin role
Sends command to all connected devices
```

#### Store Telemetry Report
```
POST /api/connectionmanager/report/{device_id}
Body: { deviceId, type, modelId, status, temp, humidity, ts }
Stores telemetry data from device
```

#### Get Telemetry (All Devices)
```
GET /api/connectionmanager/telemetry?limit={number}
Returns: { telemetry: [...] } — most recent record per unique deviceId (max 200)
```

#### Delete All Telemetry
```
POST /api/connectionmanager/telemetry
Requires: Admin role
Deletes all telemetry records
```

#### Get Telemetry (Single Device)
```
GET /api/connectionmanager/telemetry/{deviceId}?limit={number}
Returns: { telemetry: [...] } — records for the specified device (max 200)
```

#### Delete Telemetry for Device
```
POST /api/connectionmanager/telemetry/{deviceId}
Requires: Admin role
Deletes all telemetry records for the specified device
```

#### Get Issued Device Mappings Count
```
GET /api/connectionmanager/devicemapping/issued
Requires: Admin role
Returns: { deviceCount } — number of DeviceId entries with a non-null UUID
```

#### Get Next Available Device ID
```
GET /api/connectionmanager/devicemapping/nextid
Requires: Admin role
Returns: { deviceId } — the next unassigned device ID (lowest alphabetically)
```

### Device ID Management API Endpoints

#### Generate Device IDs
```
POST /api/devices/generate/{number_of_devices}
Requires: Valid CSRF token
Returns: { generated_device_ids: ["simdevice0001", ...] }
```

#### Clear Device Mappings
```
POST /api/devices/clear-mappings
Requires: Valid CSRF token
Clears UUID assignments, allowing device IDs to be reassigned on next connection
```

#### Delete All Devices
```
POST /api/devices/delete-all
Headers: x-user-email: user@example.com
Removes all device ID entries and closes WebSocket connections
```

### Java Client Reference

The server is compatible with the Java WebSocket client at `/reference/client/SimulatorWSClient.java`. See `/MIGRATIONREVIEW.md` for detailed protocol documentation.

## 🛡️ Security Configuration

### Rate Limiting

Configure in `lib/rate-limit.ts`:
```typescript
// Add IP to allowlist
import { addToAllowlist } from '@/lib/rate-limit';
addToAllowlist('192.168.1.1');

// Get current allowlist
import { getAllowlist } from '@/lib/rate-limit';
const allowedIPs = getAllowlist();
```

### CSRF Protection

Configure in `lib/csrf.ts`:
```typescript
// Add route exception
import { addCSRFException } from '@/lib/csrf';
addCSRFException('/api/webhook/custom');

// Remove exception
import { removeCSRFException } from '@/lib/csrf';
removeCSRFException('/api/webhook/custom');

// Get all exceptions
import { getCSRFExceptions } from '@/lib/csrf';
const exceptions = getCSRFExceptions();
```

## 📊 Logging

Logs are stored in the `logs/` directory with automatic rotation:

- `application-YYYY-MM-DD.log` - All logs (14 days retention)
- `error-YYYY-MM-DD.log` - Error logs only (30 days retention)
- `http-YYYY-MM-DD.log` - HTTP request logs (7 days retention)

### Log Levels
- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `http` - HTTP request logs
- `debug` - Debug messages

## 🧪 Scripts

```bash
npm run dev          # Start development server (nodemon: tsc compile + node dist/server.js)
npm run build        # Build Next.js app and compile server TypeScript
npm start            # Start production server (node dist/server.js)
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:init      # Initialize database collections
npm run consumer     # Start IoT Hub D2C consumer as a standalone process
```

## 📱 Pages

- `/` - Home page with navigation
- `/signup` - User registration
- `/login` - User authentication
- `/devices` - Device management (authenticated)
- `/admin` - Admin dashboard (admin only)
- `/admin/usermanagement` - User management (admin only)
- `/monitoring` - System monitoring dashboard (admin only)
- `/iot-dashboard` - IoT device telemetry dashboard (public)
- `/iot-settings` - IoT Hub settings and device configuration (public)
- `/simulator-control` - Simulator device control panel (public)

## 🔧 Creating an Admin User

1. Sign up normally at `/signup`
2. Connect to MongoDB and run:
   ```javascript
   db.User.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a strong `JWT_SECRET` (minimum 32 characters)
3. Configure MongoDB Atlas or secure MongoDB instance
4. Enable HTTPS (required for secure cookies)
5. Set up a process manager like PM2
6. Configure a reverse proxy (nginx/Apache)
7. Set up log aggregation and monitoring
8. Enable automated backups

### PM2 Example
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'iothub-controller',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Build first, then run with: `npm run build && pm2 start ecosystem.config.js --env production`

## ☁️ IoT Hub D2C Consumer

The IoT Hub D2C (Device-to-Cloud) consumer subscribes to the Azure Event Hub-compatible endpoint of an Azure IoT Hub and continuously saves incoming telemetry messages to the MongoDB `Telemetry` collection.

### Starting the consumer

**Option 1: Alongside the server (automatic)**

Set `IOT_CONSUMER_ENABLED=true` in your `.env`. The consumer starts automatically when the server starts.

**Option 2: Standalone process**

```bash
npm run consumer
```

This runs `scripts/start-iothub-consumer.ts` using `tsx` and is useful for running the consumer in a separate process or container.

### Required environment variables

- `IOT_EVENTHUB_CONNECTION_STRING` - Event Hub-compatible endpoint connection string from the Azure IoT Hub
- `IOT_EVENTHUB_CONSUMER_GROUP` - Consumer group (default: `$Default`)

### Telemetry data format

The consumer accepts messages with either capitalized or lowercase field names:

| Field | Accepted keys | Default |
|-------|--------------|---------|
| deviceId | `deviceId`, `DeviceId` | (required) |
| type | `Type`, `type` | `""` |
| modelId | `modelId`, `ModelId` | `""` |
| status | `Status`, `status` | `""` |
| temp | `temp` | `20` |
| humidity | `Humidity`, `humidity` | `50` |
| ts | `ts` | current ISO timestamp |

## 🐛 Troubleshooting

### WebSocket Issues
- Ensure the custom server (`server.ts`) is running
- Check JWT token validity
- Verify firewall allows WebSocket connections

### Database Connection
- Verify MongoDB is accessible
- Check DATABASE_URL format
- Ensure IP allowlist is configured (MongoDB Atlas)

### Rate Limiting
- Check if IP is in allowlist for exceptions
- Verify `INTERNAL_SERVICE_TOKEN` for service calls
- Review rate limit configuration

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
