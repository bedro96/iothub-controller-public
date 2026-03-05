"use client"

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square, RotateCcw } from "lucide-react"
import useCsrf from "@/components/hooks/useCsrf"
import { toast } from "vue3-toastify";
type DeviceStatus = 'online' | 'warning' | 'offline' | 'maintenance'

type Device = {
  id: string
  status: DeviceStatus
  temperature: string
  humidity: string
  lastSeen: string
}

/** External device data that can be passed in from the parent. */
export type ExternalDevice = {
  id: string
  status: 'online' | 'warning' | 'offline'
  temperature: number
  humidity: number
  lastUpdate: string
}

type TooltipState = {
  visible: boolean
  /** Viewport-relative X position (left edge of the hovered pixel's centre). */
  x: number
  /** Viewport-relative Y position (top edge of the hovered pixel). */
  y: number
  device: Device | null
}

type Props = {
  totalDevices?: number
  /** When provided the grid uses these devices instead of generating mock data. */
  externalDevices?: ExternalDevice[]
}

function toGridDevice(d: ExternalDevice): Device {
  return {
    id: d.id,
    status: d.status,
    temperature: d.temperature.toFixed(1),
    humidity: String(Math.round(d.humidity)),
    lastSeen: d.lastUpdate,
  }
}

export default function DeviceGrid({ totalDevices = 1000, externalDevices }: Props) {
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<{ message: string; severity: string; time: Date }[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, device: null })
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  /** Timer used to delay hiding the tooltip so the cursor can travel to it. */
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMockMode = !externalDevices || externalDevices.length === 0

  /** Schedule the tooltip to hide after a short delay.
   *  Gives the cursor time to move from the grid onto the tooltip popup. */
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setTooltip(t => ({ ...t, visible: false }))
    }, 200)
  }, [])

  /** Cancel a pending hide – called when the cursor enters the tooltip. */
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  // Clean up the hide timer on unmount.
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isMockMode) {
      // Use external device data
      setDevices(externalDevices!.map(toGridDevice))
      return
    }
    initDevices()
    const interval = setInterval(refreshDevices, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode, externalDevices])

  function getRandomStatus(): DeviceStatus {
    const rand = Math.random()
    if (rand < 0.85) return 'online'
    if (rand < 0.92) return 'warning'
    if (rand < 0.97) return 'offline'
    return 'maintenance'
  }

  function initDevices() {
    const arr: Device[] = []
    for (let i = 0; i < totalDevices; i++) {
      arr.push({
        id: `DEV-${String(i + 1).padStart(4, '0')}`,
        status: getRandomStatus(),
        temperature: (20 + Math.random() * 15).toFixed(1),
        humidity: String(Math.floor(40 + Math.random() * 30)),
        lastSeen: new Date(Date.now() - Math.random() * 300000).toISOString(),
      })
    }
    setDevices(arr)
  }

  function refreshDevices() {
    setDevices(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const updateCount = Math.max(1, Math.floor(totalDevices * 0.05))
      const indices = new Set<number>()
      while (indices.size < updateCount) indices.add(Math.floor(Math.random() * totalDevices))
      indices.forEach(i => {
        const old = copy[i]
        const newStatus = getRandomStatus()
        copy[i] = {
          ...old,
          status: newStatus,
          temperature: (20 + Math.random() * 15).toFixed(1),
          humidity: String(Math.floor(40 + Math.random() * 30)),
          lastSeen: new Date().toISOString(),
        }
        if (old.status !== newStatus) {
          if (newStatus === 'offline') addAlert(`Device ${copy[i].id} went offline`, 'critical')
          if (newStatus === 'warning') addAlert(`Device ${copy[i].id} warning`, 'warning')
        }
      })
      return copy
    })
  }

  function addAlert(message: string, severity: string) {
    setAlerts(prev => [{ message, severity, time: new Date() }, ...prev].slice(0, 10))
  }

  const counts = useMemo(() => {
    const result: Record<DeviceStatus, number> = { online: 0, warning: 0, offline: 0, maintenance: 0 }
    devices.forEach(d => { result[d.status] = (result[d.status] ?? 0) + 1 })
    return result
  }, [devices])

  function showFeedback(msg: string) {
    setCommandFeedback(msg)
    setTimeout(() => setCommandFeedback(null), 2500)
  }

  async function sendCommand(deviceId: string, action: 'device.start' | 'device.stop' | 'device.restart') {
    const { ensureCsrf, fetchWithCsrf } = useCsrf()
    try {
      await ensureCsrf() // Implement this function to get CSRF token if needed
      const res = await fetchWithCsrf(`/api/connectionmanager/commands/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        showFeedback(`${action} sent to ${deviceId}`)
        // toast(`Command sent: ${deviceId}`, { theme:"auto", type: "success", position: "top-right", autoClose: 3000 })
      } else {
        const err = await res.json().catch(() => ({}))
        showFeedback((err as { error?: string }).error ?? `${action} failed`)
        // toast(`Failed to send command: ${deviceId}`, { theme:"auto", type: "error", position: "top-right", autoClose: 3000 })
      }
    } catch {
      showFeedback(`Failed to send ${action}`)
      // toast(`Failed to send command: ${deviceId}`, { theme:"auto", type: "error", position: "top-right", autoClose: 3000 })
    }
  }

  const displayCount = isMockMode ? totalDevices : devices.length

  return (
    <Card>
      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">Device Grid</h3>
          <div className="text-xs text-muted-foreground">
            {displayCount.toLocaleString()} Devices {!isMockMode && <span className="ml-1 text-green-500">(live)</span>}
          </div>
        </div>

        {/* Centered status counts */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-xs">
          <div className="px-2 py-1 rounded bg-green-600 text-white flex items-center gap-2"><span>Online</span><strong>{counts.online}</strong></div>
          <div className="px-2 py-1 rounded bg-yellow-500 text-white flex items-center gap-2"><span>Warning</span><strong>{counts.warning}</strong></div>
          <div className="px-2 py-1 rounded bg-red-600 text-white flex items-center gap-2"><span>Offline</span><strong>{counts.offline}</strong></div>
          <div className="px-2 py-1 rounded bg-gray-500 text-white flex items-center gap-2"><span>Maint</span><strong>{counts.maintenance}</strong></div>
        </div>

        {/* Right-aligned action buttons */}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="default" onClick={() => setShowAlerts(true)}>{`Alerts (${alerts.length})`}</Button>
          <Button size="sm" variant="outline" onClick={() => setAlerts([])}>Clear</Button>
        </div>
      </CardHeader>

      {/* Grid */}
      <CardContent className="p-2">
        <div
          ref={containerRef}
          className="device-grid bg-muted rounded"
          style={{ display: 'grid', gridTemplateColumns: `repeat(50, minmax(0,1fr))`, gap: '2px' }}
          onMouseLeave={scheduleHide}
        >
          {devices.map((d, i) => (
            <div
              key={d.id}
              data-index={i}
              className={`device-pixel rounded-sm cursor-pointer ${
                d.status === 'online' ? 'bg-green-500' :
                d.status === 'warning' ? 'bg-yellow-400 animate-pulse' :
                d.status === 'offline' ? 'bg-red-600' : 'bg-gray-500'
              }`}
              style={{ width: '100%', paddingBottom: '100%', position: 'relative' }}
              onMouseEnter={(e) => {
                cancelHide()
                // Don't reposition the tooltip while it is already visible –
                // this keeps it stable so the user can move the cursor to it
                // and click an action button without the popup jumping away.
                if (tooltip.visible) return
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setTooltip({
                  visible: true,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                  device: d,
                })
              }}
            />
          ))}
        </div>

        {/* Tooltip – uses position:fixed so it is always in the viewport and
            the cursor can travel from the grid onto the popup without the
            popup disappearing when it leaves the grid container. */}
        {tooltip.visible && tooltip.device && (() => {
          const dev = tooltip.device
          return (
            <div
              className="fixed z-40"
              style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              <div className="bg-popover border rounded shadow-md p-2 text-xs min-w-[160px]">
                <div className="font-semibold mb-1 truncate">{dev.id}</div>
                <div className="text-muted-foreground mb-1">
                  Status: <span className="font-medium text-foreground capitalize">{dev.status}</span>
                </div>
                <div className="text-muted-foreground mb-1">Temp: {dev.temperature}°C · RH: {dev.humidity}%</div>
                <div className="text-muted-foreground mb-2 text-[10px]">
                  {new Date(dev.lastSeen).toLocaleString()}
                </div>
                <div className="flex gap-1">
                  <button
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-600 text-white text-[10px] hover:bg-green-700"
                    onClick={() => sendCommand(dev.id, 'device.start')}
                    title="Start"
                  >
                    <Play className="h-2.5 w-2.5" />Start
                  </button>
                  <button
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-700"
                    onClick={() => sendCommand(dev.id, 'device.stop')}
                    title="Stop"
                  >
                    <Square className="h-2.5 w-2.5" />Stop
                  </button>
                  <button
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500 text-white text-[10px] hover:bg-yellow-600"
                    onClick={() => sendCommand(dev.id, 'device.restart')}
                    title="Restart"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />Restart
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>

      {/* Alerts overlay */}
      {showAlerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAlerts(false)} />
          <div className="relative w-full max-w-2xl bg-card p-4 rounded shadow-lg z-10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium">Alerts ({alerts.length})</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAlerts([])}>Clear</Button>
                <Button size="sm" variant="default" onClick={() => setShowAlerts(false)}>Close</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
              {alerts.length === 0 && <div className="text-muted-foreground">No alerts</div>}
              {alerts.map((a, idx) => (
                <div key={idx} className={`p-2 rounded ${a.severity === 'critical' ? 'border-l-4 border-red-600' : a.severity === 'warning' ? 'border-l-4 border-yellow-400' : ''}`}>
                  <div className="flex justify-between">
                    <div>{a.message}</div>
                    <div className="text-muted-foreground text-xs">{a.time.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
