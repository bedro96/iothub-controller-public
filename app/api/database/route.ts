import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Run a raw MongoDB command via Prisma. Prisma's type definitions don't expose
 *  $runCommandRaw on the standard client type, so we use a typed helper. */
async function runCommand(command: Record<string, unknown>): Promise<Record<string, unknown>> {
  return (prisma as unknown as { $runCommandRaw: (cmd: Record<string, unknown>) => Promise<Record<string, unknown>> })
    .$runCommandRaw(command)
}

/**
 * GET /api/database
 *
 * Returns MongoDB / Azure Cosmos DB (Mongo-compatible) stats via Prisma's
 * runCommandRaw. No authentication required (read-only stats endpoint).
 */
export async function GET() {
  try {
    // Database-level stats (document counts, storage size, etc.)
    const dbStats = await runCommand({ dbStats: 1, scale: 1024 })

    // Per-collection stats
    const collectionNames: string[] = [
      'User',
      'Session',
      'PasswordResetToken',
      'Device',
      'AuditLog',
      'DeviceCommand',
      'DeviceId',
      'Telemetry',
    ]

    // Prisma model → Mongo collection name mapping
    const modelToCollection: Record<string, string> = {
      User: 'User',
      Session: 'Session',
      PasswordResetToken: 'PasswordResetToken',
      Device: 'Device',
      AuditLog: 'AuditLog',
      DeviceCommand: 'DeviceCommand',
      DeviceId: 'deviceids',
      Telemetry: 'telemetries',
    }

    const collectionStats = await Promise.all(
      collectionNames.map(async (model) => {
        const collName = modelToCollection[model]
        try {
          const stats = await runCommand({ collStats: collName, scale: 1024 })
          return {
            model,
            collection: collName,
            count: stats.count ?? 0,
            sizeKb: stats.size ?? 0,
            storageSizeKb: stats.storageSize ?? 0,
            avgObjSizeBytes: stats.avgObjSize ?? 0,
          }
        } catch {
          // Collection might not exist yet
          return { model, collection: collName, count: 0, sizeKb: 0, storageSizeKb: 0, avgObjSizeBytes: 0 }
        }
      })
    )

    // Quick document counts directly from Prisma for accuracy
    const [users, sessions, devices, auditLogs, deviceCommands, telemetry] = await Promise.all([
      prisma.user.count(),
      prisma.session.count(),
      prisma.device.count(),
      prisma.auditLog.count(),
      prisma.deviceCommand.count(),
      prisma.telemetry.count(),
    ])

    return NextResponse.json({
      database: {
        name: dbStats.db ?? 'iothub',
        collections: dbStats.collections ?? 0,
        objects: dbStats.objects ?? 0,
        dataSizeKb: dbStats.dataSize ?? 0,
        storageSizeKb: dbStats.storageSize ?? 0,
        indexSizeKb: dbStats.indexSize ?? 0,
        avgObjSizeBytes: dbStats.avgObjSize ?? 0,
      },
      collections: collectionStats,
      counts: {
        users,
        sessions,
        devices,
        auditLogs,
        deviceCommands,
        telemetry,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching database stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database statistics' },
      { status: 500 }
    )
  }
}
