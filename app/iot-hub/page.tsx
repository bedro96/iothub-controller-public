"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminNav } from "@/components/admin-nav"
import { Radio, MessageSquare, Activity, AlertCircle, Thermometer, Droplets, Clock } from "lucide-react"

type LatestMessage = {
  deviceId: string
  status: string | null
  temp: number | null
  humidity: number | null
  createdAt: string
}

type IotHubData = {
  hub: {
    hostname: string | null
    connected: boolean
    error: string | null
    stats: Record<string, unknown>
    registryDeviceCount: number
  }
  telemetry: {
    totalMessages: number
    uniqueDevices: number
    statusCounts: Record<string, number>
    latestMessages: LatestMessage[]
  }
  timestamp: string
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    online: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    offline: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  }
  const color = colorMap[status.toLowerCase()] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status}</span>
  )
}

export default function IoTHubPage() {
  const [data, setData] = useState<IotHubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/iot-hub')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: IotHubData = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch IoT Hub data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="min-h-screen bg-background">
      <AdminNav title="IoT Hub" onRefresh={fetchData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">IoT Hub Overview</h2>
            <p className="text-muted-foreground">
              Azure IoT Hub connectivity, device registry, and D2C telemetry statistics
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
          <div className="p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
                <CardContent><div className="h-8 bg-muted rounded w-3/4" /></CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Hub connection status banner */}
            <div className={`rounded-lg border p-4 mb-6 flex items-center gap-3 ${data.hub.connected ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-red-500 bg-red-50 dark:bg-red-950/30'}`}>
              <div className={`h-3 w-3 rounded-full ${data.hub.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {data.hub.connected ? 'Connected to Azure IoT Hub' : 'IoT Hub connection not configured'}
                </div>
                {data.hub.hostname && (
                  <div className="text-xs text-muted-foreground">{data.hub.hostname}</div>
                )}
                {data.hub.error && (
                  <div className="text-xs text-destructive mt-0.5">{data.hub.error}</div>
                )}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registry Devices</CardTitle>
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.hub.stats.totalDeviceCount !== undefined
                      ? String(data.hub.stats.totalDeviceCount)
                      : data.hub.registryDeviceCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Registered in hub</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">D2C Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.telemetry.totalMessages.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total received (stored)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reporting Devices</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.telemetry.uniqueDevices}</div>
                  <p className="text-xs text-muted-foreground mt-1">Sent telemetry</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Healthy Online Devices</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {data.telemetry.statusCounts['online'] ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Currently online(except warning devices)</p>
                </CardContent>
              </Card>
            </div>

            {/* Status distribution + Hub registry stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Device status distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Status Distribution</CardTitle>
                  <CardDescription>Based on latest telemetry per device</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.telemetry.statusCounts).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No telemetry data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(data.telemetry.statusCounts).map(([status, count]) => {
                        const pct = data.telemetry.uniqueDevices > 0
                          ? Math.round((count / data.telemetry.uniqueDevices) * 100)
                          : 0
                        const barColor =
                          status === 'online' ? 'bg-green-500' :
                          status === 'warning' ? 'bg-yellow-500' :
                          status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
                        return (
                          <div key={status}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize">{status}</span>
                              <span className="font-medium">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hub registry stats */}
              <Card>
                <CardHeader>
                  <CardTitle>IoT Hub Registry Stats</CardTitle>
                  <CardDescription>From Azure IoT Hub REST API</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.hub.stats).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {data.hub.connected
                        ? 'No registry statistics available.'
                        : 'Connect IOT_CONNECTION_STRING to view registry stats.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(data.hub.stats).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Latest D2C messages */}
            <Card>
              <CardHeader>
                <CardTitle>Recent D2C Telemetry</CardTitle>
                <CardDescription>Latest messages received from devices</CardDescription>
              </CardHeader>
              <CardContent>
                {data.telemetry.latestMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages received yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left pb-2 pr-4">Device ID</th>
                          <th className="text-left pb-2 pr-4">Status</th>
                          <th className="text-left pb-2 pr-4">
                            <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />Temp</span>
                          </th>
                          <th className="text-left pb-2 pr-4">
                            <span className="flex items-center gap-1"><Droplets className="h-3 w-3" />Humidity</span>
                          </th>
                          <th className="text-left pb-2">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.telemetry.latestMessages.map((msg, idx) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 pr-4 font-mono text-xs">{msg.deviceId}</td>
                            <td className="py-2 pr-4">
                              {msg.status ? <StatusBadge status={msg.status} /> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2 pr-4">{msg.temp?.toFixed(1) ?? '—'}°C</td>
                            <td className="py-2 pr-4">{msg.humidity?.toFixed(1) ?? '—'}%</td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {new Date(msg.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  )
}
