import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Generate a SAS token for Azure IoT Hub REST API calls.
 */
function generateSasToken(resourceUri: string, key: string, policyName: string, expiresInSecs = 3600): string {
  const expiry = Math.floor(Date.now() / 1000) + expiresInSecs
  const encoded = encodeURIComponent(resourceUri)
  const toSign = `${encoded}\n${expiry}`
  const hmac = crypto.createHmac('sha256', Buffer.from(key, 'base64'))
  hmac.update(toSign)
  const signature = encodeURIComponent(hmac.digest('base64'))
  return `SharedAccessSignature sr=${encoded}&sig=${signature}&se=${expiry}&skn=${policyName}`
}

/**
 * Parse an IoT Hub connection string into its component parts.
 */
function parseConnectionString(cs: string): { hostname: string; policyName: string; key: string } | null {
  try {
    const parts: Record<string, string> = {}
    for (const segment of cs.split(';')) {
      const idx = segment.indexOf('=')
      if (idx < 0) continue
      parts[segment.slice(0, idx)] = segment.slice(idx + 1)
    }
    const hostname = parts['HostName']
    const policyName = parts['SharedAccessKeyName']
    const key = parts['SharedAccessKey']
    if (!hostname || !policyName || !key) return null
    return { hostname, policyName, key }
  } catch {
    return null
  }
}

/**
 * GET /api/iot-hub
 *
 * Returns IoT Hub statistics gathered from:
 * - Azure IoT Hub REST API (device count, message stats) using IOT_CONNECTION_STRING
 * - Prisma telemetry collection (local D2C message counts)
 */
export async function GET() {
  const connectionString = process.env.IOT_CONNECTION_STRING
  const parsed = connectionString ? parseConnectionString(connectionString) : null

  let hubStats: Record<string, unknown> = {}
  let registryDevices: unknown[] = []
  let hubError: string | null = null

  if (parsed) {
    const { hostname, policyName, key } = parsed
    const resourceUri = hostname
    const sasToken = generateSasToken(resourceUri, key, policyName)
    const baseUrl = `https://${hostname}`
    const apiVersion = '2021-04-12'
    const headers: HeadersInit = { Authorization: sasToken, 'Content-Type': 'application/json' }

    try {
      // Query device registry — first page (up to 100 devices)
      const regRes = await fetch(
        `${baseUrl}/devices?top=100&api-version=${apiVersion}`,
        { headers, cache: 'no-store' }
      )
      if (regRes.ok) {
        registryDevices = await regRes.json() as unknown[]
      } else {
        hubError = `Registry query failed: ${regRes.status} ${regRes.statusText}`
      }
    } catch (err) {
      hubError = err instanceof Error ? err.message : 'Unknown error reaching IoT Hub'
    }

    try {
      // IoT Hub stats endpoint
      const statsRes = await fetch(
        `${baseUrl}/statistics/devices?api-version=${apiVersion}`,
        { headers, cache: 'no-store' }
      )
      if (statsRes.ok) {
        hubStats = await statsRes.json() as Record<string, unknown>
      }
    } catch {
      // non-fatal; some tiers may not expose this endpoint
    }
  }

  // Local telemetry stats from Prisma
  const [totalMessages, uniqueDevices, latestMessages] = await Promise.all([
    prisma.telemetry.count(),
    prisma.telemetry.findMany({ distinct: ['deviceId'], select: { deviceId: true } }),
    prisma.telemetry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { deviceId: true, status: true, temp: true, humidity: true, createdAt: true },
    }),
  ])

  // Status distribution from latest record per device
  const latestPerDevice = await prisma.telemetry.findMany({
    distinct: ['deviceId'],
    orderBy: { createdAt: 'desc' },
    select: { deviceId: true, status: true },
  })

  const statusCounts = latestPerDevice.reduce<Record<string, number>>((acc, r) => {
    const s = (r.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    hub: {
      hostname: parsed?.hostname ?? null,
      connected: parsed !== null,
      error: hubError,
      stats: hubStats,
      registryDeviceCount: registryDevices.length,
    },
    telemetry: {
      totalMessages,
      uniqueDevices: uniqueDevices.length,
      statusCounts,
      latestMessages,
    },
    timestamp: new Date().toISOString(),
  })
}
