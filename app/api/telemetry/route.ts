import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/telemetry
 *
 * Returns recent D2C telemetry records. Used by the IoT dashboard page.
 * Supports `limit` (max 200) and `deviceId` query parameters.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const deviceId = searchParams.get('deviceId') ?? undefined

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const where = {
      ...(deviceId ? { deviceId } : {}),
      createdAt: { gte: tenMinutesAgo },
    }

    // Fetch a larger batch so we can deduplicate server-side.
    // Using `distinct` on MongoDB via Prisma can return an arbitrary record per
    // device rather than the most-recent one, so we sort newest-first and
    // deduplicate in application code instead.
    // Cap the raw fetch at 2 000 rows to keep latency acceptable while still
    // covering up to 200 distinct devices even if each has many records.
    const RAW_FETCH_CAP = 2000
    const rawLimit = deviceId ? limit : Math.min(limit * 10, RAW_FETCH_CAP)

    const records = await prisma.telemetry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: rawLimit,
    })

    // Helper to convert values that JSON.stringify can't handle (BigInt)
    const safeSerialize = (value: unknown): unknown => {
      if (typeof value === 'bigint') return value.toString()
      if (value instanceof Date) return value.toISOString()
      if (Array.isArray(value)) return value.map(safeSerialize)
      if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          out[k] = safeSerialize(v)
        }
        return out
      }
      return value
    }

    // For the unfiltered case return only the latest record per device.
    if (!deviceId) {
      const seen = new Set<string>()
      const telemetry: typeof records = []
      for (const record of records) {
        if (!seen.has(record.deviceId)) {
          seen.add(record.deviceId)
          telemetry.push(record)
          if (telemetry.length >= limit) break
        }
      }
      return NextResponse.json({ telemetry: telemetry.map(safeSerialize) })
    }

    return NextResponse.json({ telemetry: records.map(safeSerialize) })
  } catch (error) {
    console.error('Error fetching telemetry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch telemetry' },
      { status: 500 }
    )
  }
}
