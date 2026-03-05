import { NextResponse } from 'next/server'
import os from 'os'

/**
 * GET /api/server-performance
 *
 * Returns server performance metrics: CPU usage, memory usage, and basic
 * network interface info. No authentication required (public metrics).
 */
export async function GET() {
  try {
    // CPU info
    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model ?? 'Unknown'
    const cpuCount = cpus.length

    // Calculate aggregate CPU usage from cpu times
    let totalIdle = 0
    let totalTick = 0
    for (const cpu of cpus) {
      for (const type of Object.values(cpu.times)) {
        totalTick += type
      }
      totalIdle += cpu.times.idle
    }
    const cpuUsagePercent = ((1 - totalIdle / totalTick) * 100)

    // Memory info
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memUsagePercent = (usedMem / totalMem) * 100

    // Network interfaces
    const nets = os.networkInterfaces()
    const networkInterfaces = Object.entries(nets).map(([name, addrs]) => ({
      name,
      addresses: (addrs ?? []).map(a => ({
        address: a.address,
        family: a.family,
        internal: a.internal,
      })),
    }))

    // Uptime
    const uptimeSeconds = os.uptime()

    // Load average (Unix-like only; Windows returns [0,0,0])
    const loadAvg = os.loadavg()

    // Platform info
    const platform = os.platform()
    const arch = os.arch()
    const hostname = os.hostname()

    return NextResponse.json({
      cpu: {
        model: cpuModel,
        count: cpuCount,
        usagePercent: parseFloat(cpuUsagePercent.toFixed(2)),
        loadAvg: loadAvg.map(v => parseFloat(v.toFixed(2))),
      },
      memory: {
        totalBytes: totalMem,
        usedBytes: usedMem,
        freeBytes: freeMem,
        usagePercent: parseFloat(memUsagePercent.toFixed(2)),
      },
      network: {
        interfaces: networkInterfaces,
      },
      system: {
        platform,
        arch,
        hostname,
        uptimeSeconds,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching server performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch server performance metrics' },
      { status: 500 }
    )
  }
}
