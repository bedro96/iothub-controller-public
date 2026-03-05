"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminNav } from "@/components/admin-nav"
import { Cpu, MemoryStick, Network, Server, Clock } from "lucide-react"

type ServerPerf = {
  cpu: {
    model: string
    count: number
    usagePercent: number
    loadAvg: number[]
  }
  memory: {
    totalBytes: number
    usedBytes: number
    freeBytes: number
    usagePercent: number
  }
  network: {
    interfaces: {
      name: string
      addresses: { address: string; family: string; internal: boolean }[]
    }[]
  }
  system: {
    platform: string
    arch: string
    hostname: string
    uptimeSeconds: number
  }
  timestamp: string
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function UsageBar({ percent, color = "bg-primary" }: { percent: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2.5 mt-2">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

export default function ServerPerformancePage() {
  const [data, setData] = useState<ServerPerf | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/server-performance')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ServerPerf = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const cpuColor =
    (data?.cpu.usagePercent ?? 0) > 80 ? "bg-red-500" :
    (data?.cpu.usagePercent ?? 0) > 60 ? "bg-yellow-500" : "bg-green-500"

  const memColor =
    (data?.memory.usagePercent ?? 0) > 85 ? "bg-red-500" :
    (data?.memory.usagePercent ?? 0) > 70 ? "bg-yellow-500" : "bg-blue-500"

  return (
    <div className="min-h-screen bg-background">
      <AdminNav title="Server Performance" onRefresh={fetchData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Server Performance</h2>
            <p className="text-muted-foreground">
              Real-time performance metrics for the WebSocket server
            </p>
          </div>
          {lastRefresh && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
                <CardContent><div className="h-8 bg-muted rounded w-3/4 mb-2" /><div className="h-2.5 bg-muted rounded w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Top metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* CPU Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.cpu.usagePercent}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{data.cpu.count} cores · {data.cpu.model.split('@')[0].trim()}</p>
                  <UsageBar percent={data.cpu.usagePercent} color={cpuColor} />
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    <div>Load 1m: <span className="font-medium text-foreground">{data.cpu.loadAvg[0]}</span></div>
                    <div>Load 5m: <span className="font-medium text-foreground">{data.cpu.loadAvg[1]}</span></div>
                    <div>Load 15m: <span className="font-medium text-foreground">{data.cpu.loadAvg[2]}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Memory Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.memory.usagePercent}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBytes(data.memory.usedBytes)} of {formatBytes(data.memory.totalBytes)} used
                  </p>
                  <UsageBar percent={data.memory.usagePercent} color={memColor} />
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    <div>Used: <span className="font-medium text-foreground">{formatBytes(data.memory.usedBytes)}</span></div>
                    <div>Free: <span className="font-medium text-foreground">{formatBytes(data.memory.freeBytes)}</span></div>
                    <div>Total: <span className="font-medium text-foreground">{formatBytes(data.memory.totalBytes)}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* System Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Info</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatUptime(data.system.uptimeSeconds)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Server uptime</p>
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    <div>Platform: <span className="font-medium text-foreground">{data.system.platform}/{data.system.arch}</span></div>
                    <div>Hostname: <span className="font-medium text-foreground">{data.system.hostname}</span></div>
                    <div>Last sampled: <span className="font-medium text-foreground">{new Date(data.timestamp).toLocaleTimeString()}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network Interfaces */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Interfaces
                </CardTitle>
                <CardDescription>Active network adapters on the server</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.network.interfaces
                    .filter(iface => iface.addresses.some(a => !a.internal))
                    .map(iface => (
                      <div key={iface.name} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{iface.name}</div>
                        <div className="space-y-1">
                          {iface.addresses.map((addr, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                              <span className="font-mono">{addr.address}</span>
                              <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-xs">{addr.family}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  {data.network.interfaces.filter(i => i.addresses.some(a => !a.internal)).length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">No external network interfaces found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  )
}
